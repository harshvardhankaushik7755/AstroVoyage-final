/**
 * Turning the mission into pixels.
 *
 * Kept out of the screen component so the geometry can be tested without a
 * browser: where the bodies are, where the spacecraft is, how much of its path
 * it has flown, and how long a scale bar has to be to mean something.
 */
import type { SimState } from "./simulation";
import { coastAngles, planetAngle, progressOf, transferPath, transferPosition } from "./simulation";

export interface Point {
  x: number;
  y: number;
}

export interface MapGeometry {
  /** The central body, in pixels. */
  cx: number;
  cy: number;
  /** Pixels per AU. */
  k: number;
  /** The orbit circles. */
  startRadiusPx: number;
  targetRadiusPx: number;
  /** The departure body — Earth, or the point the spacecraft left from. */
  earth: Point;
  target: Point;
  ship: Point;
  /** The whole planned transfer, in pixels. */
  pathPx: Point[];
  /** How many of those points have been flown. */
  flown: number;
  /** The arc the spacecraft rides after arrival, so its trail never stops dead. */
  coastPath: Point[];
  scaleBar: { px: number; label: string };
}

/** Kilometres in one astronomical unit. */
const KM_PER_AU = 149_597_871;

/** Round numbers that make a sensible scale bar. */
const NICE_AU = [
  0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5,
];

/**
 * The longest round distance that still fits in about a quarter of the map,
 * with a label in whichever unit reads better.
 */
export function scaleBar(pxPerAU: number, viewWidth: number): { px: number; label: string } {
  const budget = viewWidth * 0.26;
  let chosen = NICE_AU[0];
  for (const candidate of NICE_AU) {
    if (candidate * pxPerAU <= budget) chosen = candidate;
  }

  // Below a hundredth of an AU, kilometres mean more than a decimal of an AU.
  const label =
    chosen < 0.01
      ? `${Math.round((chosen * KM_PER_AU) / 1000).toLocaleString("en-GB")} thousand km`
      : `${chosen} AU`;

  return { px: chosen * pxPerAU, label };
}

/** A point on a circle of radius r (px) at angle a, about the map centre. */
function onCircle(cx: number, cy: number, r: number, a: number): Point {
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
}

/** An arc of points, for the orbit the spacecraft rides after arrival. */
export function arcPoints(
  centre: Point,
  radius: number,
  fromAngle: number,
  sweep: number,
  steps = 48,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= steps; i += 1) {
    points.push(onCircle(centre.x, centre.y, radius, fromAngle + (sweep * i) / steps));
  }
  return points;
}

/**
 * Work out the whole picture.
 *
 * `coastDays` is how long ago the mission arrived. Past zero, the bodies are
 * advanced to that day, so the planets keep moving after a successful arrival
 * and the spacecraft rides round the one it reached. Nothing in space stops.
 */
export function mapGeometry(
  sim: SimState,
  viewWidth: number,
  viewHeight: number,
  coastDays = 0,
): MapGeometry {
  const config = sim.config;

  const angles =
    coastDays > 0
      ? coastAngles(sim, coastDays)
      : {
          earthAngleRad: planetAngle("earth", sim.missionDay, config, sim.totalDays),
          targetAngleRad: planetAngle("target", sim.missionDay, config, sim.totalDays),
        };

  const rMaxAU = Math.max(config.startRadiusAU, config.targetOrbitRadiusAU) * 1.12;
  const k = (Math.min(viewWidth, viewHeight) * 0.42) / rMaxAU;

  const cx = viewWidth / 2;
  const cy = viewHeight / 2;
  const centre: Point = { x: cx, y: cy };

  const startRadiusPx = config.startRadiusAU * k;
  const targetRadiusPx = config.targetOrbitRadiusAU * k;

  const earth = onCircle(cx, cy, startRadiusPx, angles.earthAngleRad);
  const target = onCircle(cx, cy, targetRadiusPx, angles.targetAngleRad);

  /* ---- the planned transfer, as pixels */
  const path = transferPath(config.startRadiusAU, config.targetOrbitRadiusAU, 90);
  const pathPx = path.map((point) =>
    onCircle(cx, cy, point.r * k, sim.startAngleRad + point.nu),
  );

  const progress = progressOf(sim);
  const flown = Math.round(progress * (pathPx.length - 1));

  /* ---- where the spacecraft is */
  let ship: Point;
  if (sim.phase === "orbit") {
    // In orbit: riding round the target, a little way off it.
    const orbitRadius = Math.max(6, targetRadiusPx * 0.06 + 8);
    const riding = (2 * Math.PI * coastDays) / Math.max(1, config.targetOrbitDays / 12);
    ship = onCircle(target.x, target.y, orbitRadius, angles.targetAngleRad + riding);
  } else {
    const here = transferPosition(progress, config.startRadiusAU, config.targetOrbitRadiusAU);
    ship = onCircle(cx, cy, here.r * k, sim.startAngleRad + here.nu);
  }

  /* ---- the trail must not stop dead at the arrival point, so once in orbit
          it carries on round the target as an arc. */
  const coastPath =
    sim.phase === "orbit" && coastDays > 0
      ? arcPoints(
          centre,
          targetRadiusPx,
          planetAngle("target", sim.missionDay, config, sim.totalDays),
          (2 * Math.PI * coastDays) / config.targetOrbitDays,
        )
      : [];

  return {
    cx,
    cy,
    k,
    startRadiusPx,
    targetRadiusPx,
    earth,
    target,
    ship,
    pathPx,
    flown,
    coastPath,
    scaleBar: scaleBar(k, viewWidth),
  };
}
