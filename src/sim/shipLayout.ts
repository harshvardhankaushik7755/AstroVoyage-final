/**
 * Turns a design into shapes.
 *
 * The spacecraft drawn on the map and on the challenge card is the one the
 * player built, and every size here comes from a real number in the design:
 * the bus from its mass, the panels from the watts they make, the dish from
 * its data rate, and one sensor box per instrument. Choose the big dish and
 * the dish on screen gets bigger.
 *
 * Pure geometry, no React, so it can be tested on its own. Units are "ship
 * units" — the component that draws it decides how big one unit is.
 */
import type { Design, ShipPart } from "../data/game";
import { findAntenna, findBody, findEngine, findInstruments, findPower } from "../data/game";

/** Drawing a fourth sensor box makes the sprite mush, so three is the limit. */
export const MAX_DRAWN_INSTRUMENTS = 3;

export interface Panel {
  /** How far the wing reaches out from the bus. */
  length: number;
  width: number;
}

export interface ShipLayout {
  /** The main box. The ship points along +x, with the bus centred on the origin. */
  bus: { w: number; h: number };
  /** Two solar wings, or null when the power source is a nuclear battery. */
  panel: Panel | null;
  /** True when power comes from an RTG, which is drawn as a small finned cylinder. */
  rtg: boolean;
  /** The radio dish, at the front. */
  dish: { r: number };
  /** One box per instrument, up to three. */
  sensors: { size: number }[];
  /** The engine bell, at the back. */
  nozzle: { w: number; h: number };
  /** How many instruments the design carries, even if not all are drawn. */
  instrumentCount: number;
  /** The whole sprite's extent, used to scale it into a box. */
  width: number;
  height: number;
}

export function shipLayout(design: Design): ShipLayout {
  const body = findBody(design.bodyId);
  const power = findPower(design.powerId);
  const antenna = findAntenna(design.antennaId);
  const engine = findEngine(design.engineId);
  const instruments = findInstruments(design.instrumentIds);

  // Mass grows as a volume, so the cube root keeps a 1000 kg bus from being
  // four times the size of a 250 kg one.
  const busSize = Math.cbrt(body?.mass ?? 250) * 1.55;
  const bus = { w: busSize, h: busSize * 0.78 };

  const isRtg = power?.type === "rtg";
  const panel: Panel | null =
    power && !isRtg
      ? // Watts scale with area, so the square root gives the length of a wing.
        { length: Math.sqrt(power.powerAt1AU) * 0.37, width: busSize * 0.42 }
      : null;

  // A dish's gain goes with its area, so data rate under a square root again.
  const dish = { r: Math.sqrt(antenna?.dataRate ?? 4) * 0.85 + 1 };

  const sensorSize = Math.cbrt(body?.mass ?? 250) * 0.8;
  const sensors = instruments
    .slice(0, MAX_DRAWN_INSTRUMENTS)
    .map(() => ({ size: sensorSize }));

  const nozzleScale = engine?.burnProfile === "continuous" ? 0.5 : 0.8;
  const nozzle = { w: busSize * 0.34, h: busSize * nozzleScale };

  const halfHeight = Math.max(
    bus.h / 2,
    panel ? panel.length + bus.h / 2 : 0,
    sensors.length > 0 ? bus.h / 2 + sensorSize : 0,
  );

  return {
    bus,
    panel,
    rtg: isRtg,
    dish,
    sensors,
    nozzle,
    instrumentCount: instruments.length,
    width: bus.w + dish.r * 2 + nozzle.w,
    height: halfHeight * 2,
  };
}

/** How many pixels one ship unit should be, to fit a sprite into `box` pixels. */
export function spriteScale(layout: ShipLayout, box: number): number {
  const longest = Math.max(layout.width, layout.height);
  if (longest <= 0) return 1;
  return box / longest;
}

/** Radius of the soft glow drawn behind the sprite on the map. */
export function spriteHaloRadius(layout: ShipLayout): number {
  return Math.max(layout.width, layout.height) * 0.32;
}

/** Where the engine plume starts, in ship units from the origin. */
export function spriteTailX(layout: ShipLayout): number {
  return -(layout.bus.w / 2 + layout.nozzle.h);
}

/** The player-facing name of a part, for "the dust got on your {x}" messages. */
export function partName(design: Design, part: ShipPart): string {
  switch (part) {
    case "body":
      return findBody(design.bodyId)?.name ?? "spacecraft body";
    case "power":
      return findPower(design.powerId)?.name ?? "power source";
    case "antenna":
      return findAntenna(design.antennaId)?.name ?? "antenna";
    case "engine":
      return findEngine(design.engineId)?.name ?? "engine";
    case "instruments": {
      const instruments = findInstruments(design.instrumentIds);
      if (instruments.length === 0) return "instruments";
      if (instruments.length === 1) return instruments[0].name;
      return `${instruments[0].name} and ${instruments.length - 1} more`;
    }
  }
}
