import { describe, expect, it } from "vitest";
import { cameraFor, modelExtent, shipFaces } from "./shipModel3d";
import { centroid, dot, faceNormal, normalise, render } from "./render3d";
import { parts, presetDesign, scenarios, ship3d } from "../data/game";
import type { Design } from "../data/game";

const mars = scenarios.find((scenario) => scenario.id === "mars")!;
const base = presetDesign(mars);
const partsOf = (design: Design) => new Set(shipFaces(design).map((face) => face.part));

describe("the spacecraft as a solid", () => {
  it("builds something for every part the player chose", () => {
    const built = partsOf(base);
    for (const part of ["body", "power", "antenna", "instruments", "engine"]) {
      expect(built, `missing ${part}`).toContain(part);
    }
  });

  it("draws no instrument boxes when nothing is carried", () => {
    expect(partsOf({ ...base, instrumentIds: [] })).not.toContain("instruments");
  });

  it("draws one box per instrument, up to what the bus has room for", () => {
    const two = shipFaces({ ...base, bodyId: "medium", instrumentIds: ["camera", "radar"] });
    const one = shipFaces({ ...base, bodyId: "medium", instrumentIds: ["camera"] });
    const boxes = (faces: typeof two) => faces.filter((f) => f.part === "instruments").length / 6;
    expect(boxes(two)).toBe(2);
    expect(boxes(one)).toBe(1);
  });

  it("gives a bigger dish to the antenna that sends more", () => {
    // Measured on the dish itself, not the whole model: the solar wings reach
    // further out than any dish does, so they set the overall extent.
    const dishRadius = (antennaId: string) =>
      Math.max(
        ...shipFaces({ ...base, antennaId })
          .filter((face) => face.part === "antenna")
          .flatMap((face) => face.points.map((p) => Math.hypot(p.y, p.z))),
      );
    expect(dishRadius("antLarge")).toBeGreaterThan(dishRadius("antSmall"));
  });

  it("gives longer wings to the panels that make more power", () => {
    const small = modelExtent(shipFaces({ ...base, powerId: "solarSmall" }));
    const large = modelExtent(shipFaces({ ...base, powerId: "solarLarge" }));
    expect(large).toBeGreaterThan(small);
  });

  it("swaps the wings for a finned battery when the power is nuclear", () => {
    const rtg = parts.powerSources.find((source) => source.type === "rtg");
    expect(rtg, "the game should still have a nuclear battery").toBeDefined();
    const faces = shipFaces({ ...base, powerId: rtg!.id });
    const power = faces.filter((face) => face.part === "power");
    expect(power.length).toBeGreaterThan(0);
    // A panel is built out of flat six-sided cells; a battery is a ring of
    // sides plus fins, so the two are never the same count.
    const solar = shipFaces({ ...base, powerId: "solarSmall" }).filter((f) => f.part === "power");
    expect(power.length).not.toBe(solar.length);
  });

  it("makes a bigger bus out of a bigger body", () => {
    const small = modelExtent(shipFaces({ ...base, bodyId: "small" }));
    const large = modelExtent(shipFaces({ ...base, bodyId: "large" }));
    expect(large).toBeGreaterThan(small);
  });

  it("points the nose one way and the engine the other", () => {
    const faces = shipFaces(base);
    const middleOf = (part: string) =>
      centroid(faces.filter((face) => face.part === part).map((face) => centroid(face.points)));
    expect(middleOf("antenna").x).toBeGreaterThan(0);
    expect(middleOf("engine").x).toBeLessThan(0);
  });

  it("puts the instruments on top, where they can see out", () => {
    const faces = shipFaces(base);
    const sensors = faces.filter((face) => face.part === "instruments");
    const middle = centroid(sensors.map((face) => centroid(face.points)));
    expect(middle.y).toBeGreaterThan(0);
  });

  it("never builds a face too thin to have a direction", () => {
    // A polygon whose corners are in a line has no normal, so it cannot be
    // culled or lit, and it shows up as a black sliver that flickers.
    for (const face of shipFaces(base)) {
      expect(face.points.length).toBeGreaterThanOrEqual(3);
      const normal = faceNormal(face.points);
      expect(
        Math.hypot(normal.x, normal.y, normal.z),
        `flat face on the ${face.part}`,
      ).toBeCloseTo(1, 6);
    }
  });

  it("winds the bus so its normals point out of it", () => {
    // Only the bus: the gold foil band is deliberately set low on the body,
    // so "away from the middle of the model" is not the test for that one.
    const bus = shipFaces({ ...base, instrumentIds: [] }).slice(0, 6);
    for (const face of bus) {
      const outward = normalise(centroid(face.points));
      expect(dot(faceNormal(face.points), outward)).toBeGreaterThan(0.9);
    }
  });

  it("is the same model every time for the same design", () => {
    expect(shipFaces(base)).toEqual(shipFaces(base));
  });

  it("builds every mission's preset without a gap", () => {
    for (const scenario of scenarios) {
      const faces = shipFaces(presetDesign(scenario));
      expect(faces.length).toBeGreaterThan(20);
      expect(modelExtent(faces)).toBeGreaterThan(0);
    }
  });
});

describe("framing the shot", () => {
  it("pulls the camera back for a bigger spacecraft", () => {
    const small = cameraFor(shipFaces({ ...base, bodyId: "small", antennaId: "antSmall" }));
    const large = cameraFor(shipFaces({ ...base, bodyId: "large", antennaId: "antLarge" }));
    expect(large.distance).toBeGreaterThan(small.distance);
  });

  it("never puts the camera inside the model", () => {
    for (const scenario of scenarios) {
      const faces = shipFaces(presetDesign(scenario));
      const camera = cameraFor(faces);
      expect(camera.distance).toBeGreaterThan(modelExtent(faces));
      expect(camera.distance).toBeGreaterThan(camera.near);
    }
  });

  it("actually draws something from every angle, for every mission", () => {
    for (const scenario of scenarios) {
      const faces = shipFaces(presetDesign(scenario));
      const camera = cameraFor(faces);
      for (const yaw of [0, 1, 2, 3, 4, 5, 6]) {
        const drawn = render(faces, {
          yaw,
          pitch: ship3d.view.startPitch,
          camera,
          light: ship3d.light,
          shading: ship3d.shading,
          centre: { x: 200, y: 150 },
        });
        expect(drawn.length, `nothing visible at yaw ${yaw}`).toBeGreaterThan(5);
      }
    }
  });

  it("keeps the whole spacecraft inside the picture it is given", () => {
    const faces = shipFaces(presetDesign(mars));
    const camera = cameraFor(faces);
    const centre = { x: 200, y: 150 };
    const drawn = render(faces, {
      yaw: 0.7,
      pitch: ship3d.view.startPitch,
      camera,
      light: ship3d.light,
      shading: ship3d.shading,
      centre,
    });
    for (const face of drawn) {
      for (const point of face.points) {
        expect(Math.abs(point.x - centre.x)).toBeLessThan(200);
        expect(Math.abs(point.y - centre.y)).toBeLessThan(150);
      }
    }
  });
});
