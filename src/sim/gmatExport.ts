/**
 * The player's mission, written out as a real NASA GMAT script.
 *
 * GMAT — the General Mission Analysis Tool — is NASA's open-source mission
 * design program, built at Goddard and used on real flight projects. It reads
 * plain-text scripts in its own language. This file turns a design a twelve-
 * year-old made in a browser into one of those scripts: same dry mass, same
 * fuel load, same engine Isp, same departure burn.
 *
 * That is the whole point of the feature. The game is not pretending to be
 * mission design software — it hands your mission to the software.
 *
 * The shape of the output is the shape GMAT's own GUI writes:
 *
 *   %  a comment
 *   Create <Type> <name>;
 *   GMAT <name>.<Property> = <value>;
 *   BeginMissionSequence;          <- exactly once, after every Create
 *   Propagate ...                  <- commands only after that line
 *
 * Resource names `ChemicalTank` and `ChemicalThruster` are the R2018a-and-later
 * spellings; they were `FuelTank` and `Thruster` before that.
 *
 * Pure string building. No DOM, no React — the screen does the download.
 */
import type { Design, MissionGoal, Route, Scenario } from "../data/game";
import {
  findEngine,
  findInstruments,
  gmat,
  gmatBody,
  jpl,
  settings,
} from "../data/game";
import { spacecraftDeltaVNeeded } from "../physics/checks";
import { dryMass } from "../physics/rocketEquation";

/** Trim a number to a sensible number of decimals without exponent notation. */
function num(value: number, places = 3): string {
  if (!Number.isFinite(value)) return "0";
  const fixed = value.toFixed(places);
  // Drop trailing zeros, but never leave a bare "." behind.
  return fixed.replace(/\.?0+$/, "") || "0";
}

/** How long the trip takes on this route, in days. */
export function tripDaysFor(scenario: Scenario, route: Route): number {
  return scenario.tripDays * settings.routes[route].tripFactor;
}

/**
 * A GMAT-safe identifier. GMAT resource names have to be a single word, so a
 * mission called "Mars on a Budget" becomes "MarsOnABudget".
 */
export function gmatName(text: string): string {
  const cleaned = text.replace(/[^A-Za-z0-9 ]/g, " ");
  const camel = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("");
  // A GMAT name may not start with a digit.
  return /^[0-9]/.test(camel) ? `M${camel}` : camel || "Mission";
}

/** The filename to offer: `AstroVoyage_MarsOnABudget.script`. */
export function gmatFilename(scenario: Scenario): string {
  return `AstroVoyage_${gmatName(scenario.name)}.script`;
}

/**
 * Build the script.
 *
 * `generatedOn` is passed in rather than read from the clock, so the same
 * design always produces the same file and the tests can check it byte for
 * byte. Leave it out and the header simply says nothing about when.
 */
export function gmatScript(
  design: Design,
  scenario: Scenario,
  route: Route,
  goal?: MissionGoal,
  generatedOn?: string,
): string {
  const body = gmatBody(scenario.id);
  const engine = findEngine(design.engineId);
  const instruments = findInstruments(design.instrumentIds);

  const dry = Math.max(1, Math.round(dryMass(design)));
  const fuel = Math.max(0, Math.round(design.fuelKg));
  const isp = engine?.isp ?? 300;
  const burnKmS = spacecraftDeltaVNeeded(design, scenario, route);
  const days = tripDaysFor(scenario, route);

  // Parking orbit: a circular orbit at the configured altitude above Earth.
  const sma = jpl.bodies.earth.equatorialRadiusKm! + body.parkingAltitudeKm;

  // Areas scale with the spacecraft, so a 300 kg probe does not get the drag
  // cross-section of a space station. Per tonne, from the config.
  const tonnes = (dry + fuel) / 1000;
  const dragArea = Math.max(1, gmat.coefficients.dragAreaPerTonne * tonnes);
  const srpArea = Math.max(1, gmat.coefficients.srpAreaPerTonne * tonnes);

  const sc = gmat.spacecraftName;
  // Earth is the primary body, carrying a full gravity field. GMAT rejects a
  // body that is also listed as a point mass, so it is filtered out here rather
  // than left as a trap in the data file. Duplicates go the same way.
  const pointMasses = [...new Set(body.pointMasses)].filter((pm) => pm !== "Earth");
  const L: string[] = [];
  const rule = `%${"-".repeat(70)}`;

  /* ------------------------------------------------------------- header */
  L.push("%General Mission Analysis Tool(GMAT) Script");
  L.push(rule);
  L.push(`% AstroVoyage — ${scenario.name}`);
  if (goal) L.push(`% Mission goal: ${goal.label}`);
  L.push("%");
  L.push("% Designed in AstroVoyage, a mission design game built for the");
  L.push("% NASA Space Apps Challenge 2026, and written out here in GMAT's own");
  L.push("% script language so the design can be flown in the real tool.");
  L.push("%");
  L.push(`% Target version : NASA GMAT ${gmat.targetVersion}`);
  L.push("% GMAT download  : https://software.nasa.gov/software/GSC-18094-1");
  if (generatedOn) L.push(`% Generated      : ${generatedOn}`);
  L.push("%");
  L.push("% The spacecraft below is exactly what was built in the game:");
  L.push(`%   Dry mass    ${dry} kg`);
  L.push(`%   Propellant  ${fuel} kg`);
  L.push(`%   Engine      ${engine?.name ?? "unknown"}, Isp ${isp} s`);
  L.push(
    `%   Instruments ${instruments.length > 0 ? instruments.map((i) => i.name).join(", ") : "none"}`,
  );
  L.push(`%   Departure   ${num(burnKmS, 3)} km/s from the spacecraft's own engine`);
  L.push(rule);
  L.push("");

  /* -------------------------------------------------------- spacecraft */
  L.push("%----------------------------------------");
  L.push("%---------- Spacecraft");
  L.push("%----------------------------------------");
  L.push("");
  L.push(`Create Spacecraft ${sc};`);
  L.push(`GMAT ${sc}.DateFormat = ${gmat.dateFormat};`);
  L.push(`GMAT ${sc}.Epoch = '${gmat.epoch}';`);
  L.push(`GMAT ${sc}.CoordinateSystem = EarthMJ2000Eq;`);
  L.push(`GMAT ${sc}.DisplayStateType = Keplerian;`);
  L.push(`% A circular parking orbit ${body.parkingAltitudeKm} km above Earth, which is`);
  L.push("% where a real mission waits before its departure burn.");
  L.push(`GMAT ${sc}.SMA = ${num(sma, 3)};`);
  L.push(`GMAT ${sc}.ECC = 0.001;`);
  L.push(`GMAT ${sc}.INC = ${num(body.inclinationDeg, 2)};`);
  L.push(`GMAT ${sc}.RAAN = 0;`);
  L.push(`GMAT ${sc}.AOP = 0;`);
  L.push(`GMAT ${sc}.TA = 0;`);
  L.push(`GMAT ${sc}.DryMass = ${dry};`);
  L.push(`GMAT ${sc}.Cd = ${num(gmat.coefficients.cd, 2)};`);
  L.push(`GMAT ${sc}.Cr = ${num(gmat.coefficients.cr, 2)};`);
  L.push(`GMAT ${sc}.DragArea = ${num(dragArea, 2)};`);
  L.push(`GMAT ${sc}.SRPArea = ${num(srpArea, 2)};`);
  L.push(`GMAT ${sc}.Tanks = {MainTank};`);
  L.push(`GMAT ${sc}.Thrusters = {MainEngine};`);
  L.push("");

  /* ------------------------------------------------------------ hardware */
  L.push("%----------------------------------------");
  L.push("%---------- Hardware");
  L.push("%----------------------------------------");
  L.push("");
  L.push("Create ChemicalTank MainTank;");
  L.push(`GMAT MainTank.FuelMass = ${fuel};`);
  L.push("GMAT MainTank.AllowNegativeFuelMass = false;");
  L.push("");
  L.push("Create ChemicalThruster MainEngine;");
  L.push("GMAT MainEngine.Tank = {MainTank};");
  L.push(`% Isp from the engine chosen in the game. ${isp} s is a real figure for`);
  L.push(`% a ${engine?.burnProfile === "continuous" ? "gridded ion" : "bipropellant chemical"} engine.`);
  L.push(`GMAT MainEngine.DecrementMass = true;`);
  L.push(`GMAT MainEngine.Isp = ${isp};`);
  L.push("");

  /* --------------------------------------------------------- force model */
  L.push("%----------------------------------------");
  L.push("%---------- Force model and propagator");
  L.push("%----------------------------------------");
  L.push("");
  L.push("Create ForceModel MissionForces;");
  L.push("GMAT MissionForces.CentralBody = Earth;");
  L.push("GMAT MissionForces.PrimaryBodies = {Earth};");
  L.push(`GMAT MissionForces.PointMasses = {${pointMasses.join(", ")}};`);
  L.push("GMAT MissionForces.SRP = On;");
  L.push("GMAT MissionForces.Drag.AtmosphereModel = None;");
  L.push(`GMAT MissionForces.GravityField.Earth.Degree = ${body.gravityDegree || 8};`);
  L.push(`GMAT MissionForces.GravityField.Earth.Order = ${body.gravityOrder || 8};`);
  L.push("");
  L.push("Create Propagator MissionProp;");
  L.push("GMAT MissionProp.FM = MissionForces;");
  L.push(`GMAT MissionProp.Type = ${gmat.propagator.type};`);
  L.push(`GMAT MissionProp.InitialStepSize = ${gmat.propagator.initialStepSize};`);
  L.push(`GMAT MissionProp.Accuracy = ${gmat.propagator.accuracy};`);
  L.push(`GMAT MissionProp.MinStep = ${gmat.propagator.minStep};`);
  L.push(`GMAT MissionProp.MaxStep = ${gmat.propagator.maxStep};`);
  L.push("");

  /* --------------------------------------------------------------- burn */
  L.push("%----------------------------------------");
  L.push("%---------- Departure burn");
  L.push("%----------------------------------------");
  L.push("");
  L.push("% The rocket does most of the work getting off Earth; this is the Δv the");
  L.push("% spacecraft's own engine has to find, which is what the game makes you");
  L.push("% buy fuel for. Along the velocity vector, so it raises the orbit.");
  L.push("Create ImpulsiveBurn DepartureBurn;");
  L.push("GMAT DepartureBurn.CoordinateSystem = Local;");
  L.push("GMAT DepartureBurn.Origin = Earth;");
  L.push("GMAT DepartureBurn.Axes = VNB;");
  L.push(`GMAT DepartureBurn.Element1 = ${num(burnKmS, 4)};`);
  L.push("GMAT DepartureBurn.Element2 = 0;");
  L.push("GMAT DepartureBurn.Element3 = 0;");
  L.push("GMAT DepartureBurn.DecrementMass = true;");
  L.push("GMAT DepartureBurn.Tank = {MainTank};");
  L.push(`GMAT DepartureBurn.Isp = ${isp};`);
  L.push("");

  /* ------------------------------------------------------------ outputs */
  L.push("%----------------------------------------");
  L.push("%---------- Output");
  L.push("%----------------------------------------");
  L.push("");
  if (gmat.output.orbitView) {
    const shown = ["Earth", ...pointMasses.filter((pm) => pm !== "Earth")];
    L.push("Create OrbitView MissionView;");
    L.push(`GMAT MissionView.Add = {${sc}, ${shown.join(", ")}};`);
    L.push("GMAT MissionView.CoordinateSystem = EarthMJ2000Eq;");
    L.push("GMAT MissionView.ViewPointReference = Earth;");
    L.push("GMAT MissionView.ViewUpAxis = Z;");
    L.push("");
  }
  if (gmat.output.reportFile) {
    L.push("Create ReportFile MissionReport;");
    L.push(`GMAT MissionReport.Filename = 'AstroVoyage_${gmatName(scenario.name)}.txt';`);
    L.push(
      `GMAT MissionReport.Add = {${gmat.output.reportVariables.map((v) => `${sc}.${v}`).join(", ")}};`,
    );
    L.push("GMAT MissionReport.WriteHeaders = true;");
    L.push("");
  }

  /* -------------------------------------------------- mission sequence */
  L.push("%----------------------------------------");
  L.push("%---------- Mission sequence");
  L.push("%----------------------------------------");
  L.push("");
  L.push("BeginMissionSequence;");
  L.push("");
  L.push("% One lap of the parking orbit first, so the plot shows where it started.");
  L.push(`Propagate MissionProp(${sc}) {${sc}.ElapsedDays = 0.1};`);
  L.push("");
  L.push("% Light the engine and go.");
  L.push(`Maneuver DepartureBurn(${sc});`);
  L.push("");
  L.push(
    `% Coast for the ${Math.round(days)} days the game says this trip to ${scenario.target} takes.`,
  );
  L.push(`Propagate MissionProp(${sc}) {${sc}.ElapsedDays = ${num(days, 2)}};`);
  L.push("");

  return L.join("\n");
}
