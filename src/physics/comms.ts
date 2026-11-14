/**
 * Talking to Earth: how long a message takes, and how much of the science
 * actually gets home.
 *
 * Light crosses one AU in 8.317 minutes, so the delay each way is just the
 * distance in AU times that. Nothing can be done about it — it is why a
 * spacecraft has to be able to look after itself.
 *
 * NASA Deep Space Network Now: https://eyes.nasa.gov/apps/dsn-now/
 */
import type { Antenna, Scenario } from "../data/game";
import { findAntenna, parts } from "../data/game";

/** Minutes light takes to cross one astronomical unit. */
export const LIGHT_MINUTES_PER_AU = 8.317;

/** The slowest antenna in the game. Science shares are measured against this one. */
export const BASE_DATA_RATE = Math.min(...parts.antennas.map((a) => a.dataRate));

/**
 * How far the signal has to travel, in AU. For the Moon that is the distance
 * from Earth, not from the Sun — otherwise a Moon mission would appear to have
 * an eight-minute delay instead of a little over a second.
 */
export function commsDistanceAU(scenario: Scenario): number {
  return scenario.centralBody === "earth" ? scenario.targetOrbitRadiusAU : scenario.distanceAU;
}

/** One-way signal delay, in minutes. */
export function signalDelayMinutes(distanceAU: number): number {
  return Math.max(0, distanceAU) * LIGHT_MINUTES_PER_AU;
}

/** One-way signal delay for a mission, in minutes. */
export function missionDelayMinutes(scenario: Scenario): number {
  return signalDelayMinutes(commsDistanceAU(scenario));
}

/**
 * The delay as a short phrase a 12-year-old can read: "1.3 seconds",
 * "12.6 minutes", "1 hour 12 minutes".
 */
export function formatDelay(minutes: number): string {
  if (minutes < 1) {
    const seconds = minutes * 60;
    const rounded = seconds < 10 ? seconds.toFixed(1) : Math.round(seconds).toString();
    return `${rounded} seconds`;
  }
  if (minutes < 60) return `${minutes.toFixed(1)} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes - hours * 60);
  return rest === 0 ? `${hours} hour${hours > 1 ? "s" : ""}` : `${hours} hour ${rest} minutes`;
}

/**
 * The share of the science that reaches Earth, 0 to 1.
 *
 * A mission's `commsFactor` is what the slowest antenna manages at that
 * distance; a faster antenna scales it up by how much faster it is. The result
 * is capped at 1, because no antenna sends more science than was collected.
 *
 * So the small antenna gets 100% home from the Moon and 10% from Mars, and the
 * large dish — ten times the data rate — gets all of it home from Mars.
 */
export function scienceShareHome(antenna: Antenna, scenario: Scenario): number {
  const speedUp = antenna.dataRate / BASE_DATA_RATE;
  return Math.min(1, scenario.commsFactor * speedUp);
}

/** The same thing, for a whole design. Returns 0 if no antenna is fitted. */
export function designScienceShare(antennaId: string, scenario: Scenario): number {
  const antenna = findAntenna(antennaId);
  if (!antenna) return 0;
  return scienceShareHome(antenna, scenario);
}
