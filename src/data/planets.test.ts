import { describe, expect, it } from "vitest";
import { planets, scenarios, worldLook } from "./game";

describe("how the worlds are drawn", () => {
  it("has a look for every mission's target, keyed by the mission", () => {
    for (const scenario of scenarios) {
      expect(Object.keys(planets.worlds)).toContain(scenario.id);
    }
  });

  it("gives an unknown world a plain face rather than crashing", () => {
    expect(worldLook("no-such-world")).toEqual({});
  });

  it("gives each world something of its own", () => {
    expect(worldLook("moon").craters).toBeGreaterThan(0);
    expect(worldLook("mars").polarCap).toBe(true);
    expect(worldLook("jupiter").bands).toBeGreaterThan(0);
    expect(worldLook("jupiter").spot).toBe(true);
  });

  it("names a colour wherever it asks for a feature", () => {
    for (const [id, look] of Object.entries(planets.worlds)) {
      if (look.bands) expect(look.bandColor, `${id} bands`).toBeDefined();
      if (look.polarCap) expect(look.capColor, `${id} cap`).toBeDefined();
      if (look.craters) expect(look.craterColor, `${id} craters`).toBeDefined();
      if (look.spot) expect(look.spotColor, `${id} spot`).toBeDefined();
    }
  });

  it("keeps the highlight inside the world it lights", () => {
    expect(planets.light.offsetShare).toBeGreaterThan(0);
    expect(planets.light.offsetShare).toBeLessThan(0.5);
    expect(planets.light.glowShare).toBeGreaterThan(1);
  });

  it("writes every colour as a hex a browser will take", () => {
    const hex = /^#[0-9a-f]{6}$/i;
    const all = [
      planets.sun.color,
      planets.sun.coreColor,
      planets.earth.color,
      planets.earth.capColor,
      ...Object.values(planets.worlds).flatMap((look) =>
        [look.bandColor, look.capColor, look.craterColor, look.spotColor].filter(
          (value): value is string => value !== undefined,
        ),
      ),
    ];
    for (const colour of all) expect(colour).toMatch(hex);
  });

  it("draws the small Earth smaller than the one you orbit", () => {
    expect(planets.earth.smallRadius).toBeLessThan(planets.earth.radius);
  });
});
