import { describe, expect, it } from "vitest";
import {
  CALENDAR_MONTHS,
  isWindowOpen,
  monthLabel,
  monthsToWait,
  nextWindow,
  openWindows,
  requiredDeltaV,
  tripDays,
  windowMessage,
} from "./windows";
import { scenarios, settings } from "../data/game";

const [moon, mars, jupiter] = scenarios;

describe("the calendar", () => {
  it("covers two years, so Jupiter shows two windows and Mars one", () => {
    expect(CALENDAR_MONTHS).toBe(24);
  });

  it("names months in a way a 12-year-old can read", () => {
    expect(monthLabel(0)).toBe("Jan 2027");
    expect(monthLabel(10)).toBe("Nov 2027");
    expect(monthLabel(12)).toBe("Jan 2028");
    expect(monthLabel(17)).toBe("Jun 2028");
  });
});

describe("launch windows", () => {
  it("lets a Moon mission go any month", () => {
    for (let month = 0; month < CALENDAR_MONTHS; month += 1) {
      expect(isWindowOpen(moon, month), `month ${month}`).toBe(true);
    }
    expect(openWindows(moon)).toHaveLength(CALENDAR_MONTHS);
  });

  it("opens the Mars window once in two years, every 26 months", () => {
    expect(openWindows(mars)).toEqual([10]);
  });

  it("opens the Jupiter window twice in two years, every 13 months", () => {
    expect(openWindows(jupiter)).toEqual([4, 17]);
  });

  it("makes Mars the rarer chance, which is the lesson", () => {
    expect(openWindows(mars).length).toBeLessThan(openWindows(jupiter).length);
  });

  it("agrees with every preset's chosen launch month", () => {
    for (const scenario of scenarios) {
      expect(isWindowOpen(scenario, scenario.preset.launchMonth), scenario.id).toBe(true);
    }
  });

  it("finds the next window and says how long the wait is", () => {
    expect(nextWindow(mars, 0)).toBe(10);
    expect(monthsToWait(mars, 0)).toBe(10);
    expect(monthsToWait(mars, 10)).toBe(0);
    expect(nextWindow(jupiter, 5)).toBe(17);
  });

  it("admits when the calendar runs out before the next window", () => {
    expect(nextWindow(mars, 11)).toBeNull();
    expect(monthsToWait(mars, 11)).toBeNull();
  });

  it("handles a month before the offset without going haywire", () => {
    // A true modulo, so month 0 for an offset of 10 is simply closed, not negative.
    expect(isWindowOpen(mars, 0)).toBe(false);
    expect(isWindowOpen(jupiter, 0)).toBe(false);
  });
});

describe("what the window message says", () => {
  it("tells a Moon player there is nothing to wait for", () => {
    expect(windowMessage(moon, 0)).toContain("no launch window");
  });

  it("confirms an open window", () => {
    expect(windowMessage(mars, 10)).toContain("is a launch window");
  });

  it("names the next window when the chosen month is closed", () => {
    const message = windowMessage(mars, 3);
    expect(message).toContain("Nov 2027");
    expect(message).toContain("not in the right place");
  });
});

describe("routes", () => {
  it("needs the cruise Δv plus the braking burn", () => {
    expect(requiredDeltaV(mars, "slow")).toBeCloseTo(mars.deltaV + mars.insertionDeltaV, 6);
  });

  it("makes the fast route cost more Δv and less time", () => {
    expect(requiredDeltaV(mars, "fast")).toBeGreaterThan(requiredDeltaV(mars, "slow"));
    expect(tripDays(mars, "fast")).toBeLessThan(tripDays(mars, "slow"));
  });

  it("keeps the slow route as the plain trip time from the data", () => {
    expect(tripDays(mars, "slow")).toBe(mars.tripDays);
  });

  it("scales by exactly the factors in settings.json", () => {
    expect(requiredDeltaV(mars, "fast")).toBeCloseTo(
      (mars.deltaV + mars.insertionDeltaV) * settings.routes.fast.deltaVFactor,
      6,
    );
    expect(tripDays(jupiter, "fast")).toBe(
      Math.round(jupiter.tripDays * settings.routes.fast.tripFactor),
    );
  });

  it("always returns a whole number of days", () => {
    for (const scenario of scenarios) {
      for (const route of ["fast", "slow"] as const) {
        expect(Number.isInteger(tripDays(scenario, route)), `${scenario.id}/${route}`).toBe(true);
      }
    }
  });
});
