/**
 * Launch → Cruise → Arrival → In orbit.
 *
 * Four words that say where the mission is without reading the log.
 */
import type { Phase } from "../sim/simulation";

const STEPS = ["Launch", "Cruise", "Arrival", "In orbit"] as const;

/** Which step the mission has reached, 0 to 3. */
export function stepFor(phase: Phase, progress: number): number {
  switch (phase) {
    case "cruise":
      return progress > 0.02 ? 1 : 0;
    case "insertion":
      return 2;
    case "orbit":
      return 3;
    /* A lost or flown-past mission stopped at the arrival; it never got further. */
    case "flyby":
    case "lost":
      return 2;
  }
}

export default function Timeline({ phase, progress }: { phase: Phase; progress: number }) {
  const now = stepFor(phase, progress);
  const failed = phase === "flyby" || phase === "lost";

  return (
    <div className="timeline" role="group" aria-label="Where the mission is">
      {STEPS.map((label, index) => {
        const done = index < now;
        const here = index === now;
        const state = done ? "done" : here ? "now" : "todo";
        return (
          <span key={label} style={{ display: "flex", alignItems: "center" }}>
            {index > 0 && <span className="tl-line" aria-hidden="true" />}
            <span className={`tl-step tl-step--${state}`}>
              <span className="tl-dot" aria-hidden="true" />
              {label}
              {here && failed && <span className="sr-only"> — the mission ended here</span>}
            </span>
          </span>
        );
      })}
    </div>
  );
}
