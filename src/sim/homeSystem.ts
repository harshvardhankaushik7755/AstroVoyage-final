/**
 * Laying out the little solar system that turns on the home page.
 *
 * Pure maths, no React, so it can be tested. Two honest things and one
 * deliberate cheat, all of them in `homeSystem.json` rather than here:
 *
 *  - the ORDER of the speeds is real. Every lap time comes from the body's
 *    true orbit in days, so Earth really does outrun Mars and Mars really
 *    does outrun Jupiter;
 *  - the ORDER of the distances is real too;
 *  - but the range of both is squashed. At true scale Earth would sit inside
 *    the Sun's glow and Jupiter would take an eleven-minute lap, which is a
 *    picture of nothing. Distances are spaced by the square root of AU and
 *    lap times are raised to a power under 1.
 */
import type { HomeBody, HomeSystemConfig } from "../data/game";

/**
 * How long one lap takes on screen, in seconds, for a body whose real orbit
 * is `orbitDays`. Earth comes out at exactly `earthLapSeconds`.
 */
export function lapSeconds(orbitDays: number, config: HomeSystemConfig): number {
  const { earthLapSeconds, compression } = config.time;
  const yearsOfEarth = orbitDays / 365.25;
  return earthLapSeconds * Math.pow(yearsOfEarth, compression);
}

/**
 * Where a ring sits, in the drawing's own units, for a body `au` from the Sun.
 * Square-root spacing: the gaps shrink as you go out, which is the only way to
 * fit 1 AU and 5.2 AU in one picture and still see both.
 */
export function orbitRadius(
  au: number,
  config: HomeSystemConfig,
  bounds: { minAU: number; maxAU: number; span: number },
): number {
  const { innerShare, outerShare } = config.orbit;
  const inner = innerShare * bounds.span;
  const outer = outerShare * bounds.span;

  const low = Math.sqrt(bounds.minAU);
  const high = Math.sqrt(bounds.maxAU);
  // One body only, or all at the same distance: park it on the inner ring.
  if (high - low < 1e-9) return inner;

  const share = (Math.sqrt(au) - low) / (high - low);
  return inner + share * (outer - inner);
}

export interface LaidOutMoon {
  label: string;
  radius: number;
  distance: number;
  lapSeconds: number;
  startAngle: number;
  color: string;
}

export interface LaidOutBody {
  id: string;
  label: string;
  au: number;
  orbitDays: number;
  /** The dashed ring it rides, in drawing units from the Sun. */
  orbitRadius: number;
  /** One lap, in real seconds. */
  lapSeconds: number;
  radius: number;
  color: string;
  glowColor: string;
  bandColor?: string;
  bands?: number;
  startAngle: number;
  moon?: LaidOutMoon;
}

export interface LaidOutProbe {
  label: string;
  orbitRadius: number;
  lapSeconds: number;
  size: number;
  color: string;
  startAngle: number;
}

export interface HomeSystemLayout {
  width: number;
  height: number;
  cx: number;
  cy: number;
  sun: {
    radius: number;
    glowRadius: number;
    coreColor: string;
    color: string;
    glowColor: string;
  };
  bodies: LaidOutBody[];
  probe: LaidOutProbe;
  /** Every dashed ring to draw, innermost first. */
  rings: number[];
  /** The plain-English line a screen reader hears instead of the picture. */
  label: string;
}

/** Everything the home page's orrery needs, worked out once. */
export function buildHomeSystem(config: HomeSystemConfig): HomeSystemLayout {
  const { width, height, centerXShare, centerYShare, marginShare } = config.view;

  const distances = [...config.bodies.map((body) => body.au), config.probe.au];
  const bounds = {
    minAU: Math.min(...distances),
    maxAU: Math.max(...distances),
    span: (Math.min(width, height) / 2) * (1 - marginShare),
  };

  const angleOf = (key: string) => config.startAngles[key] ?? 0;

  const bodies: LaidOutBody[] = config.bodies.map((body: HomeBody) => ({
    id: body.id,
    label: body.label,
    au: body.au,
    orbitDays: body.orbitDays,
    orbitRadius: orbitRadius(body.au, config, bounds),
    lapSeconds: lapSeconds(body.orbitDays, config),
    radius: body.radius,
    color: body.color,
    glowColor: body.glowColor,
    bandColor: body.bandColor,
    bands: body.bands,
    startAngle: angleOf(body.id),
    moon: body.moon && {
      label: body.moon.label,
      radius: body.moon.radius,
      distance: body.moon.distance,
      lapSeconds: lapSeconds(body.moon.orbitDays, config),
      startAngle: angleOf("moon"),
      color: body.moon.color,
    },
  }));

  const probe: LaidOutProbe = {
    label: config.probe.label,
    orbitRadius: orbitRadius(config.probe.au, config, bounds),
    lapSeconds: lapSeconds(config.probe.orbitDays, config),
    size: config.probe.size,
    color: config.probe.color,
    startAngle: angleOf("probe"),
  };

  const rings = [...bodies.map((body) => body.orbitRadius), probe.orbitRadius].sort(
    (a, b) => a - b,
  );

  const names = bodies.map((body) => body.label).join(", ");
  const label = `The Sun with ${names} going round it, and ${probe.label}.`;

  return {
    width,
    height,
    cx: width * centerXShare,
    cy: height * centerYShare,
    sun: {
      radius: config.sun.radius,
      glowRadius: config.sun.glowRadius,
      coreColor: config.sun.coreColor,
      color: config.sun.color,
      glowColor: config.sun.glowColor,
    },
    bodies,
    probe,
    rings,
    label,
  };
}
