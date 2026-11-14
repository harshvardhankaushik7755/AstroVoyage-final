import { describe, expect, it } from "vitest";
import { G0, deltaV, designDeltaV, dryMass, fuelForDeltaV, fuelNeeded, wetMass } from "./rocketEquation";
import type { Design } from "../data/game";
import { presetDesign, scenarios } from "../data/game";

const moonDesign = presetDesign(scenarios[0]);

describe("the rocket equation", () => {
  it("uses standard gravity", () => {
    expect(G0).toBeCloseTo(9.80665, 5);
  });

  it("matches the formula worked by hand", () => {
    // Isp 320 s, mass ratio 2 -> 320 x 9.80665 x ln(2) = 2175.0 m/s
    const expected = (320 * G0 * Math.log(2)) / 1000;
    expect(deltaV(320, 2000, 1000)).toBeCloseTo(expected, 6);
    expect(deltaV(320, 2000, 1000)).toBeCloseTo(2.175, 3);
  });

  it("gives an ion engine far more Δv than a chemical one for the same fuel", () => {
    const chemical = deltaV(320, 2000, 1000);
    const ion = deltaV(3000, 2000, 1000);
    expect(ion).toBeGreaterThan(chemical * 9);
  });

  it("gives no Δv when there is no fuel", () => {
    expect(deltaV(320, 1000, 1000)).toBe(0);
  });

  it("never returns a negative or infinite answer for nonsense input", () => {
    expect(deltaV(320, 500, 1000)).toBe(0); // lighter at the start than the end
    expect(deltaV(0, 2000, 1000)).toBe(0);
    expect(deltaV(320, 2000, 0)).toBe(0);
    expect(Number.isFinite(deltaV(320, 2000, 1000))).toBe(true);
  });

  it("is reversible: the fuel it asks for delivers the Δv it was asked about", () => {
    const dry = 1000;
    const want = 3.5;
    const fuel = fuelForDeltaV(320, dry, want);
    expect(deltaV(320, dry + fuel, dry)).toBeCloseTo(want, 6);
  });

  it("asks for more fuel the more Δv is wanted", () => {
    const a = fuelForDeltaV(320, 1000, 2);
    const b = fuelForDeltaV(320, 1000, 4);
    expect(b).toBeGreaterThan(a);
    // Δv grows with the log of the mass ratio, so doubling Δv more than doubles the fuel.
    expect(b).toBeGreaterThan(a * 2);
  });

  it("asks for no fuel when no Δv is wanted", () => {
    expect(fuelForDeltaV(320, 1000, 0)).toBe(0);
    expect(fuelForDeltaV(320, 1000, -1)).toBe(0);
  });
});

describe("a design's mass", () => {
  it("adds up every part that flies, and leaves the rocket out", () => {
    // Small bus 250 + camera 20 + magnetometer 5 + small panels 40 + small antenna 5 + chemical 30
    expect(dryMass(moonDesign)).toBe(350);
  });

  it("counts the fuel in the wet mass", () => {
    expect(wetMass(moonDesign)).toBe(350 + moonDesign.fuelKg);
  });

  it("ignores a negative fuel load rather than subtracting it", () => {
    const silly: Design = { ...moonDesign, fuelKg: -500 };
    expect(wetMass(silly)).toBe(dryMass(silly));
  });

  it("counts nothing for an unknown part id", () => {
    const broken: Design = { ...moonDesign, bodyId: "nope", instrumentIds: [], fuelKg: 0 };
    // panels 40 + antenna 5 + engine 30
    expect(dryMass(broken)).toBe(75);
  });
});

describe("a design's Δv", () => {
  it("gives every preset enough Δv to brake into orbit at the far end", () => {
    // The rocket covers getting off Earth; the spacecraft's own engine has to
    // manage the course corrections and the braking burn. See
    // spacecraftDeltaVNeeded in checks.ts for the split.
    for (const scenario of scenarios) {
      const design = presetDesign(scenario);
      expect(designDeltaV(design), scenario.id).toBeGreaterThan(scenario.insertionDeltaV);
    }
  });

  it("rounds the fuel it asks for up, never down", () => {
    const needed = fuelNeeded(moonDesign, 4.0);
    expect(Number.isInteger(needed)).toBe(true);
    expect(designDeltaV({ ...moonDesign, fuelKg: needed })).toBeGreaterThanOrEqual(4.0);
  });

  it("asks for no fuel for an engine that does not exist", () => {
    expect(fuelNeeded({ ...moonDesign, engineId: "nope" }, 4)).toBe(0);
    expect(designDeltaV({ ...moonDesign, engineId: "nope" })).toBe(0);
  });
});
