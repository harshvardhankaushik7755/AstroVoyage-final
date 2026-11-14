import { describe, expect, it } from "vitest";
import { designFlags, runChecks, spacecraftDeltaVNeeded, totalCost, totalScience } from "./checks";
import type { Design } from "../data/game";
import { findRocket, presetDesign, scenarios, settings } from "../data/game";

const [moon, mars, jupiter] = scenarios;

describe("what a design costs and is worth", () => {
  const moonDesign = presetDesign(moon);

  it("adds up the parts, the rocket and the fuel", () => {
    // bus 30 + camera 10 + magnetometer 3 + panels 8 + antenna 2 + engine 10 + rocket 70
    // + 1400 kg of fuel at $0.01M/kg = 14
    expect(totalCost(moonDesign)).toBeCloseTo(147, 1);
  });

  it("charges for fuel, so more fuel really does cost money", () => {
    const thirsty: Design = { ...moonDesign, fuelKg: moonDesign.fuelKg + 1000 };
    expect(totalCost(thirsty)).toBeCloseTo(totalCost(moonDesign) + 10, 1);
  });

  it("adds up the science the instruments are worth", () => {
    expect(totalScience(moonDesign)).toBe(18); // camera 10 + magnetometer 8
  });
});

describe("the five launch checks", () => {
  it("passes every scenario's tested preset", () => {
    for (const scenario of scenarios) {
      const result = runChecks(presetDesign(scenario), scenario, scenario.preset.route);
      const failed = result.checks.filter((c) => !c.ok).map((c) => `${c.id}: ${c.message}`);
      expect(failed, `${scenario.id} preset should fly`).toEqual([]);
      expect(result.allOk, scenario.id).toBe(true);
    }
  });

  it("reports all five, in the order the screen shows them", () => {
    const result = runChecks(presetDesign(moon), moon, "slow");
    expect(result.checks.map((c) => c.id)).toEqual(["budget", "mass", "power", "fuel", "comms"]);
  });

  it("gives every check a sentence, whether it passed or failed", () => {
    const result = runChecks(presetDesign(moon), moon, "slow");
    for (const check of result.checks) {
      expect(check.message.length, check.id).toBeGreaterThan(10);
      expect(check.message.endsWith("."), check.id).toBe(true);
    }
  });

  it("catches a design that costs too much, and says by how much", () => {
    const expensive: Design = { ...presetDesign(mars), powerId: "rtg", bodyId: "large" };
    const result = runChecks(expensive, mars, "slow");
    expect(result.budget.ok).toBe(false);
    expect(result.budget.message).toContain("Over budget by $");
    expect(result.allOk).toBe(false);
  });

  it("catches a spacecraft the rocket cannot lift", () => {
    const heavy: Design = { ...presetDesign(moon), rocketId: "light", fuelKg: 5000 };
    const result = runChecks(heavy, moon, "slow");
    expect(result.mass.ok).toBe(false);
    expect(result.mass.message).toContain("Too heavy by");
  });

  it("catches solar panels that cannot work at Jupiter", () => {
    const solarAtJupiter: Design = { ...presetDesign(jupiter), powerId: "solarSmall" };
    const result = runChecks(solarAtJupiter, jupiter, "slow");
    expect(result.power.ok).toBe(false);
    expect(result.power.message).toContain("Sunlight is weaker out there");
  });

  it("catches a design with too little fuel, and names the Δv it needs", () => {
    const dry: Design = { ...presetDesign(mars), fuelKg: 100 };
    const result = runChecks(dry, mars, "slow");
    expect(result.fuel.ok).toBe(false);
    expect(result.fuel.message).toContain("km/s is needed");
  });

  it("warns when the fuel is only just enough", () => {
    // Between the bare requirement and the margin the checks ask for.
    const design = presetDesign(mars);
    for (let fuel = design.fuelKg; fuel > 0; fuel -= 1) {
      const result = runChecks({ ...design, fuelKg: fuel }, mars, "slow");
      if (!result.fuel.ok && result.fuel.message.includes("barely enough")) {
        expect(result.fuel.message).toContain("safety margin");
        return;
      }
    }
    throw new Error("never hit the barely-enough band");
  });

  it("catches an antenna too small to get the science home", () => {
    const whisper: Design = { ...presetDesign(mars), antennaId: "antSmall" };
    const result = runChecks(whisper, mars, "slow");
    expect(result.comms.ok).toBe(false);
    expect(result.comms.message).toContain("A bigger dish sends much more");
  });

  it("fails a design with no instruments at all, even if every number passes", () => {
    const pointless: Design = { ...presetDesign(moon), instrumentIds: [] };
    const result = runChecks(pointless, moon, "slow");
    expect(result.science).toBe(0);
    expect(result.allOk).toBe(false);
  });

  it("makes the fast route harder to pass than the slow one", () => {
    const design = presetDesign(mars);
    const slow = runChecks(design, mars, "slow");
    const fast = runChecks(design, mars, "fast");
    expect(fast.fuel.limit).toBeGreaterThan(slow.fuel.limit);
  });

  it("works out how much science actually gets home", () => {
    const result = runChecks(presetDesign(mars), mars, "slow");
    expect(result.scienceShare).toBe(1); // the preset carries the large dish
    expect(result.scienceHome).toBe(result.science);

    const whisper = runChecks({ ...presetDesign(mars), antennaId: "antSmall" }, mars, "slow");
    expect(whisper.scienceHome).toBeLessThan(whisper.science);
  });

  it("asks for a fuel margin above the bare minimum", () => {
    const design = presetDesign(mars);
    const result = runChecks(design, mars, "slow");
    expect(result.fuel.limit).toBeCloseTo(
      spacecraftDeltaVNeeded(design, mars, "slow") * settings.fuelMargin,
      2,
    );
  });
});

describe("splitting the Δv between the rocket and the spacecraft", () => {
  it("asks the spacecraft only for what the rocket cannot provide", () => {
    const design = presetDesign(mars);
    const rocket = findRocket(design.rocketId)!;
    expect(spacecraftDeltaVNeeded(design, mars, "slow")).toBeCloseTo(
      mars.deltaV + mars.insertionDeltaV - rocket.deltaVProvided,
      6,
    );
  });

  it("means a bigger rocket needs less fuel on board — a real trade worth money", () => {
    const design = presetDesign(mars);
    const onLight = spacecraftDeltaVNeeded({ ...design, rocketId: "light" }, mars, "slow");
    const onHeavy = spacecraftDeltaVNeeded({ ...design, rocketId: "heavy" }, mars, "slow");
    expect(onHeavy).toBeLessThan(onLight);
  });

  it("never asks for a negative Δv when the rocket does everything", () => {
    const design = presetDesign(moon);
    // A heavy rocket provides 5.0 km/s; a Moon trip needs 4.8 in total.
    expect(spacecraftDeltaVNeeded({ ...design, rocketId: "heavy" }, moon, "slow")).toBe(0);
  });

  it("still asks for more on the fast route", () => {
    const design = presetDesign(mars);
    expect(spacecraftDeltaVNeeded(design, mars, "fast")).toBeGreaterThan(
      spacecraftDeltaVNeeded(design, mars, "slow"),
    );
  });
});

describe("design flags, which decide what can go wrong", () => {
  it("marks what the design is made of", () => {
    const flags = designFlags(presetDesign(moon), moon);
    expect(flags.has("small")).toBe(true);
    expect(flags.has("solar")).toBe(true);
    expect(flags.has("antSmall")).toBe(true);
    expect(flags.has("chemical")).toBe(true);
    expect(flags.has("hasInstruments")).toBe(true);
    expect(flags.has("rtg")).toBe(false);
    expect(flags.has("backup")).toBe(false);
  });

  it("marks a large bus as having backup systems", () => {
    const flags = designFlags({ ...presetDesign(moon), bodyId: "large" }, moon);
    expect(flags.has("large")).toBe(true);
    expect(flags.has("backup")).toBe(true);
  });

  it("marks three instruments, which is what protects against a fault", () => {
    const two = designFlags(presetDesign(moon), moon);
    expect(two.has("threeInstruments")).toBe(false);

    const three = designFlags(
      { ...presetDesign(moon), bodyId: "medium", instrumentIds: ["camera", "magnetometer", "weather"] },
      moon,
    );
    expect(three.has("threeInstruments")).toBe(true);
  });

  it("marks a nuclear battery, which is what protects against dust", () => {
    const flags = designFlags({ ...presetDesign(mars), powerId: "rtg" }, mars);
    expect(flags.has("rtg")).toBe(true);
    expect(flags.has("solar")).toBe(false);
  });

  it("marks the mission, so Mars and Jupiter get their own challenges", () => {
    expect(designFlags(presetDesign(mars), mars).has("mars")).toBe(true);
    expect(designFlags(presetDesign(jupiter), jupiter).has("jupiter")).toBe(true);
    expect(designFlags(presetDesign(moon), moon).has("mars")).toBe(false);
  });

  it("marks dust risk only where there is dust", () => {
    expect(designFlags(presetDesign(mars), mars).has("dustRisk")).toBe(true);
    expect(designFlags(presetDesign(moon), moon).has("dustRisk")).toBe(false);
    expect(designFlags(presetDesign(jupiter), jupiter).has("dustRisk")).toBe(false);
  });

  it("counts only Jupiter as an outer planet, so no gravity assist to the Moon or Mars", () => {
    expect(designFlags(presetDesign(jupiter), jupiter).has("outerPlanet")).toBe(true);
    expect(designFlags(presetDesign(mars), mars).has("outerPlanet")).toBe(false);
    expect(designFlags(presetDesign(moon), moon).has("outerPlanet")).toBe(false);
  });

  it("gives no instrument flag to a design carrying none", () => {
    const flags = designFlags({ ...presetDesign(moon), instrumentIds: [] }, moon);
    expect(flags.has("hasInstruments")).toBe(false);
  });
});
