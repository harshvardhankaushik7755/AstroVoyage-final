/**
 * The GMAT export.
 *
 * A script that merely looks like GMAT would be worse than no feature at all,
 * so these tests check the structural rules GMAT actually enforces — one
 * BeginMissionSequence, every resource created before it, every command after
 * it, and no reference to a resource that was never created — rather than
 * comparing against a blob of expected text that would only prove the code
 * still does whatever it did yesterday.
 */
import { describe, expect, it } from "vitest";
import { gmatFilename, gmatName, gmatScript, tripDaysFor } from "./gmatExport";
import { missionGoal, presetDesign, scenarios, settings } from "../data/game";
import type { Design } from "../data/game";

const ASSIGNMENT = /^GMAT\s+[A-Za-z][A-Za-z0-9_]*\./;
const CREATE = /^Create\s+([A-Za-z]+)\s+([A-Za-z][A-Za-z0-9_]*);$/;

/** The lines that are neither blank nor a comment. */
function code(script: string): string[] {
  return script
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%"));
}

describe("gmatName", () => {
  it("turns a mission title into one GMAT-safe word", () => {
    expect(gmatName("Mars on a Budget")).toBe("MarsOnABudget");
    expect(gmatName("Moon Orbiter")).toBe("MoonOrbiter");
  });

  it("drops punctuation GMAT would reject", () => {
    expect(gmatName("Mars: the 2nd try!")).toBe("MarsThe2ndTry");
  });

  it("never starts a name with a digit", () => {
    expect(gmatName("2001 Odyssey")).toBe("M2001Odyssey");
    expect(gmatName("2001 Odyssey")).toMatch(/^[A-Za-z]/);
  });

  it("falls back to a usable name when there is nothing to work with", () => {
    expect(gmatName("")).toBe("Mission");
    expect(gmatName("!!!")).toBe("Mission");
  });
});

describe("gmatFilename", () => {
  it("offers a .script file named after the mission", () => {
    expect(gmatFilename(scenarios[0])).toBe("AstroVoyage_MoonOrbiter.script");
    for (const scenario of scenarios) {
      expect(gmatFilename(scenario)).toMatch(/^AstroVoyage_[A-Za-z0-9]+\.script$/);
    }
  });
});

describe("tripDaysFor", () => {
  it("scales the trip by the route the player chose", () => {
    const mars = scenarios.find((s) => s.id === "mars")!;
    expect(tripDaysFor(mars, "fast")).toBeCloseTo(
      mars.tripDays * settings.routes.fast.tripFactor,
      10,
    );
    expect(tripDaysFor(mars, "slow")).toBeGreaterThan(tripDaysFor(mars, "fast"));
  });
});

describe("the exported script, for every mission", () => {
  for (const scenario of scenarios) {
    describe(scenario.name, () => {
      const design = presetDesign(scenario);
      const goal = missionGoal(scenario);
      const script = gmatScript(design, scenario, scenario.preset.route, goal, "2026-11-15");
      const lines = code(script);

      it("declares itself a GMAT script on the first line", () => {
        expect(script.split("\n")[0]).toBe("%General Mission Analysis Tool(GMAT) Script");
      });

      it("has exactly one BeginMissionSequence", () => {
        const found = lines.filter((line) => line === "BeginMissionSequence;");
        expect(found).toHaveLength(1);
      });

      it("creates every resource before BeginMissionSequence, and none after", () => {
        const start = lines.indexOf("BeginMissionSequence;");
        expect(start).toBeGreaterThan(0);
        lines.forEach((line, index) => {
          if (CREATE.test(line)) expect(index).toBeLessThan(start);
        });
      });

      it("puts every command after BeginMissionSequence", () => {
        const start = lines.indexOf("BeginMissionSequence;");
        lines.forEach((line, index) => {
          if (/^(Propagate|Maneuver)\b/.test(line)) expect(index).toBeGreaterThan(start);
        });
      });

      it("writes every assignment in GMAT's form and ends every line with a semicolon", () => {
        for (const line of lines) {
          expect(line.endsWith(";")).toBe(true);
          const isCreate = CREATE.test(line);
          const isCommand = /^(BeginMissionSequence|Propagate|Maneuver)\b/.test(line);
          if (!isCreate && !isCommand) {
            // Anything else must be a "GMAT <object>.<Property> = ..." assignment.
            expect(line).toMatch(ASSIGNMENT);
            expect(line).toContain(" = ");
          }
        }
      });

      it("never references a resource it did not create", () => {
        const created = new Set<string>();
        for (const line of lines) {
          const match = line.match(CREATE);
          if (match) created.add(match[2]);
        }
        // Everything the script assigns to, or propagates, must exist.
        for (const line of lines) {
          const assigned = line.match(/^GMAT\s+([A-Za-z][A-Za-z0-9_]*)\./);
          if (assigned) expect(created).toContain(assigned[1]);
          const propagated = line.match(/^Propagate\s+([A-Za-z][A-Za-z0-9_]*)\(/);
          if (propagated) expect(created).toContain(propagated[1]);
          const manoeuvred = line.match(/^Maneuver\s+([A-Za-z][A-Za-z0-9_]*)\(/);
          if (manoeuvred) expect(created).toContain(manoeuvred[1]);
        }
      });

      it("creates the spacecraft, its tank, its engine, a force model and a propagator", () => {
        expect(script).toContain("Create Spacecraft AstroVoyage;");
        expect(script).toContain("Create ChemicalTank MainTank;");
        expect(script).toContain("Create ChemicalThruster MainEngine;");
        expect(script).toContain("Create ForceModel MissionForces;");
        expect(script).toContain("Create Propagator MissionProp;");
        expect(script).toContain("Create ImpulsiveBurn DepartureBurn;");
      });

      it("carries the design the player actually built", () => {
        expect(script).toMatch(/GMAT AstroVoyage\.DryMass = \d+;/);
        expect(script).toMatch(/GMAT MainTank\.FuelMass = \d+;/);
        // The engine's real Isp, from parts.json.
        const isp = scenario.preset.engineId === "ion" ? 3000 : 320;
        expect(script).toContain(`GMAT MainEngine.Isp = ${isp};`);
      });

      it("never lists a body as both a primary body and a point mass", () => {
        // GMAT rejects this: a body carries a full gravity field or it is a
        // point mass, not both. Earth is always the primary body here.
        const primaries = script.match(/PrimaryBodies = \{([^}]*)\}/)![1];
        const points = script.match(/PointMasses = \{([^}]*)\}/)![1];
        const split = (text: string) =>
          text.split(",").map((part) => part.trim()).filter(Boolean);
        const overlap = split(primaries).filter((name) => split(points).includes(name));
        expect(overlap).toEqual([]);
        expect(split(points).length).toBe(new Set(split(points)).size);
      });

      it("never emits a broken number", () => {
        expect(script).not.toMatch(/NaN|undefined|Infinity|null/);
        // No empty assignment, e.g. "GMAT X.Y = ;"
        expect(script).not.toMatch(/=\s*;/);
      });

      it("propagates for the trip length the game shows", () => {
        const days = tripDaysFor(scenario, scenario.preset.route);
        // The LAST Propagate is the cruise. The first is the single parking-orbit
        // lap the script flies so the plot shows where the mission started.
        const all = [...script.matchAll(/ElapsedDays = ([\d.]+)\}/g)];
        expect(all.length).toBeGreaterThanOrEqual(2);
        expect(Number(all[all.length - 1][1])).toBeCloseTo(Number(days.toFixed(2)), 2);
        expect(Number(all[0][1])).toBeLessThan(1);
      });

      it("is the same file every time, for the same design", () => {
        expect(gmatScript(design, scenario, scenario.preset.route, goal, "2026-11-15")).toBe(script);
      });

      it("names the mission goal in the header so the file explains itself", () => {
        expect(script).toContain(`% Mission goal: ${goal.label}`);
      });
    });
  }
});

describe("the script follows the design", () => {
  const scenario = scenarios.find((s) => s.id === "mars")!;

  it("writes a bigger fuel mass when more fuel is loaded", () => {
    const light: Design = { ...presetDesign(scenario), fuelKg: 500 };
    const heavy: Design = { ...presetDesign(scenario), fuelKg: 1500 };
    expect(gmatScript(light, scenario, "slow")).toContain("GMAT MainTank.FuelMass = 500;");
    expect(gmatScript(heavy, scenario, "slow")).toContain("GMAT MainTank.FuelMass = 1500;");
  });

  it("writes the ion engine's Isp when an ion engine is fitted", () => {
    const ion: Design = { ...presetDesign(scenario), engineId: "ion" };
    expect(gmatScript(ion, scenario, "slow")).toContain("GMAT MainEngine.Isp = 3000;");
    expect(gmatScript(ion, scenario, "slow")).toContain("gridded ion");
  });

  it("asks less of the spacecraft's engine when a bigger rocket is chosen", () => {
    const burnOf = (rocketId: string) => {
      const script = gmatScript({ ...presetDesign(scenario), rocketId }, scenario, "slow");
      return Number(script.match(/GMAT DepartureBurn\.Element1 = ([\d.]+);/)![1]);
    };
    // A heavy rocket gives 5.0 km/s off Earth, a light one 3.2, so the
    // spacecraft's own engine has less left to find.
    expect(burnOf("heavy")).toBeLessThan(burnOf("light"));
  });

  it("leaves the generated-on line out when no date is given, so the file stays reproducible", () => {
    const script = gmatScript(presetDesign(scenario), scenario, "slow");
    expect(script).not.toContain("% Generated");
  });

  it("includes the target body in the force model", () => {
    const jupiter = scenarios.find((s) => s.id === "jupiter")!;
    expect(gmatScript(presetDesign(jupiter), jupiter, "slow")).toContain("Jupiter");
    const moon = scenarios.find((s) => s.id === "moon")!;
    // GMAT calls the Moon "Luna".
    expect(gmatScript(presetDesign(moon), moon, "slow")).toContain("Luna");
  });

  it("survives a design with no instruments at all", () => {
    const bare: Design = { ...presetDesign(scenario), instrumentIds: [] };
    const script = gmatScript(bare, scenario, "slow");
    expect(script).toContain("%   Instruments none");
    expect(script).not.toMatch(/NaN|undefined/);
  });
});
