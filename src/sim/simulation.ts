/**
 * The cruise engine: where the spacecraft is, what it has left, and what goes
 * wrong on the way.
 *
 * Two things here are real physics and worth saying plainly:
 *
 *  - The flight path is a Hohmann transfer — half an ellipse from the
 *    departure orbit out to the target's orbit — and the spacecraft's position
 *    along it is found by solving Kepler's equation. So it really does move
 *    fast near the body it left and slowly at the far end, which is why the
 *    first half of the trip looks quicker than the second.
 *  - The target is placed with the real lead angle: it sits where it needs to
 *    be *now* in order to arrive at the meeting point at the same moment the
 *    spacecraft does.
 *
 * The total trip time comes from the scenario (rounded from real missions)
 * rather than from the ellipse's own period, because the game compresses every
 * cruise into about 75 seconds. Kepler's equation still decides how that time
 * is spread along the path.
 *
 * Every function takes a state and returns a new one. No React, no mutation of
 * the state passed in, so all of it can be tested.
 */
import type { Design, EventDef, EventEffect, EventOption, Route, Scenario, ShipPart } from "../data/game";
import { eventDefs, findEngine, settings } from "../data/game";
import { designScienceShare } from "../physics/comms";
import { totalScience } from "../physics/checks";
import { deltaV, dryMass, fuelForDeltaV } from "../physics/rocketEquation";
import { powerAtTarget } from "../physics/power";
import { tripDays } from "../physics/windows";

/* ====================================================================== types */

export type Phase = "cruise" | "insertion" | "orbit" | "flyby" | "lost";

export type Tone = "plain" | "good" | "bad" | "warn";

/** A short coloured fact about what an option does, in the engine's own words. */
export interface Chip {
  text: string;
  tone: Tone;
}

export interface SimOption {
  id: string;
  label: string;
  safe: boolean;
  chips: Chip[];
}

export interface SimEvent {
  defId: string;
  name: string;
  kind: "problem" | "opportunity";
  explain: string;
  whatIsIt: string;
  realExample: string;
  howCommon: string;
  /** The part of the built spacecraft this happens to. */
  affectsPart: ShipPart | null;
  /** True when the design softens this event. */
  isProtected: boolean;
  protectedText: string | null;
  day: number;
  options: SimOption[];
}

export interface Decision {
  day: number;
  defId: string;
  eventName: string;
  optionId: string;
  optionLabel: string;
  /** True when it cost science, power or signal, or took a risk. */
  hurt: boolean;
  outcome: string;
  chips: Chip[];
}

export interface LogLine {
  day: number;
  text: string;
  tone: Tone;
  /** Set when the line came from a challenge, so the log can offer "why?". */
  defId?: string;
}

interface Scheduled {
  day: number;
  defId: string;
  fired: boolean;
}

export interface SimConfig {
  scenarioId: string;
  target: string;
  targetProse: string;
  color: string;
  centralBody: "sun" | "earth";
  startRadiusAU: number;
  startOrbitDays: number;
  targetOrbitRadiusAU: number;
  targetOrbitDays: number;
  distanceAU: number;
  insertionDeltaV: number;
  launchMonth: number;
  route: Route;
}

export interface SimState {
  config: SimConfig;
  design: Design;
  /** Design conditions, kept as an array so the state stays plain data. */
  flags: string[];

  totalDays: number;
  /** Mission days that pass per real second at 1x. */
  daysPerSecond: number;
  missionDay: number;
  phase: Phase;
  /** 0 is paused. */
  speed: number;

  startFuelKg: number;
  fuelKg: number;
  /** Share of the design's power still available, 0 to 1. */
  powerFactor: number;
  /** Share of the science that reaches Earth, 0 to 1. */
  signalFactor: number;
  /** What the signal was at launch, so the gauge can mark what has been lost. */
  startSignalFactor: number;

  scienceMax: number;
  /** Share of the science still collectable, after penalties and bonuses. */
  scienceFactor: number;
  scienceCollected: number;

  /** Chance the braking burn fails, 0 to 1. */
  insertionRisk: number;

  pendingEvent: SimEvent | null;
  schedule: Scheduled[];
  decisions: Decision[];
  log: LogLine[];

  rngState: number;
  failReason: string | null;

  /** Where things are, in radians. */
  startAngleRad: number;
  earthAngleRad: number;
  targetAngleRad: number;
}

/* ================================================================= randomness */

/**
 * mulberry32: a small, fast, seeded generator. Seeded so a mission can be
 * replayed exactly, which is what makes the tests possible.
 */
export function mulberry32(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** One random number, and the state to use for the next one. */
export function nextRandom(state: number): [number, number] {
  const value = mulberry32(state);
  return [value, (state + 0x9e3779b9) | 0];
}

/* ====================================================================== time */

/** Mission days per real second, so every cruise lasts about `cruiseSeconds`. */
export function timeScale(totalDays: number): number {
  return totalDays / settings.cruiseSeconds;
}

/** "1 sec = 4 days", in whatever unit reads best. */
export function scaleLabel(daysPerSecond: number): string {
  if (daysPerSecond < 1 / 12) {
    const hours = Math.max(1, Math.round(daysPerSecond * 24));
    return `1 sec = ${hours} hour${hours > 1 ? "s" : ""}`;
  }
  // Past about three weeks a second, months read more easily than days.
  if (daysPerSecond < 20) {
    const days = Math.max(1, Math.round(daysPerSecond));
    return `1 sec = ${days} day${days > 1 ? "s" : ""}`;
  }
  const months = Math.max(1, Math.round(daysPerSecond / 30.4));
  return `1 sec = ${months} month${months > 1 ? "s" : ""}`;
}

/* ================================================================== geometry */

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

/**
 * Solve Kepler's equation E − e·sin E = M for E, by bisection.
 *
 * Bisection rather than Newton on purpose: it cannot diverge, it needs no
 * derivative, and 60 halvings of [0, π] is far more precision than a screen
 * can show.
 */
export function keplerE(meanAnomaly: number, eccentricity: number): number {
  let low = 0;
  let high = Math.PI;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    if (mid - eccentricity * Math.sin(mid) < meanAnomaly) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

export interface TransferPoint {
  /** Distance from the central body, AU. */
  r: number;
  /** Angle turned since departure, radians. 0 at the start, π at arrival. */
  nu: number;
}

/**
 * Where along the transfer the spacecraft is, for `progress` from 0 to 1.
 *
 * The ellipse has the departure orbit as its closest point and the target's
 * orbit as its furthest, which is exactly a Hohmann transfer. Progress is
 * treated as mean anomaly from 0 to π, so Kepler's equation spreads the time
 * the way gravity really does.
 */
export function transferPosition(progress: number, r1: number, r2: number): TransferPoint {
  const a = (r1 + r2) / 2;
  if (a <= 0) return { r: 0, nu: 0 };
  const e = Math.abs(r2 - r1) / (r1 + r2);
  const meanAnomaly = Math.PI * clamp(progress, 0, 1);
  const E = keplerE(meanAnomaly, e);
  const r = a * (1 - e * Math.cos(E));
  const nu =
    2 *
    Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2),
    );
  return { r, nu };
}

/** The whole transfer as a list of points, for drawing the path. */
export function transferPath(r1: number, r2: number, steps = 90): TransferPoint[] {
  const points: TransferPoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    points.push(transferPosition(i / steps, r1, r2));
  }
  return points;
}

/**
 * Where a body is on a given mission day, in radians.
 * `which` is the departure body or the target.
 */
export function planetAngle(
  which: "earth" | "target",
  day: number,
  config: SimConfig,
  totalDays: number,
): number {
  const startAngle = (2 * Math.PI * config.launchMonth) / 12;

  if (which === "earth") {
    const period = config.startOrbitDays > 0 ? config.startOrbitDays : 365.25;
    return startAngle + (2 * Math.PI * day) / period;
  }

  // The real lead angle: the target must reach the meeting point — half a turn
  // round from the departure point — at the same moment the spacecraft does.
  const atArrival = startAngle + Math.PI;
  const turnedDuringTrip = (2 * Math.PI * totalDays) / config.targetOrbitDays;
  const atLaunch = atArrival - turnedDuringTrip;
  return atLaunch + (2 * Math.PI * day) / config.targetOrbitDays;
}

/**
 * Where the bodies are `extraDays` after arrival.
 *
 * Nothing in space stops when a mission succeeds, so the map keeps turning and
 * the spacecraft rides round the body it reached.
 */
export function coastAngles(
  sim: Pick<SimState, "config" | "missionDay" | "totalDays">,
  extraDays: number,
): { earthAngleRad: number; targetAngleRad: number } {
  const day = sim.missionDay + Math.max(0, extraDays);
  return {
    earthAngleRad: planetAngle("earth", day, sim.config, sim.totalDays),
    targetAngleRad: planetAngle("target", day, sim.config, sim.totalDays),
  };
}

/** How far through the cruise, 0 to 1. */
export function progressOf(sim: Pick<SimState, "missionDay" | "totalDays">): number {
  if (sim.totalDays <= 0) return 1;
  return clamp(sim.missionDay / sim.totalDays, 0, 1);
}

/* ============================================================ event wording */

function percent(share: number): number {
  return Math.round(share * 100);
}

/** Turn an effect into the chips shown on an option, in the engine's own words. */
export function effectChips(effect: EventEffect): Chip[] {
  const chips: Chip[] = [];

  if (effect.none) chips.push({ text: "Costs nothing", tone: "good" });
  if (effect.fuelCost) chips.push({ text: `−${effect.fuelCost} kg fuel`, tone: "warn" });
  if (effect.fuelSaved) chips.push({ text: `+${effect.fuelSaved} kg fuel`, tone: "good" });
  if (effect.sciencePenalty)
    chips.push({ text: `−${percent(effect.sciencePenalty)}% science`, tone: "bad" });
  if (effect.scienceBonus)
    chips.push({ text: `+${percent(effect.scienceBonus)}% science`, tone: "good" });
  if (effect.powerPenalty)
    chips.push({ text: `−${percent(effect.powerPenalty)}% power`, tone: "bad" });
  if (effect.signalPenalty)
    chips.push({ text: `−${percent(effect.signalPenalty)}% signal`, tone: "bad" });
  if (effect.daysLost) chips.push({ text: `+${effect.daysLost} days`, tone: "warn" });
  if (effect.riskOfFailure)
    chips.push({
      text: `${Math.round(effect.riskOfFailure * 10)} in 10 risk of losing it`,
      tone: "bad",
    });
  if (effect.riskAtInsertion)
    chips.push({
      text: `${Math.round(effect.riskAtInsertion * 10)} in 10 risk at arrival`,
      tone: "bad",
    });
  if (effect.clearInsertionRisk) chips.push({ text: "Clears the arrival risk", tone: "good" });

  return chips;
}

/** Replace {target} in authored text with the mission's target. */
function fill(text: string, config: SimConfig): string {
  return text.replace(/\{target\}/g, config.target);
}

/** Build the card the player sees from a definition and the design. */
function buildEvent(def: EventDef, day: number, flags: string[], config: SimConfig): SimEvent {
  const isProtected = def.protectedBy !== undefined && flags.includes(def.protectedBy);

  const options: SimOption[] = def.options
    // An option can require something of the design, e.g. "switch to the large
    // dish" is only offered to a spacecraft that carries one.
    .filter((option) => !option.onlyIf || flags.includes(option.onlyIf))
    .map((option) => {
      const effect = isProtected && option.protectedEffect ? option.protectedEffect : option.effect;
      return {
        id: option.id,
        label: fill(option.label, config),
        safe: option.safe === true,
        chips: effectChips(effect),
      };
    });

  return {
    defId: def.id,
    name: def.name,
    kind: def.kind,
    explain: fill(def.explain, config),
    whatIsIt: def.whatIsIt,
    realExample: def.realExample,
    howCommon: def.howCommon,
    affectsPart: def.affectsPart ?? null,
    isProtected,
    protectedText: def.protectedText ?? null,
    day,
    options,
  };
}

/** The option to take if the 20-second clock runs out: the safest one offered. */
export function safestOption(event: SimEvent): string {
  const safe = event.options.find((option) => option.safe);
  return (safe ?? event.options[0]).id;
}

/* ============================================================ drawing events */

/** Can this definition arrive on its own in this mission? */
function isDrawable(def: EventDef, flags: string[]): boolean {
  if (def.follows) return false; // only ever arrives as a follow-up
  if (def.chance <= 0) return false;
  if (def.onlyIf && !flags.includes(def.onlyIf)) return false;
  return true;
}

/** Which third of the cruise a phase wants to land in. */
function phaseOrder(def: EventDef): number {
  switch (def.phase) {
    case "early":
      return 0;
    case "mid":
      return 1;
    case "late":
      return 2;
    default:
      return 1.5; // "any" sits wherever there is room
  }
}

/**
 * Choose the challenges for one mission and when they arrive.
 *
 * Between 3 and 5 of them, drawn without repeats, weighted by how likely each
 * one is, and spread across the middle of the cruise so none lands on the
 * launch or the arrival burn.
 */
function drawSchedule(
  flags: string[],
  totalDays: number,
  rngState: number,
): { schedule: Scheduled[]; rngState: number } {
  let state = rngState;
  const pool = eventDefs.filter((def) => isDrawable(def, flags));

  const { min, max } = settings.eventsPerMission;
  let roll: number;
  [roll, state] = nextRandom(state);
  const wanted = Math.min(pool.length, min + Math.floor(roll * (max - min + 1)));

  /* ---- weighted draw without repeats */
  const chosen: EventDef[] = [];
  const remaining = [...pool];
  while (chosen.length < wanted && remaining.length > 0) {
    const totalWeight = remaining.reduce((sum, def) => sum + def.chance, 0);
    let pick: number;
    [pick, state] = nextRandom(state);
    let target = pick * totalWeight;
    let index = 0;
    while (index < remaining.length - 1) {
      target -= remaining[index].chance;
      if (target <= 0) break;
      index += 1;
    }
    chosen.push(remaining[index]);
    remaining.splice(index, 1);
  }

  /* ---- early things first, late things last */
  chosen.sort((a, b) => phaseOrder(a) - phaseOrder(b));

  /* ---- spread across the middle of the cruise */
  const { from, to } = settings.eventWindow;
  const span = to - from;
  const schedule: Scheduled[] = chosen.map((def, index) => {
    const slot = chosen.length === 1 ? 0.5 : index / (chosen.length - 1);
    let jitter: number;
    [jitter, state] = nextRandom(state);
    const spread = span / Math.max(1, chosen.length * 2.5);
    const share = clamp(from + slot * span + (jitter - 0.5) * spread, from, to);
    return { day: share * totalDays, defId: def.id, fired: false };
  });

  schedule.sort((a, b) => a.day - b.day);
  return { schedule, rngState: state };
}

/* =================================================================== set-up */

export function createSimulation(
  design: Design,
  scenario: Scenario,
  route: Route,
  launchMonth: number,
  flags: string[],
  seed: number,
): SimState {
  const config: SimConfig = {
    scenarioId: scenario.id,
    target: scenario.target,
    targetProse: scenario.targetProse,
    color: scenario.color,
    centralBody: scenario.centralBody,
    startRadiusAU: scenario.startRadiusAU,
    startOrbitDays: scenario.startOrbitDays,
    targetOrbitRadiusAU: scenario.targetOrbitRadiusAU,
    targetOrbitDays: scenario.targetOrbitDays,
    distanceAU: scenario.distanceAU,
    insertionDeltaV: scenario.insertionDeltaV,
    launchMonth,
    route,
  };

  const totalDays = tripDays(scenario, route);
  const { schedule, rngState } = drawSchedule(flags, totalDays, seed);

  const sim: SimState = {
    config,
    design,
    flags,
    totalDays,
    daysPerSecond: timeScale(totalDays),
    missionDay: 0,
    phase: "cruise",
    speed: 1,

    startFuelKg: design.fuelKg,
    fuelKg: design.fuelKg,
    powerFactor: 1,
    signalFactor: designScienceShare(design.antennaId, scenario),
    startSignalFactor: designScienceShare(design.antennaId, scenario),

    scienceMax: totalScience(design),
    scienceFactor: 1,
    scienceCollected: 0,

    insertionRisk: 0,

    pendingEvent: null,
    schedule,
    decisions: [],
    log: [
      {
        day: 0,
        text: `Launched. ${totalDays} days to ${scenario.targetProse}.`,
        tone: "good",
      },
    ],

    rngState,
    failReason: null,

    startAngleRad: (2 * Math.PI * launchMonth) / 12,
    earthAngleRad: 0,
    targetAngleRad: 0,
  };

  return withAngles(withScience(sim));
}

/* ================================================================== stepping */

/** Keep the live science figure in step with the factors and the progress. */
function withScience(sim: SimState): SimState {
  const reached = sim.phase === "orbit";
  const share = reached ? 1 : progressOf(sim);
  const collected = Math.round(sim.scienceMax * sim.scienceFactor * sim.signalFactor * share);
  return { ...sim, scienceCollected: Math.max(0, collected) };
}

/** Recompute where the bodies are for the current mission day. */
function withAngles(sim: SimState): SimState {
  return {
    ...sim,
    earthAngleRad: planetAngle("earth", sim.missionDay, sim.config, sim.totalDays),
    targetAngleRad: planetAngle("target", sim.missionDay, sim.config, sim.totalDays),
  };
}

/**
 * Advance the mission by `realSeconds` of wall-clock time.
 *
 * Nothing moves while a challenge card is waiting, and nothing moves once the
 * cruise is over — the arrival burn is resolved by `resolveInsertion`, so the
 * screen can show it happening.
 */
export function step(sim: SimState, realSeconds: number): SimState {
  if (sim.phase !== "cruise") return sim;
  if (sim.pendingEvent) return sim;
  if (sim.speed <= 0 || realSeconds <= 0) return sim;

  const advanced = sim.missionDay + sim.daysPerSecond * sim.speed * realSeconds;
  let next: SimState = { ...sim, missionDay: Math.min(advanced, sim.totalDays) };

  /* ---- has a challenge come due? */
  const dueIndex = next.schedule.findIndex((item) => !item.fired && item.day <= next.missionDay);
  if (dueIndex !== -1) {
    const due = next.schedule[dueIndex];
    const def = eventDefs.find((candidate) => candidate.id === due.defId);
    const schedule = next.schedule.map((item, index) =>
      index === dueIndex ? { ...item, fired: true } : item,
    );
    next = { ...next, schedule };

    if (def) {
      const event = buildEvent(def, next.missionDay, next.flags, next.config);

      if (event.isProtected && def.autoResolveWhenProtected) {
        // The design already handles this one, so there is nothing to decide.
        next = {
          ...next,
          log: [
            ...next.log,
            {
              day: next.missionDay,
              text: `${def.name}. ${event.protectedText ?? "Your design handled it."}`,
              tone: "good",
              defId: def.id,
            },
          ],
        };
      } else {
        // A card stops the clock. Waiting is never the player's loss.
        next = {
          ...next,
          pendingEvent: event,
          speed: 0,
          log: [
            ...next.log,
            { day: next.missionDay, text: `${def.name}.`, tone: "warn", defId: def.id },
          ],
        };
      }
    }
  }

  /* ---- arrived? */
  if (next.phase === "cruise" && next.missionDay >= next.totalDays && !next.pendingEvent) {
    next = {
      ...next,
      phase: "insertion",
      missionDay: next.totalDays,
      log: [
        ...next.log,
        {
          day: next.totalDays,
          text: `Reached ${next.config.targetProse}. Starting the braking burn.`,
          tone: "plain",
        },
      ],
    };
  }

  return withAngles(withScience(next));
}

/* ============================================================== decisions */

/** Did this choice cost something lasting, or take a risk? */
function isHurt(effect: EventEffect): boolean {
  return Boolean(
    effect.sciencePenalty ||
      effect.powerPenalty ||
      effect.signalPenalty ||
      effect.riskOfFailure ||
      effect.riskAtInsertion,
  );
}

/** Apply the player's choice to the waiting challenge. */
export function resolveEvent(sim: SimState, optionId: string): SimState {
  const event = sim.pendingEvent;
  if (!event) return sim;

  const def = eventDefs.find((candidate) => candidate.id === event.defId);
  const chosen = event.options.find((option) => option.id === optionId) ?? event.options[0];
  const rawOption: EventOption | undefined = def?.options.find((option) => option.id === chosen.id);
  if (!def || !rawOption) return sim;

  const effect =
    event.isProtected && rawOption.protectedEffect ? rawOption.protectedEffect : rawOption.effect;

  // The day the choice was made, read before any clock jump, so a follow-up
  // can name the right date later.
  const decidedOn = Math.floor(sim.missionDay);

  let next: SimState = { ...sim, pendingEvent: null, speed: 1 };
  const log: LogLine[] = [...next.log];
  let state = next.rngState;

  if (event.isProtected && event.protectedText) {
    log.push({ day: decidedOn, text: event.protectedText, tone: "good", defId: def.id });
  }

  /* ---- fuel */
  if (effect.fuelCost) {
    next.fuelKg = Math.max(0, next.fuelKg - effect.fuelCost);
    log.push({ day: decidedOn, text: `Burned ${effect.fuelCost} kg of fuel.`, tone: "plain" });
  }
  if (effect.fuelSaved) {
    next.fuelKg += effect.fuelSaved;
    log.push({ day: decidedOn, text: `Saved ${effect.fuelSaved} kg of fuel.`, tone: "good" });
  }

  /* ---- science, power, signal */
  if (effect.sciencePenalty) {
    next.scienceFactor *= 1 - effect.sciencePenalty;
    log.push({ day: decidedOn, text: `Science down ${percent(effect.sciencePenalty)}%.`, tone: "bad" });
  }
  if (effect.scienceBonus) {
    next.scienceFactor *= 1 + effect.scienceBonus;
    log.push({ day: decidedOn, text: `Extra science: +${percent(effect.scienceBonus)}%.`, tone: "good" });
  }
  if (effect.powerPenalty) {
    next.powerFactor *= 1 - effect.powerPenalty;
    log.push({ day: decidedOn, text: `Power down ${percent(effect.powerPenalty)}%.`, tone: "bad" });
  }
  if (effect.signalPenalty) {
    next.signalFactor *= 1 - effect.signalPenalty;
    log.push({ day: decidedOn, text: `Signal down ${percent(effect.signalPenalty)}%.`, tone: "bad" });
  }

  /* ---- time. The clock jumps and the arrival moves back by the same amount,
          so the spacecraft does not teleport along its path. */
  if (effect.daysLost) {
    next.missionDay += effect.daysLost;
    next.totalDays += effect.daysLost;
    log.push({ day: decidedOn, text: `Lost ${effect.daysLost} days.`, tone: "warn" });
  }

  /* ---- risk at the far end */
  if (effect.clearInsertionRisk) {
    next.insertionRisk = 0;
    log.push({ day: decidedOn, text: "The aim is clean again.", tone: "good" });
  }
  if (effect.riskAtInsertion) {
    next.insertionRisk = Math.min(0.9, next.insertionRisk + effect.riskAtInsertion);
  }

  /* ---- risk right now */
  if (effect.riskOfFailure) {
    let roll: number;
    [roll, state] = nextRandom(state);
    if (roll < effect.riskOfFailure) {
      next.phase = "lost";
      next.failReason = fill(def.failText ?? "The spacecraft was lost.", next.config);
      log.push({ day: decidedOn, text: next.failReason, tone: "bad", defId: def.id });
    }
  }

  /* ---- did this choice cause a follow-up later in the trip? */
  const followUp = eventDefs.find(
    (candidate) =>
      candidate.follows?.eventId === def.id && candidate.follows?.optionId === chosen.id,
  );
  let schedule = next.schedule;
  if (followUp && next.phase === "cruise") {
    // Far enough ahead to feel like a consequence, but inside the cruise.
    const remaining = next.totalDays - next.missionDay;
    const when = next.missionDay + Math.max(1, remaining * 0.35);
    if (when < next.totalDays) {
      schedule = [...schedule, { day: when, defId: followUp.id, fired: false }].sort(
        (a, b) => a.day - b.day,
      );
    }
  }

  const decision: Decision = {
    day: decidedOn,
    defId: def.id,
    eventName: def.name,
    optionId: chosen.id,
    optionLabel: chosen.label,
    hurt: isHurt(effect),
    outcome: event.isProtected && event.protectedText ? event.protectedText : chosen.label,
    chips: chosen.chips,
  };

  next = {
    ...next,
    schedule,
    log,
    rngState: state,
    decisions: [...next.decisions, decision],
  };

  return withAngles(withScience(next));
}

/* ================================================================ arrival */

/** The Δv the spacecraft can still deliver with the fuel it has left, km/s. */
export function remainingDeltaV(sim: SimState): number {
  const engine = findEngine(sim.design.engineId);
  if (!engine) return 0;
  const dry = dryMass(sim.design);
  return deltaV(engine.isp, dry + sim.fuelKg, dry);
}

/**
 * The braking burn. Two ways to fly straight past: no fuel left to slow down,
 * or an aim that earlier decisions spoiled.
 */
export function resolveInsertion(sim: SimState): SimState {
  if (sim.phase !== "insertion") return sim;

  const engine = findEngine(sim.design.engineId);
  const dry = dryMass(sim.design);
  const needed = engine ? fuelForDeltaV(engine.isp, dry, sim.config.insertionDeltaV) : Infinity;

  const log: LogLine[] = [...sim.log];
  let state = sim.rngState;

  if (remainingDeltaV(sim) < sim.config.insertionDeltaV) {
    log.push({
      day: sim.totalDays,
      text: `Not enough fuel to slow down. The spacecraft flew past ${sim.config.targetProse}.`,
      tone: "bad",
    });
    return withScience({
      ...sim,
      phase: "flyby",
      rngState: state,
      failReason: `There was not enough fuel left for the braking burn, so the spacecraft flew past ${sim.config.targetProse}.`,
      log,
    });
  }

  let roll: number;
  [roll, state] = nextRandom(state);
  if (roll < sim.insertionRisk) {
    log.push({
      day: sim.totalDays,
      text: `The aim was off. The spacecraft flew past ${sim.config.targetProse}.`,
      tone: "bad",
    });
    return withScience({
      ...sim,
      phase: "flyby",
      rngState: state,
      failReason: `Earlier decisions left the aim off, and the spacecraft flew past ${sim.config.targetProse}.`,
      log,
    });
  }

  log.push({
    day: sim.totalDays,
    text: `Orbit captured! The spacecraft is in orbit around ${sim.config.targetProse}.`,
    tone: "good",
  });

  return withScience({
    ...sim,
    phase: "orbit",
    fuelKg: Math.max(0, sim.fuelKg - needed),
    rngState: state,
    log,
  });
}

/* ================================================================== gauges */

/** True once nothing more will happen. */
export function isOver(sim: SimState): boolean {
  return sim.phase === "orbit" || sim.phase === "flyby" || sim.phase === "lost";
}

/** Watts the spacecraft has now, after any damage. */
export function powerNow(sim: SimState): number {
  return powerAtTarget(sim.design, sim.config.distanceAU) * sim.powerFactor;
}
