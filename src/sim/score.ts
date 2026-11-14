/**
 * Scoring.
 *
 *     score = science that got home × did it arrive? + money left over
 *
 * Three stars, each a separate question so a player can tell exactly what they
 * missed: did it reach the target, did it do nearly all the science it set out
 * to do, and was there money left over.
 *
 * Money counts because a mission that cost half as much for the same science is
 * a better mission — which is the whole point of the Mangalyaan scenario.
 */
import type { CheckResult } from "../physics/checks";
import type { Decision, SimState } from "./simulation";

export interface Score {
  /** False when the results screen was opened without flying. */
  flown: boolean;
  reached: boolean;
  science: number;
  scienceMax: number;
  /** 1 when the spacecraft made it into orbit, 0 otherwise. */
  successFraction: number;
  moneyLeft: number;
  score: number;
  stars: { reached: boolean; fullSuccess: boolean; underBudget: boolean };
  starCount: number;
}

export function scoreMission(sim: SimState | null, check: CheckResult): Score {
  const flown = sim !== null;
  // Without a flight, a design that passes every check counts as ready to go,
  // so the screen still says something sensible.
  const reached = flown ? sim.phase === "orbit" : check.allOk;

  const scienceMax = check.science;
  const science = flown ? sim.scienceCollected : check.allOk ? check.scienceHome : 0;
  const successFraction = reached ? 1 : 0;
  const moneyLeft = Math.max(0, check.budget.limit - check.budget.value);

  const stars = {
    reached,
    fullSuccess: reached && scienceMax > 0 && science >= 0.9 * scienceMax,
    underBudget: check.budget.ok && moneyLeft > 0,
  };

  return {
    flown,
    reached,
    science,
    scienceMax,
    successFraction,
    moneyLeft,
    score: Math.round(science * successFraction + moneyLeft),
    stars,
    starCount: Object.values(stars).filter(Boolean).length,
  };
}

/** ✅ when the decision cost nothing lasting, ⚠️ when it cost or risked something. */
export function decisionVerdict(decision: Decision): "ok" | "warn" {
  return decision.hurt ? "warn" : "ok";
}

/** A one-line headline for the top of the results screen. */
export function scoreHeadline(score: Score, sim: SimState | null): string {
  if (!score.flown) return "Design ready to fly.";
  if (score.reached) {
    if (score.starCount === 3) return "A textbook mission.";
    if (score.stars.fullSuccess) return "In orbit, with the science safely home.";
    return "You made it into orbit.";
  }
  if (sim?.phase === "flyby") return "So close — the spacecraft flew past.";
  return "The spacecraft was lost.";
}
