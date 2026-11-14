/**
 * Power. Sunlight obeys the inverse-square law, which is the whole reason
 * solar panels are a bad idea at Jupiter and an RTG is worth its price.
 *
 *     power at distance d (AU) = power at 1 AU ÷ d²
 *
 * Planet distances: NASA NSSDCA Planetary Fact Sheets
 * https://nssdc.gsfc.nasa.gov/planetary/planetfact.html
 */
import type { Design, PowerSource } from "../data/game";
import { findAntenna, findEngine, findInstruments, findPower } from "../data/game";

/**
 * The share of Earth's sunlight that reaches a given distance from the Sun.
 * 1 at Earth, about 0.43 at Mars, about 0.037 at Jupiter.
 */
export function sunlightFactor(distanceAU: number): number {
  if (distanceAU <= 0) return 0;
  return 1 / (distanceAU * distanceAU);
}

/**
 * The watts a power source makes at a given distance from the Sun.
 * An RTG makes its heat from decay, not from sunlight, so distance changes nothing.
 */
export function powerAvailable(source: PowerSource, distanceAU: number): number {
  if (source.type === "rtg") return source.powerAt1AU;
  return source.powerAt1AU * sunlightFactor(distanceAU);
}

/**
 * The watts a design needs with everything running: instruments, the antenna
 * transmitting, and an electric engine if one is fitted.
 */
export function powerNeeded(design: Design): number {
  const antenna = findAntenna(design.antennaId);
  const engine = findEngine(design.engineId);
  const instruments = findInstruments(design.instrumentIds);

  return (
    instruments.reduce((total, instrument) => total + instrument.power, 0) +
    (antenna?.power ?? 0) +
    (engine?.powerNeed ?? 0)
  );
}

/** The watts this design will have at the target. */
export function powerAtTarget(design: Design, distanceAU: number): number {
  const source = findPower(design.powerId);
  if (!source) return 0;
  return powerAvailable(source, distanceAU);
}

/**
 * Watts spare at the target. Negative means the spacecraft cannot run
 * everything it carries once it arrives.
 */
export function powerMargin(design: Design, distanceAU: number): number {
  return powerAtTarget(design, distanceAU) - powerNeeded(design);
}
