#!/usr/bin/env node
// Captures every prompt and the final response of every turn into
// .agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md, in the 8x assignment log format.
//
// Wired in .claude/settings.json to four Claude Code hook events:
//   SessionStart, PostModelSwitch  remember the active model (no other event carries it)
//   UserPromptSubmit               append the prompt, verbatim (`prompt`)
//   Stop                           append the final response (`last_assistant_message`)
//
// Prints nothing on stdout: for UserPromptSubmit, SessionStart and PostModelSwitch,
// Claude Code injects stdout into the model's context. Failures go to stderr with
// exit 1, which Claude Code reports as a non-blocking hook error.
//
// If the hooks are installed partway through a session, the first captured event of
// that session imports the earlier exchanges from the session transcript, and the log
// header says how many entries were imported that way.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const AUTHOR = "Matej2405";
const PROJECT = "higgsfield-rebuild";
const TOOL = "claude-code";
const FIELDS = ["session_id", "date", "author", "model", "tool", "project", "total_exchanges", "first_prompt_time", "last_prompt_time"];

let input;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
  main();
} catch (err) {
  process.stderr.write(`agent-capture: ${err.stack ?? err}\n`);
  process.exit(1);
}

function main() {
  switch (input.hook_event_name) {
    case "SessionStart":
      if (input.model) saveModelHint(input.model);
      break;
    case "PostModelSwitch":
      saveModelHint(input.to_model);
      break;
    case "UserPromptSubmit":
      capture("prompt", { type: "PROMPT", timestamp: now(), model: currentModel(), text: input.prompt });
      break;
    case "Stop":
      capture("stop", { type: "RESPONSE", timestamp: now(), model: currentModel(), text: input.last_assistant_message ?? transcriptResponse() });
      break;
  }
}

function capture(mode, entry) {
  const dir = path.join(process.env.CLAUDE_PROJECT_DIR || input.cwd, ".agent-logs");
  fs.mkdirSync(dir, { recursive: true });
  const existing = fs.readdirSync(dir).find((name) => name.endsWith(`_${input.session_id}.md`));
  const imported = existing ? [] : importFromTranscript(mode);
  const entries = [...imported, entry];
  const file = path.join(dir, existing ?? `${fileStamp(entries[0].timestamp)}_${input.session_id}.md`);
  const text = existing ? fs.readFileSync(file, "utf8") : newLog(entries[0].timestamp, imported.length);
  writeAtomic(file, appendEntries(text, entries));
}

function newLog(timestamp, importedCount) {
  const meta = {
    session_id: input.session_id,
    date: timestamp.slice(0, 10),
    author: AUTHOR,
    model: "unknown",
    tool: TOOL,
    project: PROJECT,
    total_exchanges: "0",
    first_prompt_time: "",
    last_prompt_time: "",
  };
  const note = importedCount
    ? `\n> The first ${importedCount} entries were imported from the Claude Code session transcript because they predate the capture hooks. Every entry after them was captured live.\n`
    : "";
  return `${frontmatter(meta)}\n# Session Log - ${meta.date}\n\nSession: \`${shortId()}\` | Project: \`${PROJECT}\` | Author: \`${AUTHOR}\`\n${note}\n---\n\n`;
}

function appendEntries(text, entries) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = Object.fromEntries(
    match[1].split("\n").map((line) => {
      const i = line.indexOf(":");
      return [line.slice(0, i), line.slice(i + 1).trim()];
    }),
  );
  const models = meta.model.split(", ").filter((m) => m && m !== "unknown");
  let num = Number(meta.total_exchanges) || 0;
  let body = text.slice(match[0].length);

  for (const e of entries) {
    if (e.type === "PROMPT") {
      num += 1;
      meta.first_prompt_time ||= e.timestamp;
      meta.last_prompt_time = e.timestamp;
    }
    if (e.model !== "unknown" && !models.includes(e.model)) models.push(e.model);
    body += `[LOG_ENTRY type=${e.type} num=${num} session=${shortId()}]\ntimestamp: ${e.timestamp}\nmodel: ${e.model}\n\n${e.text}\n\n\n`;
  }

  meta.total_exchanges = String(num);
  meta.model = models.join(", ") || "unknown";
  return frontmatter(meta) + body;
}

function frontmatter(meta) {
  return `---\n${FIELDS.map((key) => `${key}: ${meta[key] ?? ""}`).join("\n")}\n---\n`;
}

// --- Transcript import (only when a session's log file doesn't exist yet) ---

// Exchanges already in the transcript, minus whatever the live hook is about to write:
// on a prompt, the current prompt; on a stop, the current turn's response.
function importFromTranscript(mode) {
  const exchanges = readExchanges();
  const last = exchanges.at(-1);
  const current = input.prompt_id
    ? exchanges.find((ex) => ex.promptId === input.prompt_id)
    : mode === "stop" || last?.prompt === input.prompt
      ? last
      : undefined;

  const entries = [];
  for (const ex of exchanges) {
    if (ex === current && mode === "prompt") continue;
    entries.push({ type: "PROMPT", timestamp: ex.timestamp, model: ex.model, text: ex.prompt });
    if (ex.response && ex !== current) entries.push(ex.response);
  }
  return entries;
}

// Pairs each prompt the user typed with the text of the turn's final assistant message
// (the one that didn't stop to call a tool). Interrupted turns have no final message,
// matching the live Stop hook, which doesn't fire on interrupt.
function readExchanges() {
  const exchanges = [];
  for (const entry of readTranscript()) {
    if (entry.isSidechain || entry.isMeta) continue;
    const content = entry.message?.content;

    if (entry.type === "user" && entry.origin?.kind === "human" && !hasToolResult(content)) {
      exchanges.push({ promptId: entry.promptId, timestamp: entry.timestamp, model: "unknown", prompt: renderPrompt(content), response: null });
      continue;
    }

    const ex = exchanges.at(-1);
    const msg = entry.message;
    if (entry.type !== "assistant" || !ex || !msg?.model || msg.model === "<synthetic>") continue;
    if (ex.model === "unknown") ex.model = msg.model;
    if (!msg.stop_reason || msg.stop_reason === "tool_use") continue;

    // One API message is written as several transcript lines (thinking, text, ...).
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("\n\n");
    if (ex.responseId !== msg.id) {
      ex.responseId = msg.id;
      ex.response = { type: "RESPONSE", timestamp: entry.timestamp, model: msg.model, text };
    } else if (text) {
      ex.response.text = ex.response.text ? `${ex.response.text}\n\n${text}` : text;
      ex.response.timestamp = entry.timestamp;
    }
  }
  return exchanges;
}

function hasToolResult(content) {
  return Array.isArray(content) && content.some((b) => b.type === "tool_result");
}

function renderPrompt(content) {
  if (typeof content === "string") return content;
  let images = 0;
  return content
    .map((b) => (b.type === "text" ? b.text : b.type === "image" ? `[Image #${++images}]` : `[${b.type}]`))
    .join("\n\n");
}

// Fallback for Claude Code versions whose Stop input lacks last_assistant_message.
function transcriptResponse() {
  const exchanges = readExchanges();
  const ex = exchanges.find((e) => e.promptId === input.prompt_id) ?? exchanges.at(-1);
  return ex?.response?.text ?? "";
}

// --- Model resolution ---

// The newest evidence wins: a SessionStart/PostModelSwitch hint, or the model on the
// latest assistant message in the transcript.
function currentModel() {
  const hint = readModelHint();
  const last = lastAssistantEntry();
  if (hint && (!last || hint.at > last.timestamp)) return hint.model;
  return last?.message.model ?? "unknown";
}

function lastAssistantEntry() {
  const lines = readTranscriptLines();
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].includes('"type":"assistant"')) continue;
    const entry = parseLine(lines[i]);
    if (entry?.type === "assistant" && !entry.isSidechain && entry.message?.model && entry.message.model !== "<synthetic>") return entry;
  }
  return null;
}

function modelHintPath() {
  return path.join(os.tmpdir(), "8x-agent-capture", `${input.session_id}.json`);
}

function saveModelHint(model) {
  fs.mkdirSync(path.dirname(modelHintPath()), { recursive: true });
  fs.writeFileSync(modelHintPath(), JSON.stringify({ model, at: now() }));
}

function readModelHint() {
  try {
    return JSON.parse(fs.readFileSync(modelHintPath(), "utf8"));
  } catch {
    return null;
  }
}

// --- Helpers ---

function readTranscriptLines() {
  const file = input.transcript_path?.replace(/^~(?=\/)/, os.homedir());
  if (!file || !fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
}

function readTranscript() {
  return readTranscriptLines().map(parseLine).filter(Boolean);
}

function parseLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function writeAtomic(file, data) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.tmp`);
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
}

function now() {
  return new Date().toISOString();
}

function fileStamp(timestamp) {
  return timestamp.slice(0, 19).replace("T", "_").replaceAll(":", "-");
}

function shortId() {
  return input.session_id.slice(0, 8);
}
