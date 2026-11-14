import { describe, expect, it } from "vitest";
import { DEMO_SCENARIO, demoSchedule, isDemo } from "./demo";
import { findEventDef, findScenario, settings } from "../data/game";

describe("demo mode", () => {
  it("turns on only for ?demo=1", () => {
    expect(isDemo("?demo=1")).toBe(true);
    expect(isDemo("?demo=1&other=2")).toBe(true);
    expect(isDemo("")).toBe(false);
    expect(isDemo("?demo=0")).toBe(false);
    expect(isDemo("?demo")).toBe(false);
  });

  it("flies a mission that exists", () => {
    expect(findScenario(DEMO_SCENARIO)).toBeDefined();
  });

  it("flies Mars, where the trip is long enough to space the cards out", () => {
    const scenario = findScenario(DEMO_SCENARIO)!;
    // On the Moon a 3-day photograph would overlap the later cards.
    expect(scenario.tripDays).toBeGreaterThan(100);
  });

  it("shows every card inside the first half-minute of a 75-second cruise", () => {
    const total = 240;
    const schedule = demoSchedule(total);
    expect(schedule.length).toBeGreaterThanOrEqual(4);
    for (const slot of schedule) {
      expect(slot.day).toBeGreaterThan(0);
      // 40% of the cruise is 30 seconds of the 75 the whole trip takes.
      expect(slot.day / total, slot.defId).toBeLessThanOrEqual(0.4);
    }
  });

  it("keeps the cards in order and apart", () => {
    const schedule = demoSchedule(240);
    for (let i = 1; i < schedule.length; i += 1) {
      expect(schedule[i].day).toBeGreaterThan(schedule[i - 1].day);
    }
  });

  it("only names challenges that exist", () => {
    for (const slot of demoSchedule(240)) {
      expect(findEventDef(slot.defId), slot.defId).toBeDefined();
    }
  });

  it("shows a problem and an opportunity, not just trouble", () => {
    const kinds = demoSchedule(240).map((slot) => findEventDef(slot.defId)!.kind);
    expect(kinds).toContain("problem");
    expect(kinds).toContain("opportunity");
  });

  it("includes a card that causes a follow-up, to show cause and effect", () => {
    const ids = demoSchedule(240).map((slot) => slot.defId);
    // At least one of the demo's cards has a later challenge that follows from it.
    const hasFollowUp = ids.some((id) => findEventDefsFollowing(id).length > 0);
    expect(hasFollowUp).toBe(true);
  });

  it("starts every card unfired", () => {
    expect(demoSchedule(240).every((slot) => !slot.fired)).toBe(true);
  });

  it("draws no more cards than a normal mission would", () => {
    expect(demoSchedule(240).length).toBeLessThanOrEqual(settings.eventsPerMission.max);
  });
});

/** Challenges that arrive because of a choice made on `defId`. */
function findEventDefsFollowing(defId: string) {
  return [
    "debrisDamage",
    "assistCheck",
    "extraData",
  ].filter((id) => findEventDef(id)?.follows?.eventId === defId);
}
