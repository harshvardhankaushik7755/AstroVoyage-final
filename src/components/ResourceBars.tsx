/**
 * The four live bars, and the five launch checks.
 *
 * All four bars read the same way on purpose: they show how much of what you
 * have is used up, so the rule is always "keep the bar from filling". A bar
 * past the end is the thing stopping the launch.
 */
import type { CheckId, CheckResult } from "../physics/checks";

interface Bar {
  id: string;
  label: string;
  /** 0 to 1 and beyond; over 1 means the design has gone past what it is allowed. */
  fraction: number;
  text: string;
  ok: boolean;
}

function barsFrom(check: CheckResult): Bar[] {
  const { budget, mass, power, fuel } = check;

  return [
    {
      id: "budget",
      label: "Money",
      fraction: budget.limit > 0 ? budget.value / budget.limit : 0,
      text: `$${budget.value.toFixed(1)}M of $${budget.limit}M`,
      ok: budget.ok,
    },
    {
      id: "mass",
      label: "Mass",
      fraction: mass.limit > 0 ? mass.value / mass.limit : 0,
      text: `${mass.value} kg of ${mass.limit} kg`,
      ok: mass.ok,
    },
    {
      id: "power",
      // The check holds available as `value` and needed as `limit`; the bar
      // shows the share of the available power that is being used.
      label: "Power",
      fraction: power.value > 0 ? power.limit / power.value : power.limit > 0 ? 2 : 0,
      text: `${power.limit} W used of ${power.value} W`,
      ok: power.ok,
    },
    {
      id: "fuel",
      label: "Fuel (Δv)",
      fraction: fuel.value > 0 ? fuel.limit / fuel.value : fuel.limit > 0 ? 2 : 0,
      text: `needs ${fuel.limit.toFixed(2)}, has ${fuel.value.toFixed(2)} km/s`,
      ok: fuel.ok,
    },
  ];
}

function toneClass(bar: Bar): string {
  if (!bar.ok) return "bar-fill--bad";
  if (bar.fraction > 0.9) return "bar-fill--warn";
  return "bar-fill--ok";
}

export function ResourceBars({ check }: { check: CheckResult }) {
  const bars = barsFrom(check);

  return (
    <div className="bars">
      {bars.map((bar) => (
        <div className="bar-row" key={bar.id}>
          <span className="bar-label">{bar.label}</span>
          <div
            className="bar"
            role="progressbar"
            aria-label={`${bar.label}: ${bar.text}`}
            aria-valuenow={Math.round(Math.min(1, bar.fraction) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`bar-fill ${toneClass(bar)}`}
              style={{ width: `${Math.min(100, Math.max(0, bar.fraction * 100))}%` }}
            />
          </div>
          <span className="bar-value">{bar.text}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * The five checks, each with a tick or a cross and one sentence. The word
 * "Ready"/"Problem" sits next to the symbol so the answer never depends on
 * telling red from green.
 */
export function Checks({ check, only }: { check: CheckResult; only?: CheckId[] }) {
  // The Launch screen shows just the fuel check, because the route is the only
  // thing it can change. Everything else was settled in the Design Lab.
  const shown = only ? check.checks.filter((item) => only.includes(item.id)) : check.checks;

  return (
    <div className="checks">
      {shown.map((item) => (
        <div className={`check ${item.ok ? "check--ok" : "check--bad"}`} key={item.id}>
          <span className="check-mark" aria-hidden="true">
            {item.ok ? "✅" : "⚠️"}
          </span>
          {item.ok ? (
            /* Passing: one line. The word "Ready" sits next to the tick so the
               answer never depends on telling red from green. */
            <div className="check-line">
              <span className="check-name">{item.label}</span>
              <span className="sr-only">Ready. {item.message}</span>
              <span className="check-short mono">{item.short}</span>
            </div>
          ) : (
            <div>
              <div className="check-name">
                {item.label} <span className="chip chip--bad">Problem</span>
              </div>
              <div className="check-msg">{item.message}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
