/**
 * The Mission Design Lab review.
 *
 * Two kinds of test here. The formulas are checked against the definitions in
 * the NASA paper, by hand, because a sign error in one of them would quietly
 * make every review wrong in a way no screenshot would reveal. Then the review
 * itself is run over every mission's own tested preset, because a review that
 * fails the game's own shipped designs is a review nobody will trust.
 */
import { describe, expect, it } from "vitest";
import {
  asPercent,
  growthContingency,
  growthMargin,
  maximumExpectedValue,
  mdlReview,
  resourceContingency,
  resourceMargin,
} from "./margins";
import { mdlPolicy, presetDesign, scenarios } from "../data/game";
import type { Design } from "../data/game";

describe("the four margin formulas", () => {
  /* The paper's own worked example: a 1000 kg telescope carried at 1250 kg MEV. */
  const cbe = 1000;
  const mev = 1250;

  it("grows CBE into MEV by the contingency", () => {
    expect(maximumExpectedValue(1000, 0.25)).toBe(1250);
    expect(maximumExpectedValue(100, 0.3)).toBeCloseTo(130, 10);
    expect(maximumExpectedValue(0, 0.25)).toBe(0);
  });

  it("growth contingency is measured against CBE", () => {
    // (1250 - 1000) / 1000
    expect(growthContingency(cbe, mev)).toBeCloseTo(0.25, 10);
  });

  it("resource contingency is measured against MEV, so it is the smaller number", () => {
    // (1250 - 1000) / 1250
    expect(resourceContingency(cbe, mev)).toBeCloseTo(0.2, 10);
    expect(resourceContingency(cbe, mev)).toBeLessThan(growthContingency(cbe, mev));
  });

  it("growth margin is the spare above MEV, against MEV", () => {
    // MPV 1500 over MEV 1250
    expect(growthMargin(1250, 1500)).toBeCloseTo(0.2, 10);
  });

  it("resource margin is the spare above MEV, against MPV", () => {
    expect(resourceMargin(1250, 1500)).toBeCloseTo(1 / 6, 10);
  });

  it("resource margin goes negative exactly when the design does not close", () => {
    expect(resourceMargin(1600, 1500)).toBeLessThan(0);
    expect(resourceMargin(1500, 1500)).toBe(0);
    expect(resourceMargin(1400, 1500)).toBeGreaterThan(0);
  });

  it("does not divide by zero, and reports no margin rather than full margin", () => {
    expect(growthContingency(0, 10)).toBe(0);
    expect(resourceContingency(10, 0)).toBe(0);
    expect(growthMargin(0, 10)).toBe(0);
    // No limit at all, but something is needed: that is no margin, not fine.
    expect(resourceMargin(10, 0)).toBe(-1);
    expect(resourceMargin(0, 0)).toBe(0);
  });

  it("writes a share as a whole percentage", () => {
    expect(asPercent(0.253)).toBe("25%");
    expect(asPercent(0)).toBe("0%");
    expect(asPercent(-0.12)).toBe("-12%");
  });
});

describe("the review of a real design", () => {
  for (const scenario of scenarios) {
    describe(scenario.name, () => {
      const design = presetDesign(scenario);
      const review = mdlReview(design, scenario, scenario.preset.route);

      it("reviews all five subsystems", () => {
        expect(review.rows).toHaveLength(5);
        expect(new Set(review.rows.map((row) => row.id)).size).toBe(5);
      });

      it("grows every number: MEV is never below CBE", () => {
        for (const row of review.rows) {
          expect(row.mev).toBeGreaterThanOrEqual(row.cbe);
        }
      });

      it("adds exactly the contingency the NASA policy states", () => {
        for (const row of review.rows) {
          // Propellant is sized off the grown mass and the grown Δv, so it is
          // allowed to grow by more than its own 5%. Every other row is exact.
          if (row.id === "propellant") {
            expect(growthContingency(row.cbe, row.mev)).toBeGreaterThanOrEqual(row.percent);
            continue;
          }
          if (row.cbe === 0) continue;
          expect(growthContingency(row.cbe, row.mev)).toBeCloseTo(row.percent, 10);
        }
      });

      it("agrees with itself about whether each row closes", () => {
        for (const row of review.rows) {
          expect(row.closes).toBe(row.mev <= row.mpv);
          if (row.closes) expect(row.margin).toBeGreaterThanOrEqual(0);
          else expect(row.margin).toBeLessThan(0);
          expect(row.tone).toBe(row.closes ? (row.margin >= mdlPolicy.tone.comfortable ? "good" : "tight") : "bad");
        }
      });

      it("counts the rows that close", () => {
        expect(review.closesCount).toBe(review.rows.filter((row) => row.closes).length);
      });

      it("gives a verdict that matches the rows", () => {
        if (review.closesCount < 5) expect(review.verdict).toBe("doesNotClose");
        else expect(["closes", "tight"]).toContain(review.verdict);
        expect(review.verdictText.id).toBe(review.verdict);
      });

      it("writes a plain sentence and keeps the NASA quote on every row", () => {
        for (const row of review.rows) {
          expect(row.message.length).toBeGreaterThan(20);
          expect(row.quote.length).toBeGreaterThan(10);
          // No raw "NaN" or "undefined" leaking into a sentence on screen.
          expect(row.message).not.toMatch(/NaN|undefined|Infinity/);
        }
      });

      it("sizes the grown spacecraft heavier than today's, so the composite is positive", () => {
        expect(review.mevLaunchMass).toBeGreaterThan(review.cbeLaunchMass);
        expect(review.compositeContingency).toBeGreaterThan(0);
      });

      it("compounds: the whole spacecraft grows by more than the 25% added to its dry mass", () => {
        // This is the paper's point. Dry mass carries 25% and propellant only
        // 5%, so a naive blend would land between the two. It lands above both
        // because a heavier spacecraft needs more fuel, and fuel is mass.
        const massRow = review.rows.find((row) => row.id === "mass")!;
        expect(review.compositeContingency).toBeGreaterThan(massRow.percent);
      });
    });
  }
});

describe("the review catches what the simple checks miss", () => {
  const scenario = scenarios.find((s) => s.id === "mars")!;

  it("fails the power row when the panels only just cover today's load", () => {
    // Mangalyaan-style design, but with the load pushed to just under what the
    // panels make. The launch checks pass; the review should not, because NASA
    // requires the panels to beat the load by 30%.
    const design: Design = {
      ...presetDesign(scenario),
      instrumentIds: ["camera", "weather"],
      powerId: "solarSmall",
      antennaId: "antLarge",
    };
    const review = mdlReview(design, scenario, "slow");
    const power = review.rows.find((row) => row.id === "power")!;

    // Panels make 600 / 1.52^2 ≈ 260 W at Mars. Camera 30 + weather 15 + large
    // dish 60 = 105 W, which fits with room to spare even grown by 30%.
    expect(power.cbe).toBe(105);
    expect(power.mev).toBeCloseTo(136.5, 6);
    expect(power.closes).toBe(true);
  });

  it("fails the power row outright when an ion engine is fitted far from the Sun", () => {
    const jupiter = scenarios.find((s) => s.id === "jupiter")!;
    const design: Design = { ...presetDesign(jupiter), engineId: "ion", powerId: "solarLarge" };
    const review = mdlReview(design, jupiter, "slow");
    const power = review.rows.find((row) => row.id === "power")!;

    // An ion engine wants 1,000 W. Large panels make 2800 / 5.2^2 ≈ 104 W out there.
    expect(power.closes).toBe(false);
    expect(review.verdict).toBe("doesNotClose");
    expect(power.message).toContain("short");
  });

  it("fails the data-rate row when the small antenna carries heavy instruments", () => {
    const design: Design = {
      ...presetDesign(scenario),
      bodyId: "medium",
      instrumentIds: ["radar", "spectrometer", "camera"],
      antennaId: "antSmall",
    };
    const review = mdlReview(design, scenario, "slow");
    const data = review.rows.find((row) => row.id === "dataRate")!;

    // radar 6 + spectrometer 3 + camera 2 = 11 kbps, grown to 14.3. The small
    // antenna sends 4.
    expect(data.cbe).toBe(11);
    expect(data.mev).toBeCloseTo(14.3, 6);
    expect(data.mpv).toBe(4);
    expect(data.closes).toBe(false);
  });

  it("closes the data-rate row again once the big dish is fitted", () => {
    const design: Design = {
      ...presetDesign(scenario),
      bodyId: "medium",
      instrumentIds: ["radar", "spectrometer", "camera"],
      antennaId: "antLarge",
    };
    const data = mdlReview(design, scenario, "slow").rows.find((row) => row.id === "dataRate")!;
    expect(data.mpv).toBe(40);
    expect(data.closes).toBe(true);
  });

  it("fails the propellant row when the tank is filled to exactly today's need", () => {
    // The trap the paper describes: size the fuel on the CBE spacecraft and the
    // grown spacecraft can no longer make the trip.
    const base = presetDesign(scenario);
    const review = mdlReview(base, scenario, "slow");
    const propellant = review.rows.find((row) => row.id === "propellant")!;
    const exactly: Design = { ...base, fuelKg: Math.ceil(propellant.cbe) };

    const retried = mdlReview(exactly, scenario, "slow").rows.find((r) => r.id === "propellant")!;
    expect(retried.closes).toBe(false);
    expect(retried.message).toContain("trap");
  });
});
