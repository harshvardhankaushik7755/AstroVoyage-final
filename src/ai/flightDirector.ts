/**
 * The Flight Director: a short explanation of how the mission went and the one
 * thing most worth changing.
 *
 * It is written by rules, not by a model. That is on purpose — the game has no
 * backend and must work with no API key, so the explanation has to be good
 * enough on its own rather than a placeholder for something better. The rules
 * read the same numbers the player watched all flight, so the Director never
 * says anything the gauges did not already show.
 *
 * The words live in src/data/directorLines.json and can be rewritten without
 * touching this file.
 */
import linesJson from "../data/directorLines.json";
import type { Scenario } from "../data/game";
import { findInstruments } from "../data/game";
import type { CheckResult } from "../physics/checks";
import { sunlightFactor } from "../physics/power";
import type { Score } from "../sim/score";
import type { SimState } from "../sim/simulation";
import { remainingDeltaV } from "../sim/simulation";

interface Lines {
  outcome: Record<string, string>;
  praise: Record<string, string>;
  tips: Record<string, string>;
  signOff: Record<string, string>;
}

const lines = linesJson as unknown as Lines;

/** Fill {name} placeholders from a plain object. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

/**
 * What the Director says, as a few short paragraphs: what happened, what went
 * well, and the single most useful thing to change.
 */
export function explainMission(
  sim: SimState | null,
  check: CheckResult,
  score: Score,
  scenario: Scenario,
): string[] {
  const instruments = findInstruments(sim?.design.instrumentIds ?? []);
  const sciencePercent = Math.round(check.scienceShare * 100);
  const sunlightPercent = Math.round(sunlightFactor(scenario.distanceAU) * 100);

  const values: Record<string, string | number> = {
    target: scenario.target,
    targetProse: scenario.targetProse,
    moneyLeft: score.moneyLeft.toFixed(1),
    sciencePercent,
    sunlightPercent: sunlightPercent > 0 ? sunlightPercent : (sunlightFactor(scenario.distanceAU) * 100).toFixed(1),
    fuelLeft: Math.round(sim?.fuelKg ?? 0),
    riskPercent: Math.round((sim?.insertionRisk ?? 0) * 100),
    instrumentCount: instruments.length,
    plural: instruments.length === 1 ? "" : "s",
  };

  const out: string[] = [];

  /* ---------------------------------------------------------- what happened */
  if (!sim) {
    out.push("Nothing has flown yet. Launch the mission and I will tell you how it went.");
    return out;
  }

  const outcomeKey = sim.phase === "orbit" ? "orbit" : sim.phase === "flyby" ? "flyby" : "lost";
  out.push(fill(lines.outcome[outcomeKey], values));
  if (sim.failReason && outcomeKey !== "orbit") out.push(sim.failReason);

  /* --------------------------------------------------------- what went well */
  if (score.starCount === 3) {
    out.push(fill(lines.praise.threeStars, values));
  } else if (score.reached) {
    if (score.stars.fullSuccess) out.push(fill(lines.praise.fullScience, values));
    else if (score.moneyLeft > scenario.budget * 0.25)
      out.push(fill(lines.praise.cheap, values));
    else out.push(fill(lines.praise.survived, values));
  }

  /* ------------------------------------------------- the one thing to change.
     Ordered by how much difference it would actually make, and only the top
     one or two are said — a list of six tips is a list nobody reads. */
  const tips: string[] = [];

  if (sim.phase === "flyby" && remainingDeltaV(sim) < sim.config.insertionDeltaV) {
    tips.push(fill(lines.tips.noFuel, values));
  }
  if (check.scienceShare < 0.5) {
    tips.push(fill(lines.tips.antenna, values));
  }
  if (check.power.value - check.power.limit < check.power.limit * 0.25) {
    tips.push(fill(lines.tips.power, values));
  }
  if (sim.insertionRisk > 0.15) {
    tips.push(fill(lines.tips.risk, values));
  }
  if (sim.phase === "orbit" && sim.fuelKg < sim.startFuelKg * 0.08) {
    tips.push(fill(lines.tips.fuel, values));
  }
  if (instruments.length < 2 && score.moneyLeft > 25) {
    tips.push(fill(lines.tips.instruments, values));
  }
  if (score.moneyLeft < scenario.budget * 0.05 && score.reached) {
    tips.push(fill(lines.tips.budgetTight, values));
  }
  if (
    tips.length === 0 &&
    sim.decisions.length > 0 &&
    sim.decisions.every((decision) => !decision.hurt)
  ) {
    tips.push(fill(lines.tips.safeChoices, values));
  }

  out.push(...tips.slice(0, 2));

  /* ------------------------------------------------------------- sign off */
  const signOff =
    score.starCount === 3 ? "good" : score.reached ? "mixed" : "bad";
  out.push(lines.signOff[signOff]);

  return out;
}
