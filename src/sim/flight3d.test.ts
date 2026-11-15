import { describe, expect, it } from "vitest";
import {
  CAMERA_MODES,
  buildScene,
  cameraFor,
  onRing,
  startingPitch,
} from "./flight3d";
import type { CameraMode } from "./flight3d";
import {
  dot,
  length,
  normalise,
  projectPath,
  projectView,
  sizeAt,
  subtract,
  toCamera,
  viewBasis,
} from "./render3d";
import type { Vec3 } from "./render3d";
import { createSimulation, step } from "./simulation";
import { designFlags } from "../physics/checks";
import { flight3d, presetDesign, scenarios } from "../data/game";

const CENTRE = { x: 300, y: 200 };

function simFor(id: string, seconds = 0) {
  const scenario = scenarios.find((item) => item.id === id)!;
  const design = presetDesign(scenario);
  let sim = createSimulation(
    design,
    scenario,
    scenario.preset.route,
    scenario.preset.launchMonth,
    [...designFlags(design, scenario)],
    20261115,
  );
  for (let i = 0; i < seconds * 10; i += 1) sim = step(sim, 0.1);
  return sim;
}

/* ====================================================== the look-at camera */

describe("a camera that can stand anywhere", () => {
  const view = {
    eye: { x: 0, y: 0, z: -5 },
    target: { x: 0, y: 0, z: 0 },
    fov: 300,
    near: 0.1,
  };
  const basis = viewBasis(view);

  it("builds three axes, each at right angles to the other two", () => {
    expect(dot(basis.right, basis.up)).toBeCloseTo(0, 9);
    expect(dot(basis.right, basis.forward)).toBeCloseTo(0, 9);
    expect(dot(basis.up, basis.forward)).toBeCloseTo(0, 9);
    for (const axis of [basis.right, basis.up, basis.forward]) {
      expect(length(axis)).toBeCloseTo(1, 9);
    }
  });

  it("points forward at whatever it was told to look at", () => {
    const toTarget = normalise(subtract(view.target, view.eye));
    expect(dot(basis.forward, toTarget)).toBeCloseTo(1, 9);
  });

  it("copes with looking straight down, where up and forward are one line", () => {
    const overhead = viewBasis({
      eye: { x: 0, y: 8, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      fov: 300,
      near: 0.1,
    });
    expect(length(overhead.right)).toBeCloseTo(1, 9);
    expect(Number.isNaN(overhead.up.x + overhead.up.y + overhead.up.z)).toBe(false);
    expect(dot(overhead.right, overhead.forward)).toBeCloseTo(0, 9);
  });

  it("puts whatever it is looking at in the middle of the picture", () => {
    const flat = projectView(view.target, view, basis, CENTRE)!;
    expect(flat.x).toBeCloseTo(CENTRE.x, 6);
    expect(flat.y).toBeCloseTo(CENTRE.y, 6);
    expect(flat.depth).toBeCloseTo(5, 6);
  });

  it("reports how far away a thing is, measured along where it is looking", () => {
    expect(toCamera({ x: 0, y: 0, z: 5 }, basis).z).toBeCloseTo(10, 6);
  });

  it("drops anything level with or behind the eye", () => {
    expect(projectView({ x: 0, y: 0, z: -9 }, view, basis, CENTRE)).toBeNull();
    expect(projectView(view.eye, view, basis, CENTRE)).toBeNull();
  });

  it("keeps the part of a path still in front when the rest runs behind", () => {
    const line: Vec3[] = [
      { x: 0, y: 0, z: -20 },
      { x: 0, y: 0, z: -9 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 5 },
    ];
    const drawn = projectPath(line, view, basis, CENTRE);
    expect(drawn.length).toBe(2);
  });

  it("draws the same thing smaller the further off it is", () => {
    expect(sizeAt(1, 2, view)).toBeGreaterThan(sizeAt(1, 20, view));
    expect(sizeAt(1, 0.001, view)).toBe(0);
  });
});

/* ============================================================== the scene */

describe("the mission as a scene", () => {
  const sim = simFor("mars", 4);
  const scene = buildScene(sim);

  it("lays the orbits flat, with up pointing out of them", () => {
    for (const point of [...scene.startRing, ...scene.targetRing, ...scene.path]) {
      expect(point.y).toBeCloseTo(0, 9);
    }
  });

  it("scales every mission to the same size, so one camera frames them all", () => {
    for (const scenario of scenarios) {
      const built = buildScene(simFor(scenario.id, 2));
      const far = Math.max(...built.targetRing.map((p) => length(p)));
      expect(far, scenario.id).toBeCloseTo(1, 6);
    }
  });

  it("puts the Sun at the middle and the bodies on their own rings", () => {
    expect(length(scene.sun)).toBe(0);
    const config = sim.config;
    expect(length(scene.earth)).toBeCloseTo(config.startRadiusAU * scene.scale, 6);
    expect(length(scene.target)).toBeCloseTo(config.targetOrbitRadiusAU * scene.scale, 6);
  });

  it("agrees with the flat map about where the spacecraft is", () => {
    // Both read the same angle out of the simulation, so the angle the 3D
    // scene puts the spacecraft at must match the one the flat map uses.
    const angle3d = Math.atan2(scene.ship.z, scene.ship.x);
    const built = buildScene(sim);
    expect(Math.atan2(built.ship.z, built.ship.x)).toBeCloseTo(angle3d, 9);
    expect(length(scene.ship)).toBeGreaterThan(0);
  });

  it("gives the spacecraft a heading of length one that lies in the plane", () => {
    expect(length(scene.heading)).toBeCloseTo(1, 6);
    expect(scene.heading.y).toBeCloseTo(0, 9);
  });

  it("points the heading the way the path actually runs", () => {
    const along = normalise(
      subtract(scene.path[Math.min(scene.flown + 3, scene.path.length - 1)], scene.ship),
    );
    expect(dot(scene.heading, along)).toBeGreaterThan(0);
  });

  it("flies more of the path as the days go by", () => {
    expect(buildScene(simFor("mars", 12)).flown).toBeGreaterThan(buildScene(simFor("mars", 1)).flown);
  });

  it("never runs off the end of its own path", () => {
    for (const scenario of scenarios) {
      const built = buildScene(simFor(scenario.id, 30));
      expect(built.flown).toBeGreaterThanOrEqual(0);
      expect(built.flown).toBeLessThan(built.path.length);
    }
  });

  it("is the same scene every time for the same moment", () => {
    expect(buildScene(sim)).toEqual(buildScene(sim));
  });
});

/* ============================================================= the cameras */

describe("the three camera modes", () => {
  const sim = simFor("mars", 6);
  const scene = buildScene(sim);
  const options = { spin: 0.8, pitch: flight3d.camera.orbitPitch };
  const modes: CameraMode[] = ["orbit", "track", "follow"];

  it("offers one button per mode, each with a line saying what it does", () => {
    expect(CAMERA_MODES.map((mode) => mode.id)).toEqual(modes);
    for (const mode of CAMERA_MODES) expect(mode.hint.length).toBeGreaterThan(10);
  });

  it("never puts the eye on top of what it is looking at", () => {
    for (const mode of modes) {
      const view = cameraFor(scene, mode, options);
      expect(length(subtract(view.target, view.eye)), mode).toBeGreaterThan(view.near);
    }
  });

  it("looks at the Sun on orbit, and at the spacecraft on track and follow", () => {
    expect(cameraFor(scene, "orbit", options).target).toEqual(scene.sun);
    expect(cameraFor(scene, "track", options).target).toEqual(scene.ship);
    const follow = cameraFor(scene, "follow", options).target;
    // Ahead of the spacecraft, not on it: you want to see where it is going.
    expect(length(subtract(follow, scene.ship))).toBeGreaterThan(0);
  });

  it("stands above the plane of the orbits, never under it", () => {
    for (const mode of modes) {
      expect(cameraFor(scene, mode, options).eye.y, mode).toBeGreaterThan(0);
    }
  });

  it("swings right round as the spin advances", () => {
    const a = cameraFor(scene, "orbit", { ...options, spin: 0 }).eye;
    const b = cameraFor(scene, "orbit", { ...options, spin: Math.PI }).eye;
    // Compared flat: the camera swings round the system but keeps its height,
    // so the two eyes are opposite in x and z and identical in y.
    const flatten = (v: typeof a) => normalise({ x: v.x, y: 0, z: v.z });
    expect(dot(flatten(a), flatten(b))).toBeLessThan(-0.99);
    expect(a.y).toBeCloseTo(b.y, 9);
  });

  it("comes back where it started after a full turn", () => {
    const a = cameraFor(scene, "orbit", { ...options, spin: 0.4 }).eye;
    const b = cameraFor(scene, "orbit", { ...options, spin: 0.4 + Math.PI * 2 }).eye;
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.z).toBeCloseTo(b.z, 6);
  });

  it("holds the same distance however far it has swung", () => {
    const far = [0, 1, 2, 3, 4, 5, 6].map((spin) =>
      length(cameraFor(scene, "orbit", { ...options, spin }).eye),
    );
    for (const distance of far) expect(distance).toBeCloseTo(far[0], 6);
  });

  it("clamps the pitch, so it can never go under the floor or flip over the top", () => {
    const low = cameraFor(scene, "orbit", { ...options, pitch: -9 });
    const high = cameraFor(scene, "orbit", { ...options, pitch: 9 });
    expect(low.eye.y).toBeGreaterThan(0);
    expect(high.eye.y).toBeGreaterThan(0);
    expect(low.eye.y).toBeLessThan(high.eye.y);
  });

  it("rides much closer on follow than it hangs back on orbit", () => {
    const follow = cameraFor(scene, "follow", options);
    const orbit = cameraFor(scene, "orbit", options);
    expect(length(subtract(follow.target, follow.eye))).toBeLessThan(
      length(subtract(orbit.target, orbit.eye)) / 2,
    );
  });

  it("sits behind the spacecraft on follow, not in front of it", () => {
    const follow = cameraFor(scene, "follow", options);
    // The way from the eye to the spacecraft should agree with the heading.
    expect(dot(normalise(subtract(scene.ship, follow.eye)), scene.heading)).toBeGreaterThan(0);
  });

  it("can actually see the spacecraft, in every mode and at every angle", () => {
    for (const scenario of scenarios) {
      const built = buildScene(simFor(scenario.id, 8));
      for (const mode of modes) {
        for (const spin of [0, 1.5, 3, 4.5, 6]) {
          const view = cameraFor(built, mode, { spin, pitch: startingPitch(mode) });
          const flat = projectView(built.ship, view, viewBasis(view), CENTRE);
          expect(flat, `${scenario.id} / ${mode} / spin ${spin}`).not.toBeNull();
        }
      }
    }
  });

  it("keeps the whole system in the picture on orbit, from every angle", () => {
    // The cockpit map at 1366x650, which is wide and short. The system is
    // round, so the height is what runs out first and what the camera
    // distance is actually set by.
    const stage = { w: 1060, h: 490 };
    const middle = { x: stage.w / 2, y: stage.h / 2 };

    for (const scenario of scenarios) {
      const built = buildScene(simFor(scenario.id, 5));
      for (const spin of [0, 0.8, 1.6, 2.4, 3.2, 4, 4.8, 5.6]) {
        const view = cameraFor(built, "orbit", { spin, pitch: startingPitch("orbit") });
        const basis = viewBasis(view);
        const drawn = projectPath(built.targetRing, view, basis, middle);

        // Nothing behind the camera: the whole orbit is always in front of it.
        expect(drawn.length, `${scenario.id} at spin ${spin}`).toBe(built.targetRing.length);
        for (const point of drawn) {
          expect(Math.abs(point.x - middle.x)).toBeLessThan(stage.w / 2);
          expect(Math.abs(point.y - middle.y)).toBeLessThan(stage.h / 2);
        }
      }
    }
  });

  it("starts each mode at a pitch inside what it allows", () => {
    for (const mode of modes) {
      expect(startingPitch(mode)).toBeGreaterThanOrEqual(flight3d.camera.minPitch);
      expect(startingPitch(mode)).toBeLessThanOrEqual(flight3d.camera.maxPitch);
    }
  });
});

describe("the orbit it rides after arrival", () => {
  /** Where the spacecraft sits, as an angle round the body it reached. */
  const angleAfter = (id: string, coastDays: number) => {
    const sim = { ...simFor(id, 2), phase: "orbit" as const };
    const built = buildScene(sim, coastDays);
    return Math.atan2(built.ship.z - built.target.z, built.ship.x - built.target.x);
  };

  it("takes the same real time to go round, whatever the mission", () => {
    // The whole bug: a lap counted in MISSION days is 0.4 real seconds at
    // Mars (one second is three days) and half a minute at the Moon (one
    // second is an hour). Counted in real seconds it is the same everywhere.
    const lapSeconds = flight3d.scene.arrivalOrbitSeconds;
    for (const scenario of scenarios) {
      const sim = simFor(scenario.id, 2);
      const daysInOneLap = lapSeconds * sim.daysPerSecond;
      const quarter = angleAfter(scenario.id, daysInOneLap / 4);
      const start = angleAfter(scenario.id, 0);
      let turned = quarter - start;
      while (turned < 0) turned += Math.PI * 2;
      expect(turned, `${scenario.id} after a quarter lap`).toBeCloseTo(Math.PI / 2, 4);
    }
  });

  it("is slow enough to watch: no faster than a lap every ten seconds", () => {
    expect(flight3d.scene.arrivalOrbitSeconds).toBeGreaterThanOrEqual(10);
  });

  it("keeps the spacecraft clear of the planet it is going round", () => {
    for (const scenario of scenarios) {
      const sim = { ...simFor(scenario.id, 2), phase: "orbit" as const };
      const built = buildScene(sim, 3);
      const gap = Math.hypot(built.ship.x - built.target.x, built.ship.z - built.target.z);
      // Clear of both the planet's own radius and the spacecraft's, or the
      // two overlap and it reads as having crashed into it.
      expect(gap, scenario.id).toBeGreaterThan(
        flight3d.scene.targetRadius + flight3d.scene.shipSize,
      );
    }
  });
});

describe("points on a ring", () => {
  it("lands on the circle it was asked for, flat in the plane", () => {
    const point = onRing(3, 0.7);
    expect(length(point)).toBeCloseTo(3, 9);
    expect(point.y).toBe(0);
  });

  it("goes the same way round as the flat map does", () => {
    // Angle zero is three o'clock, and the angle grows anticlockwise in maths
    // but the map draws z where the flat one draws y, so they agree on screen.
    expect(onRing(1, 0).x).toBeCloseTo(1, 9);
    expect(onRing(1, Math.PI / 2).z).toBeCloseTo(1, 9);
  });
});
