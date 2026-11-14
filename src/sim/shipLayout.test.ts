import { describe, expect, it } from "vitest";
import {
  MAX_DRAWN_INSTRUMENTS,
  partName,
  shipLayout,
  spriteHaloRadius,
  spriteScale,
  spriteTailX,
} from "./shipLayout";
import { presetDesign, scenarios } from "../data/game";

const design = presetDesign(scenarios[0]);

describe("the spacecraft's shape comes from the design", () => {
  it("makes a bigger bus for a heavier one", () => {
    const small = shipLayout({ ...design, bodyId: "small" });
    const large = shipLayout({ ...design, bodyId: "large" });
    expect(large.bus.w).toBeGreaterThan(small.bus.w);
  });

  it("grows the bus by the cube root of mass, not straight with it", () => {
    const small = shipLayout({ ...design, bodyId: "small" }); // 250 kg
    const large = shipLayout({ ...design, bodyId: "large" }); // 1000 kg, 4x the mass
    // Four times the mass is about 1.6x the size, not 4x.
    expect(large.bus.w / small.bus.w).toBeCloseTo(Math.cbrt(4), 2);
  });

  it("makes longer wings for panels that produce more power", () => {
    const smallPanels = shipLayout({ ...design, powerId: "solarSmall" });
    const bigPanels = shipLayout({ ...design, powerId: "solarLarge" });
    expect(bigPanels.panel!.length).toBeGreaterThan(smallPanels.panel!.length);
  });

  it("draws no wings at all for a nuclear battery", () => {
    const nuclear = shipLayout({ ...design, powerId: "rtg" });
    expect(nuclear.panel).toBeNull();
    expect(nuclear.rtg).toBe(true);
  });

  it("makes a bigger dish for a faster antenna", () => {
    const small = shipLayout({ ...design, antennaId: "antSmall" });
    const large = shipLayout({ ...design, antennaId: "antLarge" });
    expect(large.dish.r).toBeGreaterThan(small.dish.r);
  });

  it("draws one box per instrument", () => {
    expect(shipLayout({ ...design, instrumentIds: [] }).sensors).toHaveLength(0);
    expect(shipLayout({ ...design, instrumentIds: ["camera"] }).sensors).toHaveLength(1);
    expect(
      shipLayout({ ...design, bodyId: "medium", instrumentIds: ["camera", "radar"] }).sensors,
    ).toHaveLength(2);
  });

  it("stops drawing boxes after three, but still counts them", () => {
    const crowded = shipLayout({
      ...design,
      bodyId: "large",
      instrumentIds: ["camera", "radar", "weather", "magnetometer", "spectrometer"],
    });
    expect(crowded.sensors).toHaveLength(MAX_DRAWN_INSTRUMENTS);
    expect(crowded.instrumentCount).toBe(5);
  });

  it("gives an ion engine a smaller bell than a chemical one", () => {
    const chemical = shipLayout({ ...design, engineId: "chemical" });
    const ion = shipLayout({ ...design, engineId: "ion" });
    expect(ion.nozzle.h).toBeLessThan(chemical.nozzle.h);
  });

  it("always has a positive extent, even with nothing fitted", () => {
    const bare = shipLayout({
      bodyId: "nope",
      instrumentIds: [],
      powerId: "nope",
      antennaId: "nope",
      engineId: "nope",
      rocketId: "nope",
      fuelKg: 0,
    });
    expect(bare.width).toBeGreaterThan(0);
    expect(bare.height).toBeGreaterThan(0);
  });

  it("counts the wings in the overall height", () => {
    const withPanels = shipLayout({ ...design, powerId: "solarLarge" });
    expect(withPanels.height).toBeGreaterThan(withPanels.bus.h);
  });
});

describe("fitting the sprite into a box", () => {
  it("scales the longest side to the box", () => {
    const layout = shipLayout(design);
    const scale = spriteScale(layout, 100);
    expect(Math.max(layout.width, layout.height) * scale).toBeCloseTo(100, 6);
  });

  it("gives a halo that fits around the sprite", () => {
    const layout = shipLayout(design);
    const halo = spriteHaloRadius(layout);
    expect(halo).toBeGreaterThan(0);
    // Big enough to glow, small enough not to swamp the map.
    expect(halo).toBeLessThan(Math.max(layout.width, layout.height));
  });

  it("puts the engine plume behind the spacecraft", () => {
    const layout = shipLayout(design);
    expect(spriteTailX(layout)).toBeLessThan(0);
  });

  it("never divides by zero for an empty layout", () => {
    expect(spriteScale({ width: 0, height: 0 } as never, 100)).toBe(1);
  });
});

describe("naming a part for a message", () => {
  it("uses the real name of the part that was chosen", () => {
    expect(partName(design, "body")).toBe("Small bus");
    expect(partName(design, "power")).toBe("Small solar panels");
    expect(partName(design, "antenna")).toBe("Small antenna");
    expect(partName(design, "engine")).toBe("Chemical engine");
  });

  it("names a single instrument, and counts the rest", () => {
    expect(partName({ ...design, instrumentIds: ["camera"] }, "instruments")).toBe("Camera");
    expect(partName(design, "instruments")).toBe("Camera and 1 more");
  });

  it("falls back to a plain word when nothing is fitted", () => {
    expect(partName({ ...design, instrumentIds: [] }, "instruments")).toBe("instruments");
    expect(partName({ ...design, bodyId: "nope" }, "body")).toBe("spacecraft body");
  });
});
