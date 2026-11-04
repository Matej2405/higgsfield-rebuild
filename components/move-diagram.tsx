import { useId } from "react";
import type { CameraMove } from "@/lib/presets";

// Top-down shot diagrams, the way a director sketches a camera move: the ink dot is
// the subject, the red line is the camera's path.
const PATHS: Record<CameraMove, { subject: [number, number]; path: string; extra?: string }> = {
  "push-in": { subject: [52, 20], path: "M8 20 H40" },
  orbit: { subject: [36, 20], path: "M20 26 A16 10 0 1 1 52 26" },
  "crane-up": { subject: [22, 30], path: "M14 30 C16 14 30 8 50 8" },
  "fly-through": { subject: [56, 20], path: "M6 28 C16 6 26 34 36 14 S46 18 50 20" },
  handheld: { subject: [50, 20], path: "M8 22 L13 18 L18 23 L23 18 L28 22 L33 18 L38 21" },
  turntable: { subject: [36, 16], path: "M22 30 A14 5 0 1 0 50 30", extra: "M22 30 A14 5 0 0 1 50 30" },
  timelapse: { subject: [36, 24], path: "M14 28 A22 18 0 0 1 58 28", extra: "M30 34 H42" },
};

export function MoveDiagram({ move, className }: { move: CameraMove; className?: string }) {
  const marker = useId();
  const { subject, path, extra } = PATHS[move];
  return (
    <svg viewBox="0 0 64 40" className={className} aria-hidden="true">
      <defs>
        <marker id={marker} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0 L6 3 L0 6 z" fill="var(--color-tally)" />
        </marker>
      </defs>
      {extra && <path d={extra} fill="none" stroke="var(--color-line)" strokeWidth="1.5" strokeDasharray="2 3" />}
      <path d={path} fill="none" stroke="var(--color-tally)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#${marker})`} />
      <circle cx={subject[0]} cy={subject[1]} r="4.5" fill="var(--color-ink)" />
    </svg>
  );
}
