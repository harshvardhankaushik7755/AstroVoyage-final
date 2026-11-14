/**
 * The three facts that say how hard a mission is, worked out from the physics
 * so the mission cards never claim anything the engine does not do.
 *
 *   Sunlight      — how much power solar panels will make out there
 *   Signal delay  — how long a message takes each way
 *   Launch window — how often you get a chance to go
 */
import type { Scenario } from "../data/game";
import { sunlightFactor } from "./power";
import { formatDelay, missionDelayMinutes } from "./comms";
import { openWindows } from "./windows";

/** How hard this fact makes the mission. Drives the colour of the chip. */
export type Tone = "easy" | "medium" | "hard";

export interface MissionFact {
  id: "sunlight" | "delay" | "window";
  label: string;
  value: string;
  tone: Tone;
  /** One sentence a 12-year-old can read, explaining why it matters. */
  why: string;
}

export function sunlightFact(scenario: Scenario): MissionFact {
  const share = sunlightFactor(scenario.distanceAU);
  const percent = share >= 0.1 ? Math.round(share * 100) : Math.round(share * 1000) / 10;
  const tone: Tone = share > 0.8 ? "easy" : share > 0.2 ? "medium" : "hard";
  return {
    id: "sunlight",
    label: "Sunlight",
    value: `${percent}% of Earth's`,
    tone,
    why:
      tone === "hard"
        ? "Solar panels barely work out here. A nuclear battery may be the only choice."
        : tone === "medium"
          ? "Solar panels still work, but they make less power than at Earth."
          : "Sunlight is strong, so small solar panels are enough.",
  };
}

export function delayFact(scenario: Scenario): MissionFact {
  const minutes = missionDelayMinutes(scenario);
  const tone: Tone = minutes < 1 ? "easy" : minutes < 20 ? "medium" : "hard";
  return {
    id: "delay",
    label: "Signal delay",
    value: formatDelay(minutes),
    tone,
    why:
      tone === "easy"
        ? "Almost instant. You can react to anything that happens."
        : `A message takes ${formatDelay(minutes)} each way, so the spacecraft has to look after itself.`,
  };
}

export function windowFact(scenario: Scenario): MissionFact {
  if (scenario.windowMonths <= 0) {
    return {
      id: "window",
      label: "Launch window",
      value: "Any month",
      tone: "easy",
      why: "The Moon goes round Earth every month, so there is nothing to wait for.",
    };
  }
  const chances = openWindows(scenario).length;
  const tone: Tone = chances >= 2 ? "medium" : "hard";
  return {
    id: "window",
    label: "Launch window",
    value: `Every ${scenario.windowMonths} months`,
    tone,
    why: `${scenario.target} only lines up with Earth every ${scenario.windowMonths} months. Miss it and you wait.`,
  };
}

/** All three facts, in the order the mission card shows them. */
export function missionFacts(scenario: Scenario): MissionFact[] {
  return [sunlightFact(scenario), delayFact(scenario), windowFact(scenario)];
}
