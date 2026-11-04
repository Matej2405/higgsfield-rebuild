import type { Aspect, Kind } from "./catalog";

// A preset is direction the visitor doesn't have to write: it is appended to their
// prompt, and the exact text sent to the model is shown with every result.

export type CameraMove = "push-in" | "orbit" | "crane-up" | "fly-through" | "handheld" | "turntable" | "timelapse";

export type Preset = {
  id: string;
  kind: Kind;
  name: string;
  summary: string;
  direction: string;
  placeholder: string;
  aspect?: Aspect;
  move?: CameraMove;
};

export const PRESETS: Preset[] = [
  {
    id: "push-in",
    kind: "video",
    name: "Push in",
    summary: "Slow move toward the subject",
    direction: "Camera: a slow, steady dolly push-in toward the subject; the background gently compresses; smooth, cinematic motion.",
    placeholder: "A lighthouse keeper looking out over a stormy sea",
    move: "push-in",
  },
  {
    id: "orbit",
    kind: "video",
    name: "Orbit",
    summary: "Arc around the subject",
    direction: "Camera: a smooth 180-degree orbit around the subject at eye level, keeping it centred in frame.",
    placeholder: "A vintage motorcycle parked in a neon-lit alley",
    move: "orbit",
  },
  {
    id: "crane-up",
    kind: "video",
    name: "Crane up",
    summary: "Rise and reveal the scene",
    direction: "Camera: cranes up and back from close on the subject to reveal the wider scene around it.",
    placeholder: "A lone tent on a snowy ridge at dawn",
    move: "crane-up",
  },
  {
    id: "fly-through",
    kind: "video",
    name: "Fly-through",
    summary: "Fast FPV drone flight",
    direction: "Camera: fast FPV drone flight through the scene with dynamic banking turns and a sense of speed.",
    placeholder: "A canyon river with towering red rock walls",
    move: "fly-through",
  },
  {
    id: "handheld",
    kind: "video",
    name: "Handheld",
    summary: "Documentary, follows the action",
    direction: "Camera: handheld documentary style with subtle natural shake, following the action closely.",
    placeholder: "A street food cook flipping noodles in a busy market",
    move: "handheld",
  },
  {
    id: "turntable",
    kind: "video",
    name: "Turntable",
    summary: "Product spins in the studio",
    direction: "The subject rotates slowly on a turntable; clean studio backdrop; soft key light with a crisp rim light; locked-off camera.",
    placeholder: "A matte black wireless headphone",
    aspect: "1:1",
    move: "turntable",
  },
  {
    id: "timelapse",
    kind: "video",
    name: "Timelapse",
    summary: "Time races, camera stays",
    direction: "Timelapse: clouds, light and people move rapidly while the camera stays locked off.",
    placeholder: "A city intersection from a rooftop, day turning to night",
    move: "timelapse",
  },
  {
    id: "film-still",
    kind: "image",
    name: "Film still",
    summary: "Anamorphic, motivated light",
    direction: "Style: cinematic film still, anamorphic lens, motivated practical lighting, subtle grain, rich contrast.",
    placeholder: "A detective under a flickering streetlight in the rain",
  },
  {
    id: "product",
    kind: "image",
    name: "Product shot",
    summary: "Studio light, seamless backdrop",
    direction: "Style: studio product photography, large softbox key light, seamless backdrop, crisp detail, subtle reflection.",
    placeholder: "A ceramic coffee cup with steam rising",
    aspect: "1:1",
  },
  {
    id: "portrait",
    kind: "image",
    name: "Editorial portrait",
    summary: "Window light, 85mm",
    direction: "Style: editorial portrait, soft natural window light, 85mm lens, shallow depth of field, true-to-life skin.",
    placeholder: "A jazz pianist in her sixties, smiling, in a dim club",
    aspect: "9:16",
  },
  {
    id: "anime",
    kind: "image",
    name: "Anime cel",
    summary: "Clean lines, flat color",
    direction: "Style: anime cel-shaded illustration, clean line art, vivid flat colors, expressive lighting.",
    placeholder: "A girl on a bicycle racing a train along the coast",
  },
  {
    id: "35mm",
    kind: "image",
    name: "35mm film",
    summary: "Warm grain, soft halation",
    direction: "Style: shot on 35mm film, warm Portra-like colors, soft halation on highlights, natural grain.",
    placeholder: "Friends laughing around a campfire at dusk",
  },
  {
    id: "3d-render",
    kind: "image",
    name: "3D render",
    summary: "Soft clay, global light",
    direction: "Style: stylized 3D render, soft global illumination, clay-like materials, gentle pastel palette.",
    placeholder: "A tiny island with a lighthouse and a sleeping whale",
  },
];

export function presetById(id: string | null | undefined) {
  return PRESETS.find((p) => p.id === id) ?? null;
}

export function buildPrompt(prompt: string, preset: Preset | null) {
  const subject = prompt.trim();
  return preset ? `${subject}. ${preset.direction}` : subject;
}
