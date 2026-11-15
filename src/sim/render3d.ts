/**
 * A small 3D renderer, written here rather than imported.
 *
 * It is the same four steps every 3D engine takes, and all of them are plain
 * arithmetic you can check by hand:
 *
 *   1. ROTATE every corner about the up axis (yaw) and the across axis (pitch)
 *   2. CULL the faces pointing away from the camera, which can never be seen
 *   3. PROJECT what is left onto the screen, dividing by distance so things
 *      further away come out smaller — that is all perspective is
 *   4. SORT far-to-near and paint in that order, so near faces cover far ones
 *
 * Step 4 is the painter's algorithm. It is exact for a convex solid and good
 * enough for a spacecraft made of boxes, and it costs nothing but a sort.
 *
 * No canvas and no WebGL: it returns flat polygons and the component draws
 * them as SVG, which keeps every line of it testable.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Point2 {
  x: number;
  y: number;
}

/** A flat polygon in space, before anything has been done to it. */
export interface Face {
  /** Corners, counter-clockwise seen from outside, so the normal points out. */
  points: Vec3[];
  color: string;
  /** Which part of the spacecraft this belongs to, for labelling. */
  part: string;
  /** Lit from both sides: a solar panel is a sheet, not a solid. */
  twoSided?: boolean;
}

/** The same polygon, flattened and ready to draw. */
export interface DrawnFace {
  points: Point2[];
  color: string;
  part: string;
  /** How far the middle of it is from the camera. Bigger is further away. */
  depth: number;
  /** How much light it catches, 0 (facing the dark) to 1 (square to the Sun). */
  light: number;
}

export interface Camera {
  /** How far the eye sits from the middle of the model. */
  distance: number;
  /** Bigger is a longer lens: less perspective, more of a flat elevation. */
  fov: number;
  /** Anything closer than this is level with or behind the eye, and dropped. */
  near: number;
}

export interface Shading {
  /** How lit the darkest face still is, so nothing becomes a black hole. */
  ambient: number;
  /** How much the light adds on top of that. ambient + range should be 1. */
  range: number;
}

/* ------------------------------------------------------------- vector maths */

export const subtract = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});

export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

export const length = (v: Vec3): number => Math.hypot(v.x, v.y, v.z);

export function normalise(v: Vec3): Vec3 {
  const size = length(v);
  if (size < 1e-9) return { x: 0, y: 0, z: 0 };
  return { x: v.x / size, y: v.y / size, z: v.z / size };
}

/* ---------------------------------------------------------------- rotation */

/** Turn about the up axis: the model spins like a carousel. */
export function rotateY(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

/** Tip towards or away from the viewer. */
export function rotateX(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

/** Yaw first, then pitch. The other order tilts the axis it spins about. */
export const orient = (p: Vec3, yaw: number, pitch: number): Vec3 =>
  rotateX(rotateY(p, yaw), pitch);

/* -------------------------------------------------------------- projection */

/**
 * Flatten one point. The camera sits at (0, 0, distance) looking back at the
 * origin, so a point's distance from the eye is `distance - z`, and dividing
 * by that distance is what makes far things small.
 *
 * Returns null for anything level with or behind the eye.
 */
export function project(
  p: Vec3,
  camera: Camera,
  centre: Point2,
): (Point2 & { depth: number }) | null {
  const depth = camera.distance - p.z;
  if (depth < camera.near) return null;
  const scale = camera.fov / depth;
  // Screen y grows downwards and model y grows upwards, hence the minus.
  return { x: centre.x + p.x * scale, y: centre.y - p.y * scale, depth };
}

/* ----------------------------------------------------------------- shading */

/** The outward direction of a polygon, from its first three corners. */
export function faceNormal(points: Vec3[]): Vec3 {
  if (points.length < 3) return { x: 0, y: 0, z: 0 };
  return normalise(cross(subtract(points[1], points[0]), subtract(points[2], points[0])));
}

/** The middle of a polygon. */
export function centroid(points: Vec3[]): Vec3 {
  const total = points.reduce(
    (sum, p) => ({ x: sum.x + p.x, y: sum.y + p.y, z: sum.z + p.z }),
    { x: 0, y: 0, z: 0 },
  );
  const n = points.length || 1;
  return { x: total.x / n, y: total.y / n, z: total.z / n };
}

/**
 * How much light a face catches: full on when it faces the light, nothing when
 * it faces away, a straight cosine in between. This is Lambert's law, the same
 * rule that gives a planet its terminator.
 */
export function lambert(normal: Vec3, light: Vec3, shading: Shading): number {
  const facing = Math.max(0, dot(normal, normalise(light)));
  return shading.ambient + shading.range * facing;
}

/** A colour darkened to the light it catches, written as something CSS takes. */
export function shadeColor(color: string, light: number): string {
  const percent = Math.round(Math.min(1, Math.max(0, light)) * 100);
  return `color-mix(in srgb, ${color} ${percent}%, #05070f)`;
}

/* ------------------------------------------------------------ the whole job */

export interface RenderOptions {
  yaw: number;
  pitch: number;
  camera: Camera;
  light: Vec3;
  shading: Shading;
  centre: Point2;
}

/**
 * Rotate, cull, project, sort. The result comes back in the order it should be
 * drawn: furthest away first, so everything nearer paints over it.
 */
export function render(faces: Face[], options: RenderOptions): DrawnFace[] {
  const { yaw, pitch, camera, light, shading, centre } = options;
  const eye: Vec3 = { x: 0, y: 0, z: camera.distance };
  const drawn: DrawnFace[] = [];

  for (const face of faces) {
    const turned = face.points.map((p) => orient(p, yaw, pitch));
    let normal = faceNormal(turned);
    const middle = centroid(turned);

    // A solid's back faces can never be seen, so there is no point drawing
    // them. A sheet, like a solar panel, has no back to hide.
    const towardsEye = normalise(subtract(eye, middle));
    const facing = dot(normal, towardsEye);
    if (!face.twoSided && facing <= 0) continue;
    // A sheet seen from behind is lit by whatever falls on the side you see.
    if (face.twoSided && facing < 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };

    const flat = turned.map((p) => project(p, camera, centre));
    if (flat.some((point) => point === null)) continue;

    drawn.push({
      points: (flat as (Point2 & { depth: number })[]).map(({ x, y }) => ({ x, y })),
      color: face.color,
      part: face.part,
      depth: camera.distance - middle.z,
      light: lambert(normal, light, shading),
    });
  }

  // Painter's algorithm: furthest first.
  return drawn.sort((a, b) => b.depth - a.depth);
}

/** A polygon written as the `points` attribute of an SVG <polygon>. */
export function svgPoints(points: Point2[]): string {
  return points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

/* ------------------------------------------------------------ making shapes */

/**
 * The six faces of a box, each wound counter-clockwise seen from outside so
 * that `faceNormal` points away from the middle. Everything on the spacecraft
 * except the dish and the engine bell is one of these.
 */
export function boxFaces(
  centre: Vec3,
  size: { w: number; h: number; d: number },
  color: string,
  part: string,
): Face[] {
  const x = size.w / 2;
  const y = size.h / 2;
  const z = size.d / 2;
  const at = (dx: number, dy: number, dz: number): Vec3 => ({
    x: centre.x + dx * x,
    y: centre.y + dy * y,
    z: centre.z + dz * z,
  });

  const v = {
    backBottomLeft: at(-1, -1, -1),
    backBottomRight: at(1, -1, -1),
    backTopRight: at(1, 1, -1),
    backTopLeft: at(-1, 1, -1),
    frontBottomLeft: at(-1, -1, 1),
    frontBottomRight: at(1, -1, 1),
    frontTopRight: at(1, 1, 1),
    frontTopLeft: at(-1, 1, 1),
  };

  return [
    { points: [v.frontBottomLeft, v.frontBottomRight, v.frontTopRight, v.frontTopLeft], color, part },
    { points: [v.backBottomRight, v.backBottomLeft, v.backTopLeft, v.backTopRight], color, part },
    { points: [v.frontBottomRight, v.backBottomRight, v.backTopRight, v.frontTopRight], color, part },
    { points: [v.backBottomLeft, v.frontBottomLeft, v.frontTopLeft, v.backTopLeft], color, part },
    { points: [v.frontTopLeft, v.frontTopRight, v.backTopRight, v.backTopLeft], color, part },
    { points: [v.backBottomLeft, v.backBottomRight, v.frontBottomRight, v.frontBottomLeft], color, part },
  ];
}

/**
 * A cone or a truncated cone pointing along +x — the radio dish and the engine
 * bell. `baseRadius` is the mouth at `baseX`, `tipRadius` the far end at
 * `tipX`; a tip radius of zero makes a point.
 */
export function coneFaces(
  options: {
    baseX: number;
    baseRadius: number;
    tipX: number;
    tipRadius: number;
    sides: number;
    centre?: Vec3;
  },
  color: string,
  part: string,
): Face[] {
  const { baseX, baseRadius, tipX, tipRadius, sides } = options;
  const origin = options.centre ?? { x: 0, y: 0, z: 0 };
  const ring = (radius: number, atX: number): Vec3[] =>
    Array.from({ length: sides }, (_, index) => {
      const angle = (index / sides) * Math.PI * 2;
      return {
        x: origin.x + atX,
        y: origin.y + Math.sin(angle) * radius,
        z: origin.z + Math.cos(angle) * radius,
      };
    });

  const base = ring(baseRadius, baseX);
  const tip = ring(tipRadius, tipX);
  const faces: Face[] = [];

  for (let index = 0; index < sides; index += 1) {
    const next = (index + 1) % sides;
    faces.push({
      points: [base[index], tip[index], tip[next], base[next]],
      color,
      part,
      // The inside of a dish is as much of the view as the outside.
      twoSided: true,
    });
  }
  return faces;
}

/* ========================================================================= */
/*  A camera that can stand anywhere and look at anything.                   */
/*                                                                           */
/*  The projection above is fixed: the eye sits on the +z axis and looks at  */
/*  the origin, which is all a spinning model on a turntable needs. Flying a */
/*  mission needs more — a camera that rides behind the spacecraft, or hangs */
/*  back and swings to keep it in frame. That takes a view basis.            */
/* ========================================================================= */

export interface View {
  eye: Vec3;
  /** The point the camera is pointed at. */
  target: Vec3;
  /** Which way is up for the camera. Defaults to the world's up. */
  up?: Vec3;
  fov: number;
  near: number;
}

/** The camera's own three axes, each at right angles to the other two. */
export interface Basis {
  eye: Vec3;
  right: Vec3;
  up: Vec3;
  forward: Vec3;
}

const WORLD_UP: Vec3 = { x: 0, y: 1, z: 0 };

/**
 * Build the camera's axes from where it stands and what it looks at.
 *
 * Looking straight up or straight down is the one awkward case: "up" and
 * "forward" are then the same line and there is no sideways left to compute,
 * so a different up is borrowed for that frame.
 */
export function viewBasis(view: View): Basis {
  const forward = normalise(subtract(view.target, view.eye));
  let up = view.up ?? WORLD_UP;

  if (Math.abs(dot(forward, normalise(up))) > 0.999) {
    up = { x: 0, y: 0, z: 1 };
    if (Math.abs(dot(forward, up)) > 0.999) up = { x: 1, y: 0, z: 0 };
  }

  const right = normalise(cross(forward, up));
  return { eye: view.eye, right, up: cross(right, forward), forward };
}

/**
 * Where a world point sits relative to the camera: x to its right, y above it,
 * z straight out in front. Everything the camera can see has a positive z.
 */
export function toCamera(p: Vec3, basis: Basis): Vec3 {
  const d = subtract(p, basis.eye);
  return { x: dot(d, basis.right), y: dot(d, basis.up), z: dot(d, basis.forward) };
}

/**
 * Flatten a world point through a camera that is looking wherever it likes.
 * Returns null for anything level with or behind the eye.
 */
export function projectView(
  p: Vec3,
  view: View,
  basis: Basis,
  centre: Point2,
): (Point2 & { depth: number }) | null {
  const seen = toCamera(p, basis);
  if (seen.z < view.near) return null;
  const scale = view.fov / seen.z;
  return { x: centre.x + seen.x * scale, y: centre.y - seen.y * scale, depth: seen.z };
}

/**
 * A run of points flattened together, with anything behind the camera dropped.
 * An orbit that runs off behind the eye comes back as the part still in front.
 */
export function projectPath(
  points: Vec3[],
  view: View,
  basis: Basis,
  centre: Point2,
): Point2[] {
  const out: Point2[] = [];
  for (const point of points) {
    const flat = projectView(point, view, basis, centre);
    if (flat) out.push({ x: flat.x, y: flat.y });
  }
  return out;
}

/** How big something of this size looks from here. Nearer is bigger. */
export function sizeAt(radius: number, depth: number, view: View): number {
  if (depth < view.near) return 0;
  return (radius * view.fov) / depth;
}
