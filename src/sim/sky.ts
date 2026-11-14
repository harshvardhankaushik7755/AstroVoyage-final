/**
 * The decorative sky behind the mission.
 *
 * Seeded, so it is the same every run and a screenshot can be reproduced, and
 * pure, so it can be tested without a browser. Two rules it has to obey:
 *
 *  - Nothing decorative may sit in the middle of the map, because that is
 *    where the Sun, the planets and the spacecraft are drawn.
 *  - The galaxies have to be spread out. Picking a random point and rejecting
 *    it until it lands in a corner fails badly — with a big keep-out circle
 *    most tries are rejected and the few that survive cluster together. So a
 *    corner is chosen first, then a point inside it.
 */
import type { SkyConfig } from "../data/game";
import { nextRandom } from "./simulation";

export interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  /** True for the few stars drawn with a faint colour instead of white. */
  tinted: boolean;
}

export interface Blob {
  x: number;
  y: number;
  r: number;
  opacity: number;
}

export interface Sky {
  width: number;
  height: number;
  stars: Star[];
  galaxies: Blob[];
  nebulae: Blob[];
  band: {
    /** The Milky Way band as a line through the middle of the picture. */
    angleDeg: number;
    width: number;
    opacity: number;
    color: string;
    edgeColor: string;
  };
}

/** A little random-number helper that carries its own state. */
function stream(seed: number) {
  let state = seed;
  return () => {
    const [value, next] = nextRandom(state);
    state = next;
    return value;
  };
}

/** Distance from the middle of the picture. */
function fromCentre(x: number, y: number, width: number, height: number): number {
  const dx = x - width / 2;
  const dy = y - height / 2;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * A point inside one of the four corners.
 *
 * `index` picks the corner, so successive calls walk round the picture instead
 * of landing in the same place.
 */
function cornerPoint(
  index: number,
  width: number,
  height: number,
  cornerShare: number,
  random: () => number,
): { x: number; y: number } {
  const boxW = width * cornerShare;
  const boxH = height * cornerShare;
  const left = index % 2 === 0;
  const top = Math.floor(index / 2) % 2 === 0;
  return {
    x: left ? random() * boxW : width - random() * boxW,
    y: top ? random() * boxH : height - random() * boxH,
  };
}

export function buildSky(width: number, height: number, config: SkyConfig): Sky {
  const random = stream(config.seed);
  const keepOut = Math.min(width, height) * config.edge.keepOutRadiusShare;

  /* ---------------------------------------------------------------- stars */
  const stars: Star[] = [];
  const bandRadians = (config.milkyWay.angleDeg * Math.PI) / 180;
  const bandHalfWidth = (Math.min(width, height) * config.milkyWay.widthShare) / 2;

  for (let i = 0; i < config.stars.count; i += 1) {
    let x: number;
    let y: number;

    if (random() < config.stars.shareInBand) {
      // Along the Milky Way: walk the band's line, then step sideways from it.
      const along = (random() - 0.5) * Math.hypot(width, height);
      const across = (random() - 0.5) * 2 * bandHalfWidth;
      x = width / 2 + Math.cos(bandRadians) * along - Math.sin(bandRadians) * across;
      y = height / 2 + Math.sin(bandRadians) * along + Math.cos(bandRadians) * across;
    } else {
      x = random() * width;
      y = random() * height;
    }

    // A star just outside the picture is simply dropped; there are plenty.
    if (x < 0 || x > width || y < 0 || y > height) continue;

    stars.push({
      x,
      y,
      size: config.stars.minSize + random() * (config.stars.maxSize - config.stars.minSize),
      opacity:
        config.stars.minOpacity + random() * (config.stars.maxOpacity - config.stars.minOpacity),
      tinted: random() < config.stars.tintChance,
    });
  }

  /* ------------------------------------------------------------ galaxies */
  const galaxies: Blob[] = [];
  for (let i = 0; i < config.galaxies.count; i += 1) {
    const { x, y } = cornerPoint(i, width, height, config.edge.cornerShare, random);
    if (fromCentre(x, y, width, height) < keepOut) continue;
    galaxies.push({
      x,
      y,
      r: config.galaxies.minRadius + random() * (config.galaxies.maxRadius - config.galaxies.minRadius),
      opacity: config.galaxies.opacity,
    });
  }

  /* ------------------------------------------------------------- nebulae */
  const nebulae: Blob[] = [];
  for (let i = 0; i < config.nebulae.count; i += 1) {
    const margin = Math.min(width, height) * config.edge.marginShare;
    // Nebulae are large and soft, so they sit along an edge rather than a corner.
    const onSide = i % 2 === 0;
    const x = onSide ? margin + random() * (width * 0.2) : width - margin - random() * (width * 0.2);
    const y = margin + random() * (height - margin * 2);
    if (fromCentre(x, y, width, height) < keepOut) continue;
    nebulae.push({
      x,
      y,
      r: config.nebulae.minRadius + random() * (config.nebulae.maxRadius - config.nebulae.minRadius),
      opacity: config.nebulae.opacity,
    });
  }

  return {
    width,
    height,
    stars,
    galaxies,
    nebulae,
    band: {
      angleDeg: config.milkyWay.angleDeg,
      width: bandHalfWidth * 2,
      opacity: config.milkyWay.opacity,
      color: config.milkyWay.color,
      edgeColor: config.milkyWay.edgeColor,
    },
  };
}
