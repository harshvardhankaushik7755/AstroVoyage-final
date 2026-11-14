/**
 * How each challenge *looks*: what damage it leaves on the spacecraft, what
 * two-second beat plays before the card, and which part an option would change.
 *
 * This is the one place that maps a challenge id to its presentation, so a new
 * challenge needs one line here rather than a change in four components.
 */
import type { ShipPart } from "../data/game";
import { findEventDef } from "../data/game";
import type { Damage } from "../components/Spacecraft";

/** The short cutscene that plays over the map before a card opens. */
export type Beat =
  | "dust" // a haze drifts across
  | "rock" // something tumbles past
  | "dish" // the signal line breaks up
  | "flare" // particles stream from the Sun
  | "blink" // a light on the spacecraft stutters
  | "light" // sunlight leans on the panels
  | "chance" // something worth looking at drifts by
  | "alert"; // a plain warning, for everything else

/** What a challenge leaves behind on the drawing of the spacecraft. */
const DAMAGE: Record<string, Damage> = {
  dust: "dust",
  micrometeoroid: "hole",
  debris: "hole",
  debrisDamage: "hole",
  instrumentFault: "dark",
  safeMode: "dark",
  solarStorm: "dark",
  radiationBelt: "dark",
  softwareBug: "dark",
  lostSignal: "turned",
  groundStationBusy: "turned",
};

/** The beat that plays before each card. */
const BEATS: Record<string, Beat> = {
  dust: "dust",
  debris: "rock",
  debrisDamage: "rock",
  micrometeoroid: "rock",
  lostSignal: "dish",
  groundStationBusy: "dish",
  solarStorm: "flare",
  radiationBelt: "flare",
  safeMode: "blink",
  softwareBug: "blink",
  instrumentFault: "blink",
  sunPush: "light",
  gravityAssist: "chance",
  bonusTarget: "chance",
  extraData: "chance",
};

export function damageFor(defId: string): Damage {
  return DAMAGE[defId] ?? null;
}

export function beatFor(defId: string): Beat {
  return BEATS[defId] ?? "alert";
}

/**
 * The part a given option would change — what gets the ring when the player
 * hovers it.
 *
 * It is deliberately *not* the same as the part the challenge happened to. A
 * lost signal happens to the antenna, but "wait for Earth to call again"
 * changes nothing on the spacecraft, while "switch to the large dish" changes
 * the antenna. Showing the ring only where something really changes stops it
 * becoming decoration.
 */
export function optionPart(defId: string, optionId: string): ShipPart | null {
  const def = findEventDef(defId);
  if (!def) return null;
  const option = def.options.find((candidate) => candidate.id === optionId);
  if (!option) return null;

  const effect = option.effect;

  if (effect.powerPenalty) return "power";
  if (effect.signalPenalty) return "antenna";
  if (effect.sciencePenalty || effect.scienceBonus) return "instruments";
  if (effect.fuelCost || effect.fuelSaved || effect.clearInsertionRisk) return "engine";
  if (effect.riskOfFailure) return def.affectsPart ?? "body";

  // "Wait and see" changes nothing, so nothing is ringed.
  return null;
}

/** A plain-English name for the beat, for anyone who cannot see it. */
export function beatLabel(beat: Beat): string {
  switch (beat) {
    case "dust":
      return "Dust drifts across the spacecraft.";
    case "rock":
      return "Something tumbles past the spacecraft.";
    case "dish":
      return "The signal to Earth breaks up.";
    case "flare":
      return "Particles stream out from the Sun.";
    case "blink":
      return "A light on the spacecraft stutters.";
    case "light":
      return "Sunlight leans on the solar panels.";
    case "chance":
      return "Something worth looking at drifts into view.";
    case "alert":
      return "A warning arrives from the spacecraft.";
  }
}
