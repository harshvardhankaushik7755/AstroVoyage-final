import { describe, expect, it } from "vitest";
import { buildHomeSystem, lapSeconds, orbitRadius } from "./homeSystem";
import { homeSystem as config, scenarios } from "../data/game";

const layout = buildHomeSystem(config);
const find = (id: string) => layout.bodies.find((body) => body.id === id)!;

describe("how fast the home page's planets turn", () => {
  it("gives Earth exactly the lap time the data asks for", () => {
    expect(lapSeconds(365.25, config)).toBeCloseTo(config.time.earthLapSeconds, 6);
  });

  it("keeps the real order: the further out, the slower", () => {
    const moon = find("earth").moon!;
    expect(moon.lapSeconds).toBeLessThan(find("earth").lapSeconds);
    expect(find("earth").lapSeconds).toBeLessThan(find("mars").lapSeconds);
    expect(find("mars").lapSeconds).toBeLessThan(layout.probe.lapSeconds);
    expect(layout.probe.lapSeconds).toBeLessThan(find("jupiter").lapSeconds);
  });

  it("squashes the range, or Jupiter would sit still", () => {
    const real = find("jupiter").orbitDays / find("earth").orbitDays; // about 11.9
    const drawn = find("jupiter").lapSeconds / find("earth").lapSeconds;
    expect(drawn).toBeLessThan(real);
    // Still slow enough to read as the outer planet, not a second Earth.
    expect(drawn).toBeGreaterThan(2);
  });

  it("never stops anything dead", () => {
    for (const body of layout.bodies) expect(body.lapSeconds).toBeGreaterThan(0);
    expect(layout.probe.lapSeconds).toBeGreaterThan(0);
  });
});

describe("where the home page's rings sit", () => {
  const bounds = { minAU: 1, maxAU: 5.2, span: 200 };

  it("puts the nearest body on the inner ring and the furthest on the outer", () => {
    expect(orbitRadius(1, config, bounds)).toBeCloseTo(config.orbit.innerShare * 200, 6);
    expect(orbitRadius(5.2, config, bounds)).toBeCloseTo(config.orbit.outerShare * 200, 6);
  });

  it("spaces them by the square root, so the outer gaps are the tighter ones", () => {
    const inner = orbitRadius(1.52, config, bounds) - orbitRadius(1, config, bounds);
    const outer = orbitRadius(5.2, config, bounds) - orbitRadius(4.68, config, bounds);
    expect(outer).toBeLessThan(inner);
  });

  it("copes with one body, or with two at the same distance", () => {
    const flat = { minAU: 1, maxAU: 1, span: 200 };
    expect(orbitRadius(1, config, flat)).toBeCloseTo(config.orbit.innerShare * 200, 6);
  });

  it("keeps the real order of the distances", () => {
    expect(find("earth").orbitRadius).toBeLessThan(find("mars").orbitRadius);
    expect(find("mars").orbitRadius).toBeLessThan(layout.probe.orbitRadius);
    expect(layout.probe.orbitRadius).toBeLessThan(find("jupiter").orbitRadius);
  });
});

describe("the finished picture", () => {
  it("draws one dashed ring per orbiting thing, innermost first", () => {
    expect(layout.rings).toHaveLength(config.bodies.length + 1);
    const sorted = [...layout.rings].sort((a, b) => a - b);
    expect(layout.rings).toEqual(sorted);
  });

  it("puts the Sun where the data says", () => {
    expect(layout.cx).toBeCloseTo(config.view.width * config.view.centerXShare, 6);
    expect(layout.cy).toBeCloseTo(config.view.height * config.view.centerYShare, 6);
  });

  it("gives every body a starting angle, so nothing begins in a heap", () => {
    const angles = layout.bodies.map((body) => body.startAngle);
    expect(new Set(angles).size).toBe(angles.length);
    for (const angle of angles) expect(angle).not.toBe(0);
  });

  it("hands a screen reader a sentence instead of the picture", () => {
    expect(layout.label).toContain("Earth");
    expect(layout.label).toContain("Jupiter");
    expect(layout.label.endsWith(".")).toBe(true);
  });

  it("is the same every time — nothing random in it", () => {
    expect(buildHomeSystem(config)).toEqual(buildHomeSystem(config));
  });
});

describe("the home page's numbers agree with the mission data", () => {
  it("uses the same orbit for Mars and Jupiter as the missions do", () => {
    for (const id of ["mars", "jupiter"]) {
      const scenario = scenarios.find((item) => item.id === id)!;
      const drawn = find(id);
      expect(drawn.au).toBeCloseTo(scenario.targetOrbitRadiusAU, 6);
      expect(drawn.orbitDays).toBeCloseTo(scenario.targetOrbitDays, 6);
    }
  });

  it("uses Earth's real year, the one the missions launch from", () => {
    const mars = scenarios.find((item) => item.id === "mars")!;
    expect(find("earth").orbitDays).toBeCloseTo(mars.startOrbitDays, 6);
    expect(find("earth").au).toBeCloseTo(mars.startRadiusAU, 6);
  });

  it("gives every mission a one-word difficulty for the home page pills", () => {
    for (const scenario of scenarios) {
      expect(scenario.difficulty).toMatch(/^\w+$/);
      expect(scenario.level.toLowerCase()).toContain(scenario.difficulty.toLowerCase());
    }
  });
});
