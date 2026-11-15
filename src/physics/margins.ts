/**
 * The Mission Design Lab review.
 *
 * The launch checks in `checks.ts` ask the easy question: does the design fit?
 * This asks the question NASA's Mission Design Lab actually asks, which is
 * harder and more useful: does it *still* fit once every subsystem has added
 * the contingency it is required to add?
 *
 * Three numbers per subsystem, and the whole method is the gap between them:
 *
 *   CBE  Current Best Estimate — the honest number today
 *   MEV  Maximum Expected Value — CBE plus contingency, what you design to
 *   MPV  Maximum Possible Value — the hard limit the hardware sets
 *
 * A design closes when MEV ≤ MPV. A design that passes the launch checks but
 * fails here is the interesting one: it is the design that looks fine and is
 * not, which is the entire reason concept reviews exist.
 *
 * Every percentage comes from mdlPolicy.json, and every entry there carries the
 * sentence of the NASA paper it was taken from:
 *
 *   Karpati, Hyde, Peabody & Garrison, "Resource Management and Contingencies
 *   in Aerospace Concurrent Engineering", NASA Goddard, 2012. NTRS 20120013284.
 *
 * Pure arithmetic, no React, tested as such.
 */
import type { Design, MdlContingency, MdlVerdictText, Route, Scenario } from "../data/game";
import {
  contingencyFor,
  findAntenna,
  findEngine,
  findInstruments,
  findRocket,
  mdlPolicy,
} from "../data/game";
import { spacecraftDeltaVNeeded } from "./checks";
import { powerAtTarget, powerNeeded } from "./power";
import { designDeltaV, dryMass, fuelForDeltaV } from "./rocketEquation";

/* ------------------------------------------------------------- the formulas */

/** CBE grown by its contingency. `percent` of 0.25 means "add a quarter". */
export function maximumExpectedValue(cbe: number, percent: number): number {
  return cbe * (1 + percent);
}

/** (MEV − CBE) / CBE. How much room for growth was added, against today's number. */
export function growthContingency(cbe: number, mev: number): number {
  if (cbe <= 0) return 0;
  return (mev - cbe) / cbe;
}

/** (MEV − CBE) / MEV. The same room, measured against the grown number. */
export function resourceContingency(cbe: number, mev: number): number {
  if (mev <= 0) return 0;
  return (mev - cbe) / mev;
}

/** (MPV − MEV) / MEV. The spare above the grown number. */
export function growthMargin(mev: number, mpv: number): number {
  if (mev <= 0) return 0;
  return (mpv - mev) / mev;
}

/**
 * (MPV − MEV) / MPV. The spare measured against the hard limit, which is the
 * one a reviewer quotes. Negative means the design does not close.
 *
 * With no limit at all there is nothing to have margin against, so a design
 * needing something reports −1 (no margin whatever) rather than a silent zero.
 */
export function resourceMargin(mev: number, mpv: number): number {
  if (mpv <= 0) return mev > 0 ? -1 : 0;
  return (mpv - mev) / mpv;
}

/* ------------------------------------------------------------------ a row */

export type MdlTone = "good" | "tight" | "bad";

export interface MdlRow {
  id: MdlContingency["id"];
  label: string;
  subsystem: string;
  unit: string;
  cbe: number;
  mev: number;
  mpv: number;
  /** The contingency this subsystem adds, 0 to 1. */
  percent: number;
  /** (MPV − MEV) / MPV. Negative when it does not close. */
  margin: number;
  closes: boolean;
  tone: MdlTone;
  /** One sentence in plain English, for a 12-year-old. */
  message: string;
  /** The sentence in the NASA paper this contingency comes from. */
  quote: string;
  appliesTo: string;
  plain: string;
}

function toneFor(margin: number, closes: boolean): MdlTone {
  if (!closes) return "bad";
  return margin >= mdlPolicy.tone.comfortable ? "good" : "tight";
}

/** Round for display without losing the sign of a tiny negative margin. */
function show(value: number, places = 0): string {
  const factor = 10 ** places;
  return (Math.round(value * factor) / factor).toString();
}

function buildRow(
  id: MdlContingency["id"],
  unit: string,
  cbe: number,
  mpv: number,
  describe: (row: { cbe: number; mev: number; mpv: number; closes: boolean }) => string,
  /** Some rows grow by more than their own contingency, because growth elsewhere drives them. */
  mevOverride?: number,
): MdlRow {
  const policy = contingencyFor(id);
  const mev = mevOverride ?? maximumExpectedValue(cbe, policy.percent);
  const closes = mev <= mpv;
  const margin = resourceMargin(mev, mpv);

  return {
    id,
    label: policy.label,
    subsystem: policy.subsystem,
    unit,
    cbe,
    mev,
    mpv,
    percent: policy.percent,
    margin,
    closes,
    tone: toneFor(margin, closes),
    message: describe({ cbe, mev, mpv, closes }),
    quote: policy.quote,
    appliesTo: policy.appliesTo,
    plain: policy.plain,
  };
}

/* --------------------------------------------------------------- the review */

export interface MdlReview {
  rows: MdlRow[];
  verdict: MdlVerdictText["id"];
  verdictText: MdlVerdictText;
  /** How many of the five subsystems close. */
  closesCount: number;
  /** A spacecraft sized for this trip on today's estimates, kg. */
  cbeLaunchMass: number;
  /** The same spacecraft sized once every contingency is honoured, kg. */
  mevLaunchMass: number;
  /**
   * (MEV − CBE) / CBE for the whole spacecraft. The paper calls this the
   * composite contingency, and it is bigger than any single subsystem's
   * because growth in one drives growth in another.
   */
  compositeContingency: number;
  /** True when the composite has run away — the paper's "contingency pile-up". */
  pileUp: boolean;
}

/**
 * Review a design the way the Mission Design Lab would.
 *
 * The order of the rows is the order the paper's pile-up example runs in —
 * science, comms, power, mass, propulsion — so reading down the list is
 * reading the chain of consequences.
 */
export function mdlReview(design: Design, scenario: Scenario, route: Route): MdlReview {
  const rocket = findRocket(design.rocketId);
  const engine = findEngine(design.engineId);
  const antenna = findAntenna(design.antennaId);
  const instruments = findInstruments(design.instrumentIds);

  const dry = dryMass(design);
  const loadedFuel = Math.max(0, design.fuelKg);
  const capacity = rocket?.capacity ?? 0;

  /* ---- 1. Data rate. RF Comms takes Science's number and adds 30%, then has
         to pick a radio big enough for the grown figure. */
  const dataCbe = instruments.reduce((total, instrument) => total + instrument.dataNeed, 0);
  const dataRow = buildRow(
    "dataRate",
    "kbps",
    dataCbe,
    antenna?.dataRate ?? 0,
    ({ mev, mpv, closes }) =>
      closes
        ? `The instruments make ${show(dataCbe, 1)} kbps. Allowing for ${show(mev, 1)} kbps, the ${antenna?.name.toLowerCase() ?? "antenna"} sends ${show(mpv, 1)} kbps — enough.`
        : `Allowing for growth the instruments could make ${show(mev, 1)} kbps, but the ${antenna?.name.toLowerCase() ?? "antenna"} only sends ${show(mpv, 1)} kbps. A bigger dish would fix this.`,
  );

  /* ---- 2. Power. The panels must beat every load with 30% to spare. */
  const powerCbe = powerNeeded(design);
  const powerRow = buildRow(
    "power",
    "W",
    powerCbe,
    powerAtTarget(design, scenario.distanceAU),
    ({ mev, mpv, closes }) =>
      closes
        ? `Everything on board asks for ${show(powerCbe)} W. Sized for ${show(mev)} W, and you make ${show(mpv)} W at ${scenario.target}.`
        : `Sized for growth you need ${show(mev)} W, but you only make ${show(mpv)} W at ${scenario.target}. That is ${show(mev - mpv)} W short.`,
  );

  /* ---- 3. Dry mass. A quarter added to everything that is not fuel. */
  const massMpv = Math.max(0, capacity - loadedFuel);
  const massRow = buildRow(
    "mass",
    "kg",
    dry,
    massMpv,
    ({ mev, mpv, closes }) =>
      closes
        ? `The spacecraft is ${show(dry)} kg dry. Allowing for ${show(mev)} kg, the ${rocket?.name.toLowerCase() ?? "rocket"} still has room for ${show(mpv)} kg alongside your fuel.`
        : `Allowing for growth it could reach ${show(mev)} kg, but with your fuel aboard the ${rocket?.name.toLowerCase() ?? "rocket"} only has room for ${show(mpv)} kg.`,
  );

  /* ---- 4. Delta-v. Pointing and steering burn fuel too: the ACS tax. */
  const deltaVCbe = spacecraftDeltaVNeeded(design, scenario, route);
  const deltaVRow = buildRow(
    "deltaV",
    "km/s",
    deltaVCbe,
    designDeltaV(design),
    ({ mev, mpv, closes }) =>
      closes
        ? `The trip needs ${show(deltaVCbe, 2)} km/s. With the steering tax that is ${show(mev, 2)} km/s, and your fuel gives ${show(mpv, 2)} km/s.`
        : `With the steering tax the trip needs ${show(mev, 2)} km/s, but your fuel only gives ${show(mpv, 2)} km/s. Load more fuel.`,
  );

  /* ---- 5. Propellant. You can never use the last of the tank.
         Sized against the GROWN dry mass and the GROWN Δv, not today's — which
         is the correlated growth the paper warns about, and the reason this
         row can fail when the simple fuel check passed. */
  const propellantPolicy = contingencyFor("propellant");
  const usableFuelNeeded = engine
    ? fuelForDeltaV(engine.isp, massRow.mev, deltaVRow.mev)
    : 0;
  const propellantMev = usableFuelNeeded * (1 + propellantPolicy.percent);
  const propellantRow = buildRow(
    "propellant",
    "kg",
    engine ? fuelForDeltaV(engine.isp, dry, deltaVCbe) : 0,
    loadedFuel,
    ({ mev, mpv, closes }) =>
      closes
        ? `Sized for a heavier spacecraft and the fuel you can never drain, you need ${show(mev)} kg. You loaded ${show(mpv)} kg.`
        : `Once the spacecraft grows, you would need ${show(mev)} kg of fuel, but only ${show(mpv)} kg is loaded. This is the trap: heavier spacecraft need more fuel, and more fuel makes them heavier still.`,
    propellantMev,
  );

  const rows = [dataRow, powerRow, massRow, deltaVRow, propellantRow];

  /* ---- the whole spacecraft, sized two ways.
         Both numbers are the mass of a spacecraft sized to do THIS trip: one
         sized on today's estimates, one sized on the grown ones. They have to
         be like for like, which is why this uses the fuel the trip needs and
         not the fuel the player happened to load — otherwise filling the tank
         to the brim would make the composite contingency come out negative.
         This is the paper's own comparison, its Figures V-2 and V-3.

         Growth compounds here: a heavier spacecraft needs more fuel for the
         same trip, and that fuel is itself mass. That is why the composite
         comes out larger than the 25% any single subsystem added. */
  const cbeLaunchMass = dry + propellantRow.cbe;
  const mevLaunchMass = massRow.mev + propellantMev;
  const compositeContingency = growthContingency(cbeLaunchMass, mevLaunchMass);

  const closesCount = rows.filter((row) => row.closes).length;
  const allClose = closesCount === rows.length;
  const tightest = Math.min(...rows.map((row) => row.margin));

  const verdict: MdlVerdictText["id"] = !allClose
    ? "doesNotClose"
    : tightest < mdlPolicy.tone.comfortable
      ? "tight"
      : "closes";

  const verdictText =
    mdlPolicy.verdicts.find((entry) => entry.id === verdict) ?? mdlPolicy.verdicts[0];

  return {
    rows,
    verdict,
    verdictText,
    closesCount,
    cbeLaunchMass,
    mevLaunchMass,
    compositeContingency,
    pileUp: compositeContingency > mdlPolicy.pileUp.warnAbovePercent,
  };
}

/** A percentage for the screen: 0.253 becomes "25%". */
export function asPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}
