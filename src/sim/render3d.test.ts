import { describe, expect, it } from "vitest";
import {
  boxFaces,
  centroid,
  coneFaces,
  cross,
  dot,
  faceNormal,
  lambert,
  length,
  normalise,
  orient,
  project,
  render,
  rotateX,
  rotateY,
  shadeColor,
  subtract,
  svgPoints,
} from "./render3d";
import type { Face, Vec3 } from "./render3d";

const SHADING = { ambient: 0.3, range: 0.7 };
const CAMERA = { distance: 40, fov: 300, near: 1 };
const CENTRE = { x: 200, y: 150 };
const close = (a: Vec3, b: Vec3) => {
  expect(a.x).toBeCloseTo(b.x, 6);
  expect(a.y).toBeCloseTo(b.y, 6);
  expect(a.z).toBeCloseTo(b.z, 6);
};

describe("vector maths", () => {
  it("crosses the two axes into the third, right-handed", () => {
    close(cross({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }), { x: 0, y: 0, z: 1 });
    close(cross({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }), { x: 1, y: 0, z: 0 });
  });

  it("gives a cross product square to both of its inputs", () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { x: -2, y: 0.5, z: 4 };
    const c = cross(a, b);
    expect(dot(c, a)).toBeCloseTo(0, 6);
    expect(dot(c, b)).toBeCloseTo(0, 6);
  });

  it("normalises to length one, and leaves a zero vector alone", () => {
    expect(length(normalise({ x: 3, y: 4, z: 12 }))).toBeCloseTo(1, 9);
    close(normalise({ x: 0, y: 0, z: 0 }), { x: 0, y: 0, z: 0 });
  });

  it("subtracts", () => {
    close(subtract({ x: 5, y: 5, z: 5 }, { x: 1, y: 2, z: 3 }), { x: 4, y: 3, z: 2 });
  });
});

describe("rotation", () => {
  it("turns a quarter about the up axis", () => {
    close(rotateY({ x: 1, y: 0, z: 0 }, Math.PI / 2), { x: 0, y: 0, z: -1 });
  });

  it("turns a quarter about the across axis", () => {
    close(rotateX({ x: 0, y: 1, z: 0 }, Math.PI / 2), { x: 0, y: 0, z: 1 });
  });

  it("leaves the axis it turns about untouched", () => {
    close(rotateY({ x: 0, y: 7, z: 0 }, 1.1), { x: 0, y: 7, z: 0 });
    close(rotateX({ x: 7, y: 0, z: 0 }, 1.1), { x: 7, y: 0, z: 0 });
  });

  it("never changes how far a point is from the middle", () => {
    const p = { x: 3, y: -4, z: 5 };
    expect(length(orient(p, 0.9, -0.4))).toBeCloseTo(length(p), 9);
  });

  it("comes back to where it started after a full turn", () => {
    const p = { x: 2, y: 3, z: -1 };
    close(orient(p, Math.PI * 2, 0), p);
  });
});

describe("perspective", () => {
  it("puts the middle of the model in the middle of the picture", () => {
    const flat = project({ x: 0, y: 0, z: 0 }, CAMERA, CENTRE)!;
    expect(flat.x).toBeCloseTo(CENTRE.x, 9);
    expect(flat.y).toBeCloseTo(CENTRE.y, 9);
    expect(flat.depth).toBeCloseTo(CAMERA.distance, 9);
  });

  it("draws the same thing smaller when it is further away", () => {
    const near = project({ x: 1, y: 0, z: 10 }, CAMERA, CENTRE)!;
    const far = project({ x: 1, y: 0, z: -10 }, CAMERA, CENTRE)!;
    expect(near.x - CENTRE.x).toBeGreaterThan(far.x - CENTRE.x);
  });

  it("flips the y axis, because screens count downwards", () => {
    expect(project({ x: 0, y: 5, z: 0 }, CAMERA, CENTRE)!.y).toBeLessThan(CENTRE.y);
  });

  it("drops anything level with or behind the eye", () => {
    expect(project({ x: 0, y: 0, z: CAMERA.distance }, CAMERA, CENTRE)).toBeNull();
    expect(project({ x: 0, y: 0, z: CAMERA.distance + 10 }, CAMERA, CENTRE)).toBeNull();
  });
});

describe("faces", () => {
  const box = boxFaces({ x: 0, y: 0, z: 0 }, { w: 2, h: 2, d: 2 }, "#fff", "body");

  it("builds six of them for a box", () => {
    expect(box).toHaveLength(6);
  });

  it("winds every one so its normal points out of the solid", () => {
    for (const face of box) {
      const middle = centroid(face.points);
      // Pointing out means the normal agrees with the direction from the
      // middle of the box. If any face were wound backwards this would fail,
      // and that face would vanish the moment it should have been visible.
      expect(dot(faceNormal(face.points), normalise(middle))).toBeGreaterThan(0.9);
    }
  });

  it("points the six normals along the six axes", () => {
    const normals = box.map((face) => faceNormal(face.points));
    const axes = [
      { x: 1, y: 0, z: 0 },
      { x: -1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: -1, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
    ];
    for (const axis of axes) {
      expect(normals.some((n) => dot(n, axis) > 0.99)).toBe(true);
    }
  });

  it("puts a box where it was asked to", () => {
    const moved = boxFaces({ x: 10, y: -4, z: 2 }, { w: 2, h: 2, d: 2 }, "#fff", "body");
    const middles = moved.map((face) => centroid(face.points));
    const average = centroid(middles);
    close(average, { x: 10, y: -4, z: 2 });
  });

  it("builds one side per side of a cone", () => {
    const cone = coneFaces(
      { baseX: 4, baseRadius: 3, tipX: 0, tipRadius: 0.5, sides: 12 },
      "#fff",
      "antenna",
    );
    expect(cone).toHaveLength(12);
    for (const face of cone) expect(face.twoSided).toBe(true);
  });
});

describe("light", () => {
  const light = { x: 0, y: 1, z: 0 };

  it("gives a face square to the light everything it has", () => {
    expect(lambert({ x: 0, y: 1, z: 0 }, light, SHADING)).toBeCloseTo(1, 9);
  });

  it("gives a face turned away only the ambient, never less", () => {
    expect(lambert({ x: 0, y: -1, z: 0 }, light, SHADING)).toBeCloseTo(SHADING.ambient, 9);
  });

  it("falls off as a cosine in between", () => {
    const halfway = lambert(normalise({ x: 1, y: 1, z: 0 }), light, SHADING);
    expect(halfway).toBeCloseTo(SHADING.ambient + SHADING.range * Math.SQRT1_2, 6);
  });

  it("writes a colour CSS will understand, and clamps it", () => {
    expect(shadeColor("#ff0000", 0.5)).toBe("color-mix(in srgb, #ff0000 50%, #05070f)");
    expect(shadeColor("#ff0000", 2)).toContain("100%");
    expect(shadeColor("#ff0000", -1)).toContain("0%");
  });
});

describe("rendering the lot", () => {
  const cube: Face[] = boxFaces({ x: 0, y: 0, z: 0 }, { w: 6, h: 6, d: 6 }, "#8ab", "body");
  const options = {
    yaw: 0,
    pitch: 0,
    camera: CAMERA,
    light: { x: 0, y: 1, z: 1 },
    shading: SHADING,
    centre: CENTRE,
  };

  it("throws away the faces that cannot be seen", () => {
    // Square on, a cube shows one face. Never more than three at any angle.
    expect(render(cube, options)).toHaveLength(1);
    expect(render(cube, { ...options, yaw: 0.6, pitch: -0.4 }).length).toBeLessThanOrEqual(3);
  });

  it("hands them back furthest first, so the near ones paint over", () => {
    const drawn = render(cube, { ...options, yaw: 0.6, pitch: -0.4 });
    for (let i = 1; i < drawn.length; i += 1) {
      expect(drawn[i].depth).toBeLessThanOrEqual(drawn[i - 1].depth);
    }
  });

  it("keeps a sheet visible from both sides", () => {
    const sheet: Face[] = [
      {
        points: [
          { x: -2, y: -2, z: 0 },
          { x: 2, y: -2, z: 0 },
          { x: 2, y: 2, z: 0 },
          { x: -2, y: 2, z: 0 },
        ],
        color: "#123",
        part: "power",
        twoSided: true,
      },
    ];
    expect(render(sheet, options)).toHaveLength(1);
    expect(render(sheet, { ...options, yaw: Math.PI })).toHaveLength(1);
    // and lit, not black, from whichever side you are on
    expect(render(sheet, { ...options, yaw: Math.PI })[0].light).toBeGreaterThan(SHADING.ambient - 1e-9);
  });

  it("gives every face a light level inside its range", () => {
    for (const face of render(cube, { ...options, yaw: 0.9, pitch: 0.3 })) {
      expect(face.light).toBeGreaterThanOrEqual(SHADING.ambient - 1e-9);
      expect(face.light).toBeLessThanOrEqual(SHADING.ambient + SHADING.range + 1e-9);
    }
  });

  it("carries the part through, so a face can still be named", () => {
    for (const face of render(cube, options)) expect(face.part).toBe("body");
  });

  it("writes points the way an SVG polygon wants them", () => {
    // Not 1.005: that is not exactly 1.005 in binary, and rounds down.
    expect(svgPoints([{ x: 1.006, y: 2 }, { x: 3, y: 4 }])).toBe("1.01,2.00 3.00,4.00");
    expect(svgPoints([{ x: -0.4449, y: 12.5 }])).toBe("-0.44,12.50");
  });

  it("is the same every time: nothing random in any of it", () => {
    expect(render(cube, { ...options, yaw: 0.4 })).toEqual(render(cube, { ...options, yaw: 0.4 }));
  });
});
