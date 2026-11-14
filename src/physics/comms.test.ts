import { describe, expect, it } from "vitest";
import {
  BASE_DATA_RATE,
  LIGHT_MINUTES_PER_AU,
  commsDistanceAU,
  designScienceShare,
  formatDelay,
  missionDelayMinutes,
  scienceShareHome,
  signalDelayMinutes,
} from "./comms";
import { findAntenna, scenarios } from "../data/game";

const [moon, mars, jupiter] = scenarios;

describe("signal delay", () => {
  it("uses the real time light takes to cross an AU", () => {
    expect(LIGHT_MINUTES_PER_AU).toBeCloseTo(8.317, 3);
  });

  it("grows straight with distance", () => {
    expect(signalDelayMinutes(1)).toBeCloseTo(8.317, 3);
    expect(signalDelayMinutes(2)).toBeCloseTo(16.634, 3);
  });

  it("measures a Moon mission from Earth, not from the Sun", () => {
    // Otherwise the Moon would appear to have an 8-minute delay instead of ~1.3 s.
    expect(commsDistanceAU(moon)).toBe(moon.targetOrbitRadiusAU);
    expect(commsDistanceAU(mars)).toBe(mars.distanceAU);
  });

  it("gives delays that match the real missions", () => {
    expect(missionDelayMinutes(moon) * 60).toBeCloseTo(1.28, 1); // about 1.3 seconds
    expect(missionDelayMinutes(mars)).toBeCloseTo(12.6, 1); // about 12.6 minutes
    expect(missionDelayMinutes(jupiter)).toBeCloseTo(43.2, 1); // about 43 minutes
  });

  it("never goes negative", () => {
    expect(signalDelayMinutes(-5)).toBe(0);
  });
});

describe("saying the delay in plain English", () => {
  it("uses seconds when it is under a minute", () => {
    expect(formatDelay(0.0214)).toBe("1.3 seconds");
  });

  it("uses minutes for an inner-planet trip", () => {
    expect(formatDelay(12.64)).toBe("12.6 minutes");
  });

  it("uses hours when it gets that far", () => {
    expect(formatDelay(72)).toBe("1 hour 12 minutes");
    expect(formatDelay(120)).toBe("2 hours");
  });
});

describe("how much science gets home", () => {
  const small = findAntenna("antSmall")!;
  const large = findAntenna("antLarge")!;

  it("measures antennas against the slowest one in the game", () => {
    expect(BASE_DATA_RATE).toBe(small.dataRate);
  });

  it("gets everything home from the Moon on any antenna", () => {
    expect(scienceShareHome(small, moon)).toBe(1);
    expect(scienceShareHome(large, moon)).toBe(1);
  });

  it("is the headline trade-off at Mars: 10% on the small dish, all of it on the large one", () => {
    expect(scienceShareHome(small, mars)).toBeCloseTo(0.1, 6);
    expect(scienceShareHome(large, mars)).toBe(1);
  });

  it("punishes the small antenna hardest at Jupiter", () => {
    expect(scienceShareHome(small, jupiter)).toBeCloseTo(0.05, 6);
    expect(scienceShareHome(large, jupiter)).toBeCloseTo(0.5, 6);
  });

  it("never claims more science gets home than was collected", () => {
    for (const scenario of scenarios) {
      for (const antenna of [small, large]) {
        const share = scienceShareHome(antenna, scenario);
        expect(share, `${scenario.id}/${antenna.id}`).toBeLessThanOrEqual(1);
        expect(share, `${scenario.id}/${antenna.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("gets nothing home with no antenna fitted", () => {
    expect(designScienceShare("nope", mars)).toBe(0);
  });
});
