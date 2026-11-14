import { describe, expect, it } from "vitest";
import { powerAtTarget, powerAvailable, powerMargin, powerNeeded, sunlightFactor } from "./power";
import { findPower, presetDesign, scenarios } from "../data/game";

const [moon, mars, jupiter] = scenarios;

describe("sunlight", () => {
  it("is full strength at Earth", () => {
    expect(sunlightFactor(1)).toBe(1);
  });

  it("obeys the inverse-square law", () => {
    expect(sunlightFactor(2)).toBeCloseTo(0.25, 10);
    expect(sunlightFactor(3)).toBeCloseTo(1 / 9, 10);
  });

  it("matches the real figures for Mars and Jupiter", () => {
    // NASA NSSDCA: Mars about 43% of Earth's sunlight, Jupiter about 3.7%.
    expect(sunlightFactor(mars.distanceAU)).toBeCloseTo(0.43, 2);
    expect(sunlightFactor(jupiter.distanceAU)).toBeCloseTo(0.037, 3);
  });

  it("gives nothing for a nonsense distance", () => {
    expect(sunlightFactor(0)).toBe(0);
    expect(sunlightFactor(-1)).toBe(0);
  });
});

describe("power sources", () => {
  const solar = findPower("solarSmall")!;
  const rtg = findPower("rtg")!;

  it("drops a solar panel's output with distance", () => {
    expect(powerAvailable(solar, 1)).toBe(600);
    expect(powerAvailable(solar, 2)).toBeCloseTo(150, 6);
  });

  it("gives an RTG the same power everywhere — that is the whole point of it", () => {
    expect(powerAvailable(rtg, 1)).toBe(110);
    expect(powerAvailable(rtg, 5.2)).toBe(110);
    expect(powerAvailable(rtg, 30)).toBe(110);
  });

  it("beats the big panels at Jupiter even though it makes less power at Earth", () => {
    const bigSolar = findPower("solarLarge")!;
    expect(powerAvailable(bigSolar, 1)).toBeGreaterThan(powerAvailable(rtg, 1));
    expect(powerAvailable(rtg, jupiter.distanceAU)).toBeGreaterThan(
      powerAvailable(bigSolar, jupiter.distanceAU),
    );
  });
});

describe("what a design needs", () => {
  const moonDesign = presetDesign(moon);

  it("adds up the instruments, the antenna and an electric engine", () => {
    // camera 30 + magnetometer 5 + small antenna 20 + chemical engine 0
    expect(powerNeeded(moonDesign)).toBe(55);
  });

  it("counts the 1,000 W an ion engine wants", () => {
    const ionDesign = { ...moonDesign, engineId: "ion" };
    expect(powerNeeded(ionDesign)).toBe(55 + 1000);
  });

  it("leaves every preset with power to spare at its target", () => {
    for (const scenario of scenarios) {
      const design = presetDesign(scenario);
      expect(powerMargin(design, scenario.distanceAU), scenario.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("gives the same design much less power at Jupiter than at the Moon", () => {
    const atMoon = powerAtTarget(moonDesign, moon.distanceAU);
    const atJupiter = powerAtTarget(moonDesign, jupiter.distanceAU);
    expect(atJupiter).toBeLessThan(atMoon / 20);
  });

  it("gives no power for a power source that does not exist", () => {
    expect(powerAtTarget({ ...moonDesign, powerId: "nope" }, 1)).toBe(0);
  });
});
