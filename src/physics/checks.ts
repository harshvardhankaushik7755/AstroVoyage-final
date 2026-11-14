/**
 * The launch checks. Five questions asked of a design before it is allowed to
 * fly, each with an answer in plain English.
 *
 *   Money   — does it cost less than the budget?
 *   Mass    — can the rocket lift it?
 *   Power   — will it still have power at the target?
 *   Fuel    — is there enough Δv for the trip and the braking burn?
 *   Signal  — will enough of the science reach Earth to be worth flying?
 *
 * Everything here is pure arithmetic over the data files, so a screen only has
 * to render the answer.
 */
import type { Design, Route, Scenario } from "../data/game";
import {
  findAntenna,
  findBody,
  findEngine,
  findInstruments,
  findPower,
  findRocket,
  parts,
  settings,
} from "../data/game";
import { designDeltaV, wetMass } from "./rocketEquation";
import { designScienceShare } from "./comms";
import { powerAtTarget, powerNeeded } from "./power";
import { requiredDeltaV } from "./windows";

export type CheckId = "budget" | "mass" | "power" | "fuel" | "comms";

export interface Check {
  id: CheckId;
  /** What the player sees as the name of the check. */
  label: string;
  ok: boolean;
  /** What the design uses. */
  value: number;
  /** What it is allowed to use (or, for power and fuel, the least it must have). */
  limit: number;
  unit: string;
  /** One short sentence saying what is wrong, or that it is fine. */
  message: string;
  /**
   * The same news in a few words, for a check that passed. A passing check
   * does not need a sentence, and five sentences in a narrow column wrap into
   * a wall of text that nobody reads.
   */
  short: string;
}

export interface CheckResult {
  budget: Check;
  mass: Check;
  power: Check;
  fuel: Check;
  comms: Check;
  /** All five, in the order the Design Lab shows them. */
  checks: Check[];
  allOk: boolean;
  /** Science points the instruments can collect. */
  science: number;
  /** Share of that science which reaches Earth, 0 to 1. */
  scienceShare: number;
  /** Science points that actually get home. */
  scienceHome: number;
}

/** What the design costs in $M, fuel included. */
export function totalCost(design: Design): number {
  const body = findBody(design.bodyId);
  const power = findPower(design.powerId);
  const antenna = findAntenna(design.antennaId);
  const engine = findEngine(design.engineId);
  const rocket = findRocket(design.rocketId);
  const instruments = findInstruments(design.instrumentIds);

  const partsCost =
    (body?.cost ?? 0) +
    (power?.cost ?? 0) +
    (antenna?.cost ?? 0) +
    (engine?.cost ?? 0) +
    (rocket?.cost ?? 0) +
    instruments.reduce((total, instrument) => total + instrument.cost, 0);

  const fuelCost = Math.max(0, design.fuelKg) * parts.fuelPricePerKg;
  return Math.round((partsCost + fuelCost) * 10) / 10;
}

/** Science points the chosen instruments are worth. */
export function totalScience(design: Design): number {
  return findInstruments(design.instrumentIds).reduce((total, i) => total + i.science, 0);
}

/**
 * The Δv the spacecraft's own engine has to find, in km/s.
 *
 * The trip needs a certain Δv in total, but the rocket does most of the work
 * getting off Earth — which is how real missions are flown. What is left over
 * is the course corrections and the braking burn at the far end, and that is
 * what the fuel on board has to cover. A bigger rocket therefore means less
 * fuel needed, which is a real trade worth money.
 */
export function spacecraftDeltaVNeeded(design: Design, scenario: Scenario, route: Route): number {
  const rocket = findRocket(design.rocketId);
  const fromRocket = rocket?.deltaVProvided ?? 0;
  return Math.max(0, requiredDeltaV(scenario, route) - fromRocket);
}

/** Run all five checks. */
export function runChecks(design: Design, scenario: Scenario, route: Route): CheckResult {
  const rocket = findRocket(design.rocketId);
  const body = findBody(design.bodyId);

  /* ---- money */
  const cost = totalCost(design);
  const budget: Check = {
    id: "budget",
    label: "Money",
    ok: cost <= scenario.budget,
    value: cost,
    limit: scenario.budget,
    unit: "$M",
    message:
      cost <= scenario.budget
        ? `$${(scenario.budget - cost).toFixed(1)}M left over.`
        : `Over budget by $${(cost - scenario.budget).toFixed(1)}M. Choose cheaper parts or less fuel.`,
    short: `$${Math.max(0, scenario.budget - cost).toFixed(1)}M left`,
  };

  /* ---- mass */
  const launchMass = wetMass(design);
  const capacity = rocket?.capacity ?? 0;
  const mass: Check = {
    id: "mass",
    label: "Mass",
    ok: launchMass <= capacity,
    value: Math.round(launchMass),
    limit: capacity,
    unit: "kg",
    message:
      launchMass <= capacity
        ? `The ${rocket?.name ?? "rocket"} can lift this, with ${Math.round(capacity - launchMass)} kg spare.`
        : `Too heavy by ${Math.round(launchMass - capacity)} kg. Pick a bigger rocket or carry less.`,
    short: `${Math.round(Math.max(0, capacity - launchMass))} kg spare`,
  };

  /* ---- power */
  const available = powerAtTarget(design, scenario.distanceAU);
  const needed = powerNeeded(design);
  const power: Check = {
    id: "power",
    label: "Power",
    ok: available >= needed,
    value: Math.round(available),
    limit: Math.round(needed),
    unit: "W",
    message:
      available >= needed
        ? `${Math.round(available)} W at ${scenario.target}, and ${Math.round(available - needed)} W spare.`
        : `Only ${Math.round(available)} W at ${scenario.target}, but ${Math.round(needed)} W is needed. Sunlight is weaker out there.`,
    short: `${Math.round(Math.max(0, available - needed))} W spare`,
  };

  /* ---- fuel */
  const have = designDeltaV(design);
  const need = spacecraftDeltaVNeeded(design, scenario, route);
  const wanted = need * settings.fuelMargin;
  const fuel: Check = {
    id: "fuel",
    label: "Fuel (Δv)",
    ok: have >= wanted,
    value: Math.round(have * 100) / 100,
    limit: Math.round(wanted * 100) / 100,
    unit: "km/s",
    message:
      have >= wanted
        ? `${have.toFixed(2)} km/s of Δv — enough for the trip and the braking burn.`
        : have >= need
          ? `${have.toFixed(2)} km/s is just barely enough. Add fuel for a safety margin.`
          : `Only ${have.toFixed(2)} km/s of Δv, and ${need.toFixed(2)} km/s is needed. Add fuel, or use a lighter spacecraft.`,
    short: `${have.toFixed(2)} km/s, needs ${wanted.toFixed(2)}`,
  };

  /* ---- signal */
  const share = designScienceShare(design.antennaId, scenario);
  const science = totalScience(design);
  const comms: Check = {
    id: "comms",
    label: "Signal",
    ok: share >= settings.minScienceHome,
    value: Math.round(share * 100),
    limit: Math.round(settings.minScienceHome * 100),
    unit: "%",
    message:
      share >= settings.minScienceHome
        ? `${Math.round(share * 100)}% of the science gets back to Earth.`
        : `Only ${Math.round(share * 100)}% of the science would reach Earth from ${scenario.target}. A bigger dish sends much more.`,
    short: `${Math.round(share * 100)}% gets home`,
  };

  const checks = [budget, mass, power, fuel, comms];
  const hasEverything =
    body !== undefined && rocket !== undefined && design.instrumentIds.length > 0;

  return {
    budget,
    mass,
    power,
    fuel,
    comms,
    checks,
    allOk: hasEverything && checks.every((check) => check.ok),
    science,
    scienceShare: share,
    scienceHome: Math.round(science * share),
  };
}

/**
 * The conditions this design and mission satisfy, as a set of short words.
 *
 * The challenge data uses these in `onlyIf` (should this event happen at all?)
 * and `protectedBy` (does the design soften it?), so adding a new condition is
 * a matter of adding it here and naming it in events.json.
 */
export function designFlags(design: Design, scenario: Scenario): Set<string> {
  const flags = new Set<string>();

  const body = findBody(design.bodyId);
  const power = findPower(design.powerId);
  const engine = findEngine(design.engineId);
  const instruments = findInstruments(design.instrumentIds);

  /* ---- what the design is made of */
  if (body) {
    flags.add(body.id);
    if (body.backup) flags.add("backup");
  }
  if (power) flags.add(power.type); // "solar" or "rtg"
  if (engine) flags.add(engine.id);
  flags.add(design.antennaId);

  if (instruments.length > 0) flags.add("hasInstruments");
  if (instruments.length >= 3) flags.add("threeInstruments");

  /* ---- what the mission is like */
  flags.add(scenario.id);
  if (scenario.dustRisk > 0) flags.add("dustRisk");
  // Past the asteroid belt, where a gravity assist is worth the detour.
  if (scenario.distanceAU > 2.0) flags.add("outerPlanet");

  return flags;
}
