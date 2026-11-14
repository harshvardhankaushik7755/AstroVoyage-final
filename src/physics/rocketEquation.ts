/**
 * The Tsiolkovsky rocket equation — the one formula that decides whether a
 * design can make its trip.
 *
 *     Δv = Isp × g₀ × ln(m₀ / mf)
 *
 * m₀ is the mass at the start (dry spacecraft + fuel), mf the mass once the
 * fuel is gone. Isp is in seconds and g₀ is standard gravity, so the result is
 * in m/s; everything the player sees is in km/s, which is what the scenarios
 * are written in.
 *
 * NASA Glenn, Beginner's Guide to Rockets: https://www.grc.nasa.gov/WWW/K-12/rocket/
 *
 * No React in this file, on purpose — it is all pure arithmetic and tested as such.
 */
import type { Design } from "../data/game";
import { findAntenna, findBody, findEngine, findInstruments, findPower } from "../data/game";

/** Standard gravity, m/s². The constant the rocket equation is defined with. */
export const G0 = 9.80665;

/**
 * The Δv a stage can deliver, in km/s.
 * Returns 0 rather than a negative or infinite number if the masses make no sense.
 */
export function deltaV(isp: number, wetMassKg: number, dryMassKg: number): number {
  if (isp <= 0 || dryMassKg <= 0 || wetMassKg <= dryMassKg) return 0;
  const metresPerSecond = isp * G0 * Math.log(wetMassKg / dryMassKg);
  return metresPerSecond / 1000;
}

/**
 * The fuel, in kg, needed to get `deltaVKmS` out of a spacecraft that masses
 * `dryMassKg` empty. This is the rocket equation turned around:
 *
 *     mfuel = mf × (e^(Δv / (Isp × g₀)) − 1)
 */
export function fuelForDeltaV(isp: number, dryMassKg: number, deltaVKmS: number): number {
  if (isp <= 0 || dryMassKg <= 0 || deltaVKmS <= 0) return 0;
  const ratio = Math.exp((deltaVKmS * 1000) / (isp * G0));
  return dryMassKg * (ratio - 1);
}

/** The spacecraft's mass with no fuel on board, in kg. The rocket is not part of it. */
export function dryMass(design: Design): number {
  const body = findBody(design.bodyId);
  const power = findPower(design.powerId);
  const antenna = findAntenna(design.antennaId);
  const engine = findEngine(design.engineId);
  const instruments = findInstruments(design.instrumentIds);

  return (
    (body?.mass ?? 0) +
    (power?.mass ?? 0) +
    (antenna?.mass ?? 0) +
    (engine?.mass ?? 0) +
    instruments.reduce((total, instrument) => total + instrument.mass, 0)
  );
}

/** Dry mass plus the fuel the player has loaded, in kg. This is what the rocket must lift. */
export function wetMass(design: Design): number {
  return dryMass(design) + Math.max(0, design.fuelKg);
}

/** The Δv this design can actually deliver with the fuel on board, in km/s. */
export function designDeltaV(design: Design): number {
  const engine = findEngine(design.engineId);
  if (!engine) return 0;
  return deltaV(engine.isp, wetMass(design), dryMass(design));
}

/**
 * The fuel this design needs for a given Δv, in kg, rounded up to the next
 * whole kilogram so the answer is never a hair short of enough.
 */
export function fuelNeeded(design: Design, deltaVKmS: number): number {
  const engine = findEngine(design.engineId);
  if (!engine) return 0;
  return Math.ceil(fuelForDeltaV(engine.isp, dryMass(design), deltaVKmS));
}
