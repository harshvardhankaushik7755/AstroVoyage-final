/**
 * The mission in three dimensions.
 *
 * The flat map and this share their arithmetic: both ask the simulation where
 * the bodies are, in AU and radians, and differ only in what they do with the
 * answer. So the 3D view can never show the spacecraft somewhere the flat map
 * does not.
 *
 * The world here has the orbits lying in the y = 0 plane, with y pointing up
 * out of it. That is honest — the planets really are very nearly coplanar, to
 * within a couple of degrees — and it is the camera's tilt, not a tilt in the
 * solar system, that makes the picture read as a solid thing.
 *
 * Distances are in system widths, not AU: the outermost orbit is always 1 unit
 * from the Sun, so one set of camera numbers frames a three-day hop to the
 * Moon and a five-year haul to Jupiter alike.
 */
import { flight3d } from "../data/game";
import type { Design } from "../data/game";
import type { Face, Vec3, View } from "./render3d";
import { normalise, rotateY, subtract } from "./render3d";
import { modelExtent, shipFaces } from "./shipModel3d";
import type { SimState } from "./simulation";
import {
  coastAngles,
  nextRandom,
  planetAngle,
  progressOf,
  transferPath,
  transferPosition,
} from "./simulation";

export type CameraMode = "orbit" | "track" | "follow";

/** The three camera modes, in the order the buttons show them. */
export const CAMERA_MODES: { id: CameraMode; label: string; hint: string }[] = [
  { id: "orbit", label: "Orbit", hint: "Swing round the whole mission." },
  { id: "track", label: "Track", hint: "Stay back, but keep the spacecraft centred." },
  { id: "follow", label: "Follow", hint: "Ride behind the spacecraft." },
];

export interface Scene3D {
  /** World units per AU. The far orbit lands on 1. */
  scale: number;
  sun: Vec3;
  earth: Vec3;
  target: Vec3;
  ship: Vec3;
  /** Which way the spacecraft is going. The camera that rides behind needs it. */
  heading: Vec3;
  startRing: Vec3[];
  targetRing: Vec3[];
  /** The whole planned transfer. */
  path: Vec3[];
  /** How many of those points have been flown. */
  flown: number;
  /** Faint circles on the plane of the orbits, so the eye has a floor. */
  grid: number[];
}

/** A point on a circle in the plane of the orbits. */
export function onRing(radius: number, angle: number): Vec3 {
  return { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius };
}

function ring(radius: number, segments: number): Vec3[] {
  return Array.from({ length: segments + 1 }, (_, index) =>
    onRing(radius, (index / segments) * Math.PI * 2),
  );
}

/**
 * Everything in the picture, in world units.
 *
 * `coastDays` works exactly as it does on the flat map: past zero the bodies
 * are advanced to that day, because the planets keep moving after arrival.
 */
export function buildScene(sim: SimState, coastDays = 0): Scene3D {
  const config = sim.config;
  const { scene } = flight3d;

  const angles =
    coastDays > 0
      ? coastAngles(sim, coastDays)
      : {
          earthAngleRad: planetAngle("earth", sim.missionDay, config, sim.totalDays),
          targetAngleRad: planetAngle("target", sim.missionDay, config, sim.totalDays),
        };

  const farthestAU = Math.max(config.startRadiusAU, config.targetOrbitRadiusAU);
  const scale = farthestAU > 0 ? 1 / farthestAU : 1;

  const startRadius = config.startRadiusAU * scale;
  const targetRadius = config.targetOrbitRadiusAU * scale;

  const path = transferPath(config.startRadiusAU, config.targetOrbitRadiusAU, scene.pathSegments).map(
    (point) => onRing(point.r * scale, sim.startAngleRad + point.nu),
  );

  const progress = progressOf(sim);
  const flown = Math.round(progress * (path.length - 1));

  const target = onRing(targetRadius, angles.targetAngleRad);

  /* ---- where the spacecraft is, and which way it is pointing */
  let ship: Vec3;
  if (sim.phase === "orbit") {
    // Riding round the body it reached. The radius has to clear both the
    // planet and the spacecraft, or the two overlap and it reads as having
    // flown into it rather than captured around it.
    const orbitRadius = Math.max(
      scene.arrivalOrbitRadius,
      scene.targetRadius + scene.shipSize * 1.4,
    );
    // One lap every `arrivalOrbitSeconds` of REAL time, whatever the mission.
    // Counting the lap in mission days instead is what made it a blur: a Mars
    // second is three days, so 1.2 days was a whole lap every 0.4 seconds.
    const lapDays = Math.max(1e-6, scene.arrivalOrbitSeconds * sim.daysPerSecond);
    const riding = (2 * Math.PI * coastDays) / lapDays;
    // Measured from the planet alone, not from the planet's own angle round
    // the Sun: adding that in made the lap the sum of two different rates, so
    // the orbit never took the time the data said it would.
    const around = onRing(orbitRadius, riding);
    ship = { x: target.x + around.x, y: 0, z: target.z + around.z };
  } else {
    const here = transferPosition(progress, config.startRadiusAU, config.targetOrbitRadiusAU);
    ship = onRing(here.r * scale, sim.startAngleRad + here.nu);
  }

  /* The heading is read off the path rather than worked out again, so it can
     never disagree with the line the spacecraft is drawn on. */
  const ahead = path[Math.min(path.length - 1, flown + 1)];
  const behind = path[Math.max(0, flown - 1)];
  let heading = normalise(subtract(ahead, behind));
  if (heading.x === 0 && heading.y === 0 && heading.z === 0) heading = { x: 1, y: 0, z: 0 };

  const grid = Array.from(
    { length: scene.gridRings },
    (_, index) => ((index + 1) / scene.gridRings) * 1.1,
  );

  return {
    scale,
    sun: { x: 0, y: 0, z: 0 },
    earth: onRing(startRadius, angles.earthAngleRad),
    target,
    ship,
    heading,
    startRing: ring(startRadius, scene.ringSegments),
    targetRing: ring(targetRadius, scene.ringSegments),
    path,
    flown,
    grid,
  };
}

export interface CameraOptions {
  /** How far round the camera has swung, in radians. Auto-rotation drives it. */
  spin: number;
  /** How far above the plane of the orbits, in radians. Dragging changes it. */
  pitch: number;
}

/**
 * Where the camera stands and what it looks at, for one of the three modes.
 *
 *   orbit   hang back, look at the Sun, swing round the lot
 *   track   hang back, but look at the spacecraft, so the camera follows it
 *   follow  ride astern of the spacecraft and look where it is going
 */
export function cameraFor(scene: Scene3D, mode: CameraMode, options: CameraOptions): View {
  const { camera } = flight3d;
  const pitch = Math.min(camera.maxPitch, Math.max(camera.minPitch, options.pitch));
  const base = { fov: camera.fov, near: camera.near };

  if (mode === "follow") {
    const { heading, ship } = scene;
    // Astern and above, which is where a chase camera belongs. The spin from
    // auto-rotate swings that position round the spacecraft.
    const side = normalise({ x: -heading.z, y: 0, z: heading.x });
    const swing = camera.followSide + Math.sin(options.spin * 0.5) * camera.followSwing;

    const eye: Vec3 = {
      x: ship.x - heading.x * camera.followBack + side.x * swing * camera.followBack,
      y: ship.y + camera.followLift,
      z: ship.z - heading.z * camera.followBack + side.z * swing * camera.followBack,
    };
    const target: Vec3 = {
      x: ship.x + heading.x * camera.followAhead,
      y: ship.y,
      z: ship.z + heading.z * camera.followAhead,
    };
    return { eye, target, ...base };
  }

  const distance = mode === "track" ? camera.trackDistance : camera.orbitDistance;
  const eye: Vec3 = {
    x: Math.cos(options.spin) * distance * Math.cos(pitch),
    y: Math.sin(pitch) * distance,
    z: Math.sin(options.spin) * distance * Math.cos(pitch),
  };

  return { eye, target: mode === "track" ? scene.ship : scene.sun, ...base };
}

/** The pitch a mode starts at, before anybody drags it. */
export function startingPitch(mode: CameraMode): number {
  const { camera } = flight3d;
  return mode === "track" ? camera.trackPitch : camera.orbitPitch;
}

/**
 * Stars, scattered evenly over the inside of a very large sphere.
 *
 * Far enough out that the mission never reaches them, so swinging the camera
 * sweeps them past exactly the way a real sky moves. Seeded, so it is the same
 * sky on every run and the eye has something fixed to judge the turn against.
 */
export function starSphere(): { at: Vec3; size: number }[] {
  const { starCount, starSeed, starRadius } = flight3d.scene;
  let state = starSeed;
  const roll = () => {
    const [value, next] = nextRandom(state);
    state = next;
    return value;
  };

  return Array.from({ length: starCount }, () => {
    // Even over a sphere: picking the height first, flat, is what stops them
    // bunching at the poles the way two naive angles would.
    const height = roll() * 2 - 1;
    const around = roll() * Math.PI * 2;
    const ring = Math.sqrt(Math.max(0, 1 - height * height));
    return {
      at: {
        x: Math.cos(around) * ring * starRadius,
        y: height * starRadius,
        z: Math.sin(around) * ring * starRadius,
      },
      size: 0.4 + roll() * 1.3,
    };
  });
}

/**
 * The spacecraft you built, as a solid, standing where it actually is and
 * pointed the way it is actually going.
 *
 * The model is built nose-along-+x, so it is turned about the up axis until
 * its nose agrees with the heading, scaled down to `shipSize` system-widths,
 * and carried out to where the mission has got to.
 */
export function shipInScene(
  design: Design,
  scene: Scene3D,
): { faces: Face[]; light: Vec3 } {
  const model = shipFaces(design);
  const extent = modelExtent(model) || 1;
  const size = flight3d.scene.shipSize / extent;

  // The model's nose runs along +x; rotateY(p, -angle) swings it to the heading.
  const angle = -Math.atan2(scene.heading.z, scene.heading.x);

  const faces = model.map((face) => ({
    ...face,
    points: face.points.map((point) => {
      const turned = rotateY(
        { x: point.x * size, y: point.y * size, z: point.z * size },
        angle,
      );
      return {
        x: scene.ship.x + turned.x,
        y: scene.ship.y + turned.y,
        z: scene.ship.z + turned.z,
      };
    }),
  }));

  // Lit from the Sun, which is at the middle of everything.
  const away = Math.hypot(scene.ship.x, scene.ship.y, scene.ship.z) || 1;
  return {
    faces,
    light: {
      x: -scene.ship.x / away,
      y: 0.35,
      z: -scene.ship.z / away,
    },
  };
}
