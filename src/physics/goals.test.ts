import { describe, expect, it } from "vitest";
import { withGoalInstrument } from "./goals";
import { runChecks } from "./checks";
import { tripLength } from "./missionFacts";
import {
  findBody,
  findInstruments,
  missionGoal,
  parts,
  presetDesign,
  scenarios,
} from "../data/game";

describe("every mission's goals", () => {
  it("gives each mission at least two real goals", () => {
    for (const scenario of scenarios) {
      expect(scenario.goals.length).toBeGreaterThanOrEqual(2);
      const ids = scenario.goals.map((goal) => goal.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("names an instrument the game actually has", () => {
    const known = new Set(parts.instruments.map((instrument) => instrument.id));
    for (const scenario of scenarios) {
      for (const goal of scenario.goals) expect(known.has(goal.instrumentId)).toBe(true);
    }
  });

  it("gives every goal an icon and a label a child can read", () => {
    for (const scenario of scenarios) {
      for (const goal of scenario.goals) {
        expect(goal.icon.length).toBeGreaterThan(0);
        expect(goal.label.length).toBeGreaterThan(8);
        expect(goal.label).not.toMatch(/[A-Z]{3}/); // no acronyms
      }
    }
  });

  it("defaults to the first goal, and to the first for an id nobody has", () => {
    for (const scenario of scenarios) {
      expect(missionGoal(scenario).id).toBe(scenario.goals[0].id);
      expect(missionGoal(scenario, null).id).toBe(scenario.goals[0].id);
      expect(missionGoal(scenario, "no-such-goal").id).toBe(scenario.goals[0].id);
      const last = scenario.goals[scenario.goals.length - 1];
      expect(missionGoal(scenario, last.id).id).toBe(last.id);
    }
  });
});

describe("the launch check that asks whether it can do the job", () => {
  const mars = scenarios.find((scenario) => scenario.id === "mars")!;

  it("does not run at all when no goal was picked", () => {
    expect(runChecks(presetDesign(mars), mars, "slow").goal).toBeUndefined();
  });

  it("passes when the instrument is on board", () => {
    const goal = missionGoal(mars); // photos, which needs the camera
    const check = runChecks(presetDesign(mars), mars, "slow", goal).goal!;
    expect(check.ok).toBe(true);
    expect(check.short.toLowerCase()).toContain("camera");
  });

  it("fails, and says what to add, when it is not", () => {
    const water = mars.goals.find((goal) => goal.id === "water")!;
    const check = runChecks(presetDesign(mars), mars, "slow", water).goal!;
    expect(check.ok).toBe(false);
    expect(check.message.toLowerCase()).toContain("spectrometer");
    expect(check.message).toContain("Instruments");
  });

  it("blocks the launch, and comes first so it is read first", () => {
    const water = mars.goals.find((goal) => goal.id === "water")!;
    const result = runChecks(presetDesign(mars), mars, "slow", water);
    expect(result.allOk).toBe(false);
    expect(result.checks[0].id).toBe("goal");
  });
});

describe("making a design able to do its goal", () => {
  it("adds the instrument when there is room", () => {
    const mars = scenarios.find((scenario) => scenario.id === "mars")!;
    const water = mars.goals.find((goal) => goal.id === "water")!;
    const fixed = withGoalInstrument(presetDesign(mars), water);
    expect(fixed.instrumentIds).toContain("spectrometer");
  });

  it("leaves a design that already carries it exactly as it was", () => {
    const mars = scenarios.find((scenario) => scenario.id === "mars")!;
    const design = presetDesign(mars);
    expect(withGoalInstrument(design, missionGoal(mars))).toBe(design);
  });

  it("never overfills the spacecraft", () => {
    for (const scenario of scenarios) {
      for (const goal of scenario.goals) {
        const fixed = withGoalInstrument(presetDesign(scenario), goal);
        const slots = findBody(fixed.bodyId)?.slots ?? 0;
        expect(fixed.instrumentIds.length).toBeLessThanOrEqual(slots);
        expect(fixed.instrumentIds).toContain(goal.instrumentId);
      }
    }
  });

  it("does nothing at all without a goal", () => {
    const moon = scenarios[0];
    const design = presetDesign(moon);
    expect(withGoalInstrument(design, undefined)).toBe(design);
  });
});

/**
 * The trap this guards against: "Load a design that works" handing back a
 * design that fails the very first check because the player picked a goal the
 * preset was not built for. Every mission, every goal, no dead ends.
 */
describe("no goal is a dead end", () => {
  for (const scenario of scenarios) {
    for (const goal of scenario.goals) {
      it(`${scenario.id}: "${goal.label}" can be flown from the preset`, () => {
        const design = withGoalInstrument(presetDesign(scenario), goal);
        const result = runChecks(design, scenario, scenario.preset.route, goal);
        const failed = result.checks.filter((check) => !check.ok).map((check) => check.label);
        expect(failed).toEqual([]);
        expect(result.allOk).toBe(true);
      });
    }
  }

  it("every mission's first goal is one the untouched preset already satisfies", () => {
    for (const scenario of scenarios) {
      const first = missionGoal(scenario);
      expect(presetDesign(scenario).instrumentIds).toContain(first.instrumentId);
    }
  });
});

describe("how long the trip takes, in words", () => {
  it("uses the biggest unit that still reads plainly", () => {
    const byId = (id: string) => scenarios.find((scenario) => scenario.id === id)!;
    expect(tripLength(byId("moon"))).toBe("about 3 days");
    expect(tripLength(byId("mars"))).toBe("about 8 months");
    expect(tripLength(byId("jupiter"))).toBe("about 5 years");
  });

  it("says one day, not one days, and changes unit where it should", () => {
    const moon = scenarios.find((scenario) => scenario.id === "moon")!;
    expect(tripLength({ ...moon, tripDays: 1 })).toBe("about 1 day");
    // Under two months it stays in days, because "about 30 days" is easier to
    // picture than "about 1 month" for a trip you are about to watch.
    expect(tripLength({ ...moon, tripDays: 30.44 })).toBe("about 30 days");
    expect(tripLength({ ...moon, tripDays: 70 })).toBe("about 2 months");
    expect(tripLength({ ...moon, tripDays: 365.25 })).toBe("about 12 months");
    expect(tripLength({ ...moon, tripDays: 1200 })).toBe("about 3 years");
  });

  it("agrees with what each mission's own description claims", () => {
    const jupiter = scenarios.find((scenario) => scenario.id === "jupiter")!;
    expect(jupiter.description).toContain("5 years");
    expect(tripLength(jupiter)).toContain("5 years");
  });
});

describe("the instruments the goals point at", () => {
  it("are all affordable inside the mission that asks for them", () => {
    for (const scenario of scenarios) {
      for (const goal of scenario.goals) {
        const instrument = findInstruments([goal.instrumentId])[0];
        expect(instrument).toBeDefined();
        expect(instrument.cost).toBeLessThan(scenario.budget);
      }
    }
  });
});
