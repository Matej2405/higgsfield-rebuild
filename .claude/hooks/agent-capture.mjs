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
// The first PROMPT of a new session can log `model: unknown`: in Claude Code 2.1.30x
// SessionStart arrives without `model` and the transcript doesn't exist yet when the
// first UserPromptSubmit fires. Entries are never rewritten to fill it in later.

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
      capture({ type: "PROMPT", timestamp: now(), model: currentModel(), text: input.prompt });
      break;
    case "Stop":
      capture({ type: "RESPONSE", timestamp: now(), model: currentModel(), text: input.last_assistant_message ?? "" });
      break;
  }
}

function capture(entry) {
  const dir = path.join(process.env.CLAUDE_PROJECT_DIR || input.cwd, ".agent-logs");
  fs.mkdirSync(dir, { recursive: true });
  const existing = fs.readdirSync(dir).find((name) => name.endsWith(`_${input.session_id}.md`));
  const file = path.join(dir, existing ?? `${fileStamp(entry.timestamp)}_${input.session_id}.md`);
  const text = existing ? fs.readFileSync(file, "utf8") : newLog(entry.timestamp);
  writeAtomic(file, appendEntry(text, entry));
}

function newLog(timestamp) {
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
  return `${frontmatter(meta)}\n# Session Log - ${meta.date}\n\nSession: \`${shortId()}\` | Project: \`${PROJECT}\` | Author: \`${AUTHOR}\`\n\n---\n\n`;
}

function appendEntry(text, entry) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  const meta = Object.fromEntries(
    match[1].split("\n").map((line) => {
      const i = line.indexOf(":");
      return [line.slice(0, i), line.slice(i + 1).trim()];
    }),
  );
  const models = meta.model.split(", ").filter((m) => m && m !== "unknown");
  let num = Number(meta.total_exchanges) || 0;

  if (entry.type === "PROMPT") {
    num += 1;
    meta.first_prompt_time ||= entry.timestamp;
    meta.last_prompt_time = entry.timestamp;
  }
  if (entry.model !== "unknown" && !models.includes(entry.model)) models.push(entry.model);

  meta.total_exchanges = String(num);
  meta.model = models.join(", ") || "unknown";
  const body = `[LOG_ENTRY type=${entry.type} num=${num} session=${shortId()}]\ntimestamp: ${entry.timestamp}\nmodel: ${entry.model}\n\n${entry.text}\n\n\n`;
  return frontmatter(meta) + text.slice(match[0].length) + body;
}

function frontmatter(meta) {
  return `---\n${FIELDS.map((key) => `${key}: ${meta[key] ?? ""}`).join("\n")}\n---\n`;
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
  const file = input.transcript_path?.replace(/^~(?=\/)/, os.homedir());
  if (!file || !fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, "utf8").split("\n");
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
