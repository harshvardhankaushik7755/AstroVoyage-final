/**
 * What picking this part would actually do to *this* mission.
 *
 * The point is that no part is good or bad on its own. The same solar panels
 * read "makes about 600 W at the Moon" and "makes about 22 W at Jupiter", and
 * the small antenna goes from getting all of the science home to a tenth of
 * it. Every line here is worked out from the physics, not written by hand.
 */
import type { Design, PartGroup, Route, Scenario } from "../data/game";
import {
  findAntenna,
  findBody,
  findEngine,
  findPower,
  findRocket,
  parts,
} from "../data/game";
import { designDeltaV, dryMass, wetMass } from "./rocketEquation";
import { powerAvailable, powerNeeded } from "./power";
import { scienceShareHome } from "./comms";
import { spacecraftDeltaVNeeded } from "./checks";

/** A part choice, described for the mission in front of the player. */
export interface PartEffect {
  /** The headline: what this part does here. */
  effect: string;
  /** How it compares with what is chosen now, when that is worth saying. */
  compare?: string;
}

function round(value: number): number {
  return Math.round(value);
}

/**
 * Describe what `partId` in `group` would do, given the rest of `design`.
 * Returns null for an id that is not in the data.
 */
export function partEffect(
  group: PartGroup,
  partId: string,
  design: Design,
  scenario: Scenario,
  route: Route,
): PartEffect | null {
  switch (group) {
    case "body": {
      const body = findBody(partId);
      if (!body) return null;
      const room = body.slots === 1 ? "1 instrument" : `${body.slots} instruments`;
      return {
        effect: body.backup
          ? `Room for ${room}, and backup systems that survive a solar storm.`
          : `Room for ${room}. No backup systems.`,
        compare: `Weighs ${body.mass} kg and costs $${body.cost}M.`,
      };
    }

    case "instruments": {
      const instrument = parts.instruments.find((i) => i.id === partId);
      if (!instrument) return null;
      return {
        effect: `${instrument.science} science points, and needs ${instrument.power} W to run.`,
        compare: `${instrument.note}. ${instrument.mass} kg, $${instrument.cost}M.`,
      };
    }

    case "power": {
      const source = findPower(partId);
      if (!source) return null;
      const here = powerAvailable(source, scenario.distanceAU);
      const need = powerNeeded(design);
      const enough = here >= need;
      return {
        effect: `Makes about ${round(here)} W at ${scenario.target}.`,
        compare: enough
          ? `Your spacecraft needs ${round(need)} W, so that is enough.`
          : `Your spacecraft needs ${round(need)} W, so that is ${round(need - here)} W short.`,
      };
    }

    case "antenna": {
      const antenna = findAntenna(partId);
      if (!antenna) return null;
      const share = scienceShareHome(antenna, scenario);
      return {
        effect: `${round(share * 100)}% of your science reaches Earth from ${scenario.target}.`,
        compare: `${antenna.dataRate} kbps, ${antenna.mass} kg, and needs ${antenna.power} W to transmit.`,
      };
    }

    case "engine": {
      const engine = findEngine(partId);
      if (!engine) return null;
      const withThis = designDeltaV({ ...design, engineId: engine.id });
      const need = spacecraftDeltaVNeeded({ ...design, engineId: engine.id }, scenario, route);
      const line =
        design.fuelKg > 0
          ? `Gives ${withThis.toFixed(2)} km/s with the fuel you have loaded.`
          : `Isp ${engine.isp} s. Load some fuel to see the Δv.`;
      return {
        effect: line,
        compare:
          engine.powerNeed > 0
            ? `Needs ${engine.powerNeed} W to run, and this trip needs ${need.toFixed(2)} km/s.`
            : `This trip needs ${need.toFixed(2)} km/s from the spacecraft.`,
      };
    }

    case "rocket": {
      const rocket = findRocket(partId);
      if (!rocket) return null;
      const mass = wetMass(design);
      const fits = mass <= rocket.capacity;
      return {
        effect: `Lifts ${rocket.capacity} kg and gives the spacecraft ${rocket.deltaVProvided} km/s on the way out.`,
        compare: fits
          ? `Your spacecraft is ${round(mass)} kg, so it fits with ${round(rocket.capacity - mass)} kg spare.`
          : `Your spacecraft is ${round(mass)} kg — ${round(mass - rocket.capacity)} kg too heavy for this rocket.`,
      };
    }
  }
}

/**
 * The most fuel worth loading: whatever is left of the rocket's lift once the
 * spacecraft itself is on board. Used as the top of the fuel slider, so the
 * player cannot drag it somewhere the rocket could never go.
 */
export function maxFuelKg(design: Design): number {
  const rocket = findRocket(design.rocketId);
  if (!rocket) return 0;
  return Math.max(0, rocket.capacity - dryMass(design));
}

/**
 * The fuel this design needs to pass the fuel check, in kg — what the
 * "fill it up" button loads.
 */
export function recommendedFuelKg(design: Design, scenario: Scenario, route: Route): number {
  const engine = findEngine(design.engineId);
  if (!engine) return 0;
  const need = spacecraftDeltaVNeeded(design, scenario, route);
  if (need <= 0) return 0;
  const dry = dryMass(design);
  // The fuel check asks for a margin above the bare requirement, so aim at the
  // margin and not at the minimum, or the button would load a failing amount.
  const wanted = need * 1.2;
  const ratio = Math.exp((wanted * 1000) / (engine.isp * 9.80665));
  return Math.min(maxFuelKg(design), Math.ceil(dry * (ratio - 1)));
}
