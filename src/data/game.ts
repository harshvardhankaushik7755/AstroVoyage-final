/**
 * The one place the JSON data files are read and given types.
 *
 * Everything else in the app imports from here, so no screen ever reaches into a
 * JSON file directly and no game number is written twice. The `as unknown as T`
 * casts exist because the JSON files carry `_note` keys for the humans reading
 * them, which TypeScript would otherwise fold into the inferred shape.
 */
import partsJson from "./parts.json";
import scenariosJson from "./scenarios.json";
import eventsJson from "./events.json";
import settingsJson from "./settings.json";
import realMissionsJson from "./realMissions.json";
import glossaryJson from "./glossary.json";
import nasaSourcesJson from "./nasaSources.json";
import skyJson from "./sky.json";
import homeSystemJson from "./homeSystem.json";

/* ------------------------------------------------------------------ parts */

/** The six part groups the player chooses from, in the order the Design Lab shows them. */
export type PartGroup = "body" | "instruments" | "power" | "antenna" | "engine" | "rocket";

/** A part of the built spacecraft that a challenge can happen to. */
export type ShipPart = "body" | "instruments" | "power" | "antenna" | "engine";

export interface Body {
  id: string;
  name: string;
  mass: number;
  cost: number;
  slots: number;
  backup: boolean;
  note: string;
}

export interface Instrument {
  id: string;
  name: string;
  mass: number;
  power: number;
  cost: number;
  science: number;
  dataNeed: number;
  note: string;
}

export interface PowerSource {
  id: string;
  name: string;
  type: "solar" | "rtg";
  mass: number;
  powerAt1AU: number;
  cost: number;
  note: string;
}

export interface Antenna {
  id: string;
  name: string;
  mass: number;
  power: number;
  cost: number;
  dataRate: number;
  note: string;
}

export interface Engine {
  id: string;
  name: string;
  isp: number;
  mass: number;
  cost: number;
  powerNeed: number;
  burnProfile: "impulsive" | "continuous";
  note: string;
}

export interface Rocket {
  id: string;
  name: string;
  /** The most mass it can lift, kg. */
  capacity: number;
  cost: number;
  /** Δv the rocket gives the spacecraft on the way out of Earth, km/s. */
  deltaVProvided: number;
  note: string;
}

export interface PartsData {
  fuelPricePerKg: number;
  bodies: Body[];
  instruments: Instrument[];
  powerSources: PowerSource[];
  antennas: Antenna[];
  engines: Engine[];
  rockets: Rocket[];
}

export const parts = partsJson as unknown as PartsData;

/* -------------------------------------------------------------- scenarios */

/** A route choice. "fast" costs more Δv and arrives sooner. */
export type Route = "fast" | "slow";

export interface Preset {
  bodyId: string;
  instrumentIds: string[];
  powerId: string;
  antennaId: string;
  engineId: string;
  rocketId: string;
  fuelKg: number;
  launchMonth: number;
  route: Route;
}

/** One thing a mission could be sent to do, and the instrument it takes. */
export interface MissionGoal {
  id: string;
  /** A single emoji, so the goal is recognisable before it is read. */
  icon: string;
  label: string;
  /** The instrument this goal cannot be done without. */
  instrumentId: string;
}

export interface Scenario {
  id: string;
  name: string;
  level: string;
  /** One word for a pill: Easy, Medium, Hard. `level` is the long version. */
  difficulty: string;
  /** What you could go there to do. The player picks one before designing. */
  goals: MissionGoal[];
  description: string;
  /** $M available to spend. */
  budget: number;
  /** Δv the trip needs, km/s. */
  deltaV: number;
  /** Distance from the Sun at the target, AU. Used for sunlight and signal delay. */
  distanceAU: number;
  /** Share of science that gets home on the smallest antenna. */
  commsFactor: number;
  tripDays: number;
  /** Months between launch windows. 0 means launch any month. */
  windowMonths: number;
  windowOffset: number;
  missionMonths: number;
  /** 0 to 1. Above 0 the dust-storm challenge can happen. */
  dustRisk: number;

  target: string;
  /** The target's name as it reads in a sentence: "the Moon", "Mars". */
  targetProse: string;
  color: string;
  /** What sits in the middle of the map. */
  centralBody: "sun" | "earth";
  /** Where the transfer begins: Earth's orbit for a planet, a high Earth orbit for the Moon. */
  startRadiusAU: number;
  /** How long the departure point takes to go round once, days. */
  startOrbitDays: number;
  targetOrbitRadiusAU: number;
  targetOrbitDays: number;
  /** Δv the braking burn at arrival needs, km/s. */
  insertionDeltaV: number;

  preset: Preset;
  realMissionIds: string[];
}

export const scenarios = scenariosJson as unknown as Scenario[];

/* ----------------------------------------------------------------- events */

/**
 * What a choice does. Every field is optional; `none` marks a choice that
 * costs nothing, so an empty effect is never mistaken for a missing one.
 */
export interface EventEffect {
  none?: boolean;
  /** kg of fuel burned now. */
  fuelCost?: number;
  /** kg of fuel the mission no longer needs. */
  fuelSaved?: number;
  /** Share of the remaining science lost, 0 to 1. */
  sciencePenalty?: number;
  /** Share of extra science gained, 0 to 1. */
  scienceBonus?: number;
  /** Share of power lost for the rest of the trip, 0 to 1. */
  powerPenalty?: number;
  /** Share of signal lost for the rest of the trip, 0 to 1. */
  signalPenalty?: number;
  /** Days added to the trip. */
  daysLost?: number;
  /** Chance the spacecraft is lost right now, 0 to 1. */
  riskOfFailure?: number;
  /** Chance added to failing the braking burn at arrival, 0 to 1. */
  riskAtInsertion?: number;
  /** Cancels every risk added at insertion so far. */
  clearInsertionRisk?: boolean;
}

export interface EventOption {
  id: string;
  label: string;
  /** True when the choice takes no risk. Used to pick a default if the clock runs out. */
  safe?: boolean;
  /** Only offer this option when the design satisfies this condition. */
  onlyIf?: string;
  effect: EventEffect;
  /** Used instead of `effect` when the design is protected against this event. */
  protectedEffect?: EventEffect;
}

export interface EventDef {
  id: string;
  name: string;
  /** Chance per draw. 0 means it only ever arrives as a follow-up. */
  chance: number;
  kind: "problem" | "opportunity";
  phase?: "early" | "mid" | "late" | "any";
  /** A condition on the design or the scenario, e.g. "rtg", "mars", "outerPlanet". */
  onlyIf?: string;
  /** The part of the built spacecraft this happens to, marked on the map. */
  affectsPart?: ShipPart | null;

  explain: string;
  whatIsIt: string;
  realExample: string;
  howCommon: string;

  /** A design condition that softens this event. */
  protectedBy?: string;
  protectedText?: string;
  /** When protected, resolve it with no card at all. */
  autoResolveWhenProtected?: boolean;
  /** Shown when the risk comes true. `{target}` is replaced with the target's name. */
  failText?: string;

  /** Arrives only after this exact earlier choice. */
  follows?: { eventId: string; optionId: string };

  options: EventOption[];
}

export const eventDefs = eventsJson as unknown as EventDef[];

/* --------------------------------------------------------------- settings */

export interface Settings {
  /** Real seconds every cruise lasts, whatever the distance. Sets the time scale. */
  cruiseSeconds: number;
  /** Fuel the checks ask for above the bare minimum. */
  fuelMargin: number;
  decisionSeconds: number;
  beatMs: number;
  effectMs: number;
  shakeMs: number;
  clockJumpMs: number;
  burnHoldMs: number;
  insertionCountdownMs: number;
  eventsPerMission: { min: number; max: number };
  eventWindow: { from: number; to: number };
  routes: Record<Route, RouteSettings>;
  /** The least share of the science that must reach Earth for the comms check to pass. */
  minScienceHome: number;
}

export interface RouteSettings {
  label: string;
  /** Multiplies the Δv the trip needs. */
  deltaVFactor: number;
  /** Multiplies the trip time. */
  tripFactor: number;
  note: string;
}

export const settings = settingsJson as unknown as Settings;

/* ------------------------------------------------------- reference tables */

export interface RealMission {
  id: string;
  name: string;
  agency: string;
  year: number;
  power: string;
  rocket: string;
  fact: string;
}

export const realMissions = realMissionsJson as unknown as RealMission[];

export interface GlossaryEntry {
  term: string;
  meaning: string;
}

export const glossary = glossaryJson as unknown as GlossaryEntry[];

/** Where a number comes from. Shown by the "Where the numbers come from" panel. */
export interface NasaSource {
  id: string;
  kind: "formula" | "real" | "game";
  what: string;
  detail: string;
  source: string;
  url: string | null;
}

export const nasaSources = nasaSourcesJson as unknown as NasaSource[];

export interface SkyConfig {
  seed: number;
  starColor: string;
  stars: {
    count: number;
    minSize: number;
    maxSize: number;
    minOpacity: number;
    maxOpacity: number;
    shareInBand: number;
    tintChance: number;
  };
  milkyWay: {
    angleDeg: number;
    widthShare: number;
    opacity: number;
    color: string;
    edgeColor: string;
    peakAlpha: number;
  };
  galaxies: { count: number; minRadius: number; maxRadius: number; opacity: number };
  nebulae: { count: number; minRadius: number; maxRadius: number; opacity: number };
  edge: { keepOutRadiusShare: number; marginShare: number; cornerShare: number };
}

export const sky = skyJson as unknown as SkyConfig;

/* -------------------------------------------------- the home page's orrery */

/** A moon drawn going round a planet. */
export interface HomeMoon {
  label: string;
  radius: number;
  distance: number;
  orbitDays: number;
  color: string;
}

/** One planet on the home page's turning solar system. */
export interface HomeBody {
  id: string;
  label: string;
  /** Its real distance from the Sun, in astronomical units. */
  au: number;
  /** Its real orbit, in days. This is what sets how fast it turns. */
  orbitDays: number;
  radius: number;
  color: string;
  glowColor: string;
  bandColor?: string;
  bands?: number;
  moon?: HomeMoon;
}

export interface HomeSystemConfig {
  view: {
    width: number;
    height: number;
    centerXShare: number;
    centerYShare: number;
    marginShare: number;
  };
  time: { earthLapSeconds: number; compression: number };
  sun: { radius: number; coreColor: string; color: string; glowRadius: number; glowColor: string };
  orbit: {
    color: string;
    opacity: number;
    dash: string;
    width: number;
    innerShare: number;
    outerShare: number;
  };
  bodies: HomeBody[];
  probe: { label: string; au: number; orbitDays: number; size: number; color: string };
  startAngles: Record<string, number>;
}

export const homeSystem = homeSystemJson as unknown as HomeSystemConfig;

/* ---------------------------------------------------------------- lookups */

/** The spacecraft the player has designed. */
export interface Design {
  bodyId: string;
  instrumentIds: string[];
  powerId: string;
  antennaId: string;
  engineId: string;
  rocketId: string;
  fuelKg: number;
}

function byId<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((item) => item.id === id);
}

export const findBody = (id: string) => byId(parts.bodies, id);
export const findPower = (id: string) => byId(parts.powerSources, id);
export const findAntenna = (id: string) => byId(parts.antennas, id);
export const findEngine = (id: string) => byId(parts.engines, id);
export const findRocket = (id: string) => byId(parts.rockets, id);
export const findScenario = (id: string) => byId(scenarios, id);

/**
 * The goal the player picked, or the mission's first one when they have not
 * picked yet. Never returns undefined: every mission has at least one goal.
 */
export function missionGoal(scenario: Scenario, goalId?: string | null): MissionGoal {
  return scenario.goals.find((goal) => goal.id === goalId) ?? scenario.goals[0];
}
export const findRealMission = (id: string) => byId(realMissions, id);
export const findEventDef = (id: string) => byId(eventDefs, id);

/** The chosen instruments, in the order they were chosen. */
export function findInstruments(ids: string[]): Instrument[] {
  return ids.map((id) => byId(parts.instruments, id)).filter((i): i is Instrument => i !== undefined);
}

/** A design built from a scenario's tested preset. */
export function presetDesign(scenario: Scenario): Design {
  const p = scenario.preset;
  return {
    bodyId: p.bodyId,
    instrumentIds: [...p.instrumentIds],
    powerId: p.powerId,
    antennaId: p.antennaId,
    engineId: p.engineId,
    rocketId: p.rocketId,
    fuelKg: p.fuelKg,
  };
}
