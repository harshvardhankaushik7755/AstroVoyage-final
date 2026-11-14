/**
 * One of the six gauges down the side of Mission Control.
 *
 * The icon for a gauge never changes. An icon that swaps when a value drops
 * reads as a different gauge appearing, and the player loses track of which
 * row is which — so the *icon* identifies the gauge and the colour, the delta
 * badge and the mark carry the news.
 */
import type { Tone } from "../sim/simulation";

interface Props {
  /** Fixed for the life of the gauge. */
  icon: string;
  name: string;
  value: string;
  /** How full it is, 0 to 1. Leave out for a gauge with no sensible maximum. */
  fraction?: number;
  /** A short "−10%" that appears for a moment when something changes it. */
  delta?: string | null;
  deltaTone?: "up" | "down";
  /** A lasting note, e.g. "dust on the panels", kept for the rest of the trip. */
  mark?: string | null;
  tone?: Tone;
}

function fillClass(tone: Tone | undefined, fraction: number | undefined): string {
  if (tone === "bad") return "bar-fill--bad";
  if (tone === "warn") return "bar-fill--warn";
  if (tone === "good") return "bar-fill--ok";
  if (fraction !== undefined && fraction < 0.2) return "bar-fill--warn";
  return "bar-fill--ok";
}

export default function Gauge({
  icon,
  name,
  value,
  fraction,
  delta = null,
  deltaTone = "down",
  mark = null,
  tone,
}: Props) {
  return (
    <div className="gauge">
      <div className="gauge-head">
        <span className="gauge-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="gauge-name">{name}</span>
        {delta && (
          <span className={`gauge-delta gauge-delta--${deltaTone}`} role="status">
            {delta}
          </span>
        )}
        <span className="gauge-val">{value}</span>
      </div>

      {fraction !== undefined && (
        <div
          className="bar"
          role="progressbar"
          aria-label={`${name}: ${value}`}
          aria-valuenow={Math.round(Math.min(1, Math.max(0, fraction)) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`bar-fill ${fillClass(tone, fraction)}`}
            style={{ width: `${Math.min(100, Math.max(0, fraction * 100))}%` }}
          />
        </div>
      )}

      {mark && <div className="gauge-mark">⚠ {mark}</div>}
    </div>
  );
}
