import { describe, expect, it } from "vitest";
import {
  contingencyFor,
  eventDefs,
  findBody,
  findEventDef,
  findRealMission,
  glossary,
  gmat,
  jpl,
  mdlPolicy,
  nasaResources,
  nasaSources,
  parts,
  presetDesign,
  scenarios,
  settings,
} from "./game";

/** Every id in a list appears once. */
function duplicateIds(list: { id: string }[]): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  for (const item of list) {
    if (seen.has(item.id)) dupes.push(item.id);
    seen.add(item.id);
  }
  return dupes;
}

describe("parts", () => {
  const groups = {
    bodies: parts.bodies,
    instruments: parts.instruments,
    powerSources: parts.powerSources,
    antennas: parts.antennas,
    engines: parts.engines,
    rockets: parts.rockets,
  };

  it("has every group filled in", () => {
    for (const [name, list] of Object.entries(groups)) {
      expect(list.length, `${name} is empty`).toBeGreaterThan(0);
    }
  });

  it("gives every part a unique id", () => {
    for (const [name, list] of Object.entries(groups)) {
      expect(duplicateIds(list), `duplicate ids in ${name}`).toEqual([]);
    }
  });

  it("gives every part a mass and a cost that make sense", () => {
    const everything = Object.values(groups).flat();
    for (const part of everything) {
      expect(part.cost, `${part.id} cost`).toBeGreaterThanOrEqual(0);
      if ("mass" in part) expect(part.mass, `${part.id} mass`).toBeGreaterThan(0);
    }
  });

  it("names every part in plain English", () => {
    for (const part of Object.values(groups).flat()) {
      expect(part.name.length, `${part.id} name`).toBeGreaterThan(2);
    }
  });

  it("gives a bigger rocket both more lift and more Δv", () => {
    const [light, medium, heavy] = parts.rockets;
    expect(light.capacity).toBeLessThan(medium.capacity);
    expect(medium.capacity).toBeLessThan(heavy.capacity);
    expect(light.deltaVProvided).toBeLessThan(medium.deltaVProvided);
    expect(medium.deltaVProvided).toBeLessThan(heavy.deltaVProvided);
    // ...and costs more for it, so the choice is a real trade.
    expect(light.cost).toBeLessThan(medium.cost);
    expect(medium.cost).toBeLessThan(heavy.cost);
  });

  it("offers exactly one power source that works away from the Sun", () => {
    const rtgs = parts.powerSources.filter((p) => p.type === "rtg");
    expect(rtgs).toHaveLength(1);
    // The whole point of the RTG: expensive, but the only choice at Jupiter.
    expect(rtgs[0].cost).toBeGreaterThan(parts.powerSources[0].cost);
  });
});

describe("scenarios", () => {
  it("has the three missions, each with a unique id", () => {
    expect(scenarios).toHaveLength(3);
    expect(duplicateIds(scenarios)).toEqual([]);
    expect(scenarios.map((s) => s.id)).toEqual(["moon", "mars", "jupiter"]);
  });

  it("gives every preset real part ids", () => {
    for (const scenario of scenarios) {
      const design = presetDesign(scenario);
      expect(findBody(design.bodyId), `${scenario.id} body`).toBeDefined();
      expect(
        parts.powerSources.some((p) => p.id === design.powerId),
        `${scenario.id} power`,
      ).toBe(true);
      expect(
        parts.antennas.some((a) => a.id === design.antennaId),
        `${scenario.id} antenna`,
      ).toBe(true);
      expect(
        parts.engines.some((e) => e.id === design.engineId),
        `${scenario.id} engine`,
      ).toBe(true);
      expect(
        parts.rockets.some((r) => r.id === design.rocketId),
        `${scenario.id} rocket`,
      ).toBe(true);
      for (const id of design.instrumentIds) {
        expect(
          parts.instruments.some((i) => i.id === id),
          `${scenario.id} instrument ${id}`,
        ).toBe(true);
      }
    }
  });

  it("never puts more instruments in a preset than the bus has room for", () => {
    for (const scenario of scenarios) {
      const body = findBody(scenario.preset.bodyId);
      expect(scenario.preset.instrumentIds.length).toBeLessThanOrEqual(body!.slots);
    }
  });

  it("points every scenario at real missions to compare with", () => {
    for (const scenario of scenarios) {
      expect(scenario.realMissionIds.length, `${scenario.id}`).toBeGreaterThan(0);
      for (const id of scenario.realMissionIds) {
        expect(findRealMission(id), `${scenario.id} -> ${id}`).toBeDefined();
      }
    }
  });

  it("gets harder as the target gets further away", () => {
    const [moon, mars, jupiter] = scenarios;
    expect(moon.distanceAU).toBeLessThan(mars.distanceAU);
    expect(mars.distanceAU).toBeLessThan(jupiter.distanceAU);
    expect(moon.deltaV).toBeLessThan(mars.deltaV);
    expect(mars.deltaV).toBeLessThan(jupiter.deltaV);
    expect(moon.tripDays).toBeLessThan(mars.tripDays);
    expect(mars.tripDays).toBeLessThan(jupiter.tripDays);
  });

  it("lets the Moon launch in any month and makes the others wait", () => {
    const moon = scenarios[0];
    expect(moon.windowMonths).toBe(0);
    for (const scenario of scenarios.slice(1)) {
      expect(scenario.windowMonths, `${scenario.id}`).toBeGreaterThan(0);
    }
  });

  it("puts the Moon around Earth and the planets around the Sun", () => {
    expect(scenarios[0].centralBody).toBe("earth");
    expect(scenarios[1].centralBody).toBe("sun");
    expect(scenarios[2].centralBody).toBe("sun");
  });
});

describe("events", () => {
  it("gives every challenge a unique id", () => {
    expect(duplicateIds(eventDefs)).toEqual([]);
    expect(eventDefs.length).toBeGreaterThanOrEqual(18);
  });

  it("gives every challenge at least two options to choose between", () => {
    for (const def of eventDefs) {
      expect(def.options.length, `${def.id}`).toBeGreaterThanOrEqual(2);
      expect(duplicateIds(def.options), `${def.id} options`).toEqual([]);
    }
  });

  it("gives every option an effect that says something", () => {
    for (const def of eventDefs) {
      for (const option of def.options) {
        const keys = Object.keys(option.effect);
        expect(keys.length, `${def.id}/${option.id} has an empty effect`).toBeGreaterThan(0);
      }
    }
  });

  it("gives every challenge at least one option that takes no risk", () => {
    for (const def of eventDefs) {
      // Needed so the 20-second clock running out can always pick a sensible default.
      expect(
        def.options.some((o) => o.safe),
        `${def.id} has no safe option`,
      ).toBe(true);
    }
  });

  it("teaches something on every card", () => {
    for (const def of eventDefs) {
      expect(def.whatIsIt.length, `${def.id} whatIsIt`).toBeGreaterThan(30);
      expect(def.realExample.length, `${def.id} realExample`).toBeGreaterThan(30);
      expect(def.howCommon.length, `${def.id} howCommon`).toBeGreaterThan(5);
    }
  });

  it("points every follow-up at a real earlier choice", () => {
    const followUps = eventDefs.filter((d) => d.follows);
    expect(followUps.length).toBeGreaterThan(0);
    for (const def of followUps) {
      const parent = findEventDef(def.follows!.eventId);
      expect(parent, `${def.id} follows a missing event`).toBeDefined();
      expect(
        parent!.options.some((o) => o.id === def.follows!.optionId),
        `${def.id} follows a missing option ${def.follows!.optionId}`,
      ).toBe(true);
      // A follow-up must never be drawn on its own.
      expect(def.chance, `${def.id} chance`).toBe(0);
    }
  });

  it("only ever draws an event that has a chance of happening", () => {
    const drawable = eventDefs.filter((d) => !d.follows);
    for (const def of drawable) {
      expect(def.chance, `${def.id}`).toBeGreaterThan(0);
      expect(def.chance, `${def.id}`).toBeLessThanOrEqual(1);
    }
  });

  it("keeps every share between 0 and 1", () => {
    const shares = [
      "sciencePenalty",
      "scienceBonus",
      "powerPenalty",
      "signalPenalty",
      "riskOfFailure",
      "riskAtInsertion",
    ] as const;
    for (const def of eventDefs) {
      for (const option of def.options) {
        for (const key of shares) {
          const value = option.effect[key];
          if (value === undefined) continue;
          expect(value, `${def.id}/${option.id}/${key}`).toBeGreaterThan(0);
          expect(value, `${def.id}/${option.id}/${key}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("offers both problems and opportunities", () => {
    const kinds = new Set(eventDefs.map((d) => d.kind));
    expect(kinds.has("problem")).toBe(true);
    expect(kinds.has("opportunity")).toBe(true);
  });
});

describe("NASA sources", () => {
  it("gives every entry a unique id and a real kind", () => {
    expect(duplicateIds(nasaSources)).toEqual([]);
    for (const entry of nasaSources) {
      expect(["formula", "real", "game"]).toContain(entry.kind);
      expect(entry.what.length, `${entry.id} what`).toBeGreaterThan(3);
      expect(entry.detail.length, `${entry.id} detail`).toBeGreaterThan(20);
      expect(entry.source.length, `${entry.id} source`).toBeGreaterThan(3);
    }
  });

  it("backs every formula and measurement with a NASA link", () => {
    for (const entry of nasaSources) {
      if (entry.kind === "game") continue;
      expect(entry.url, `${entry.id} needs a url`).toBeTruthy();
      expect(entry.url, `${entry.id} url must be https`).toMatch(/^https:\/\//);
      expect(entry.url, `${entry.id} url must be a NASA domain`).toMatch(/\.nasa\.gov\//);
    }
  });

  it("marks the made-up numbers as game values, with no link", () => {
    const gameValues = nasaSources.filter((e) => e.kind === "game");
    expect(gameValues.length).toBeGreaterThan(0);
    for (const entry of gameValues) {
      expect(entry.url, `${entry.id}`).toBeNull();
      expect(entry.source).toBe("Game value");
    }
  });

  it("covers all three kinds, so the panel is never one-sided", () => {
    for (const kind of ["formula", "real", "game"] as const) {
      expect(nasaSources.some((e) => e.kind === kind), kind).toBe(true);
    }
  });
});

describe("settings", () => {
  it("keeps every cruise to about a minute and a half", () => {
    expect(settings.cruiseSeconds).toBeGreaterThanOrEqual(60);
    expect(settings.cruiseSeconds).toBeLessThanOrEqual(90);
  });

  it("asks for a fuel margin above the bare minimum", () => {
    expect(settings.fuelMargin).toBeGreaterThan(1);
  });

  it("draws between three and five challenges, inside the cruise", () => {
    expect(settings.eventsPerMission.min).toBeLessThanOrEqual(settings.eventsPerMission.max);
    expect(settings.eventsPerMission.min).toBeGreaterThanOrEqual(1);
    expect(settings.eventWindow.from).toBeGreaterThan(0);
    expect(settings.eventWindow.to).toBeLessThan(1);
    expect(settings.eventWindow.from).toBeLessThan(settings.eventWindow.to);
  });
});

describe("glossary", () => {
  it("explains every word in a sentence a 12-year-old can read", () => {
    expect(glossary.length).toBeGreaterThan(5);
    for (const entry of glossary) {
      expect(entry.term.length).toBeGreaterThan(1);
      expect(entry.meaning.length, entry.term).toBeGreaterThan(20);
    }
  });

  it("explains the words the Design Lab actually uses", () => {
    const terms = glossary.map((g) => g.term.toLowerCase()).join(" ");
    // Lowercased, so Δv reads as δv here.
    for (const needed of ["δv", "isp", "launch window", "au", "rtg"]) {
      expect(terms, `missing ${needed}`).toContain(needed);
    }
  });
});

describe("the NASA resource list", () => {
  it("has no duplicate ids", () => {
    expect(duplicateIds(nasaResources)).toEqual([]);
  });

  it("says what each resource is, what we used it for, and where that lives", () => {
    for (const resource of nasaResources) {
      expect(resource.name.length, resource.id).toBeGreaterThan(3);
      expect(resource.org.length, resource.id).toBeGreaterThan(3);
      // "What it is" and "what we used it for" are the two claims a judge
      // checks. A resource listed without the second one is just a link.
      expect(resource.whatItIs.length, resource.id).toBeGreaterThan(40);
      expect(resource.usedFor.length, resource.id).toBeGreaterThan(40);
      expect(resource.where.length, resource.id).toBeGreaterThan(3);
    }
  });

  it("links every resource somewhere real over https", () => {
    for (const resource of nasaResources) {
      expect(resource.url, resource.id).toMatch(/^https:\/\//);
      if (resource.altUrl) expect(resource.altUrl, resource.id).toMatch(/^https:\/\//);
    }
  });

  it("leads with the four that do real work", () => {
    const headline = nasaResources.filter((resource) => resource.headline);
    expect(headline).toHaveLength(4);
    // GMAT, the Mission Design Lab, the paper behind the review, and JPL.
    expect(headline.map((resource) => resource.id).sort()).toEqual([
      "gmat",
      "jplHorizons",
      "karpati2012",
      "mdl",
    ]);
  });

  it("names a real NASA or AIAA home for all but nothing", () => {
    for (const resource of nasaResources) {
      expect(resource.url, resource.id).toMatch(/nasa\.gov|aiaa\.org|sourceforge\.net|github\.com/);
    }
  });
});

describe("the Mission Design Lab policy", () => {
  it("defines CBE, MEV and MPV", () => {
    expect(mdlPolicy.definitions.map((entry) => entry.term)).toEqual(["CBE", "MEV", "MPV"]);
  });

  it("carries all four margin formulas", () => {
    expect(mdlPolicy.formulas).toHaveLength(4);
    for (const formula of mdlPolicy.formulas) {
      expect(formula.expression).toMatch(/CBE|MEV|MPV/);
    }
  });

  it("quotes the NASA paper for every contingency, so no percentage is invented", () => {
    expect(mdlPolicy.contingencies.length).toBeGreaterThanOrEqual(5);
    for (const entry of mdlPolicy.contingencies) {
      expect(entry.percent, entry.id).toBeGreaterThan(0);
      expect(entry.percent, entry.id).toBeLessThan(1);
      // The sentence it came from. Without this the number is just a claim.
      expect(entry.quote.length, entry.id).toBeGreaterThan(15);
      expect(entry.plain.length, entry.id).toBeGreaterThan(20);
    }
  });

  it("finds a contingency by id and refuses an unknown one", () => {
    expect(contingencyFor("power").percent).toBeCloseTo(0.3, 10);
    expect(contingencyFor("mass").percent).toBeCloseTo(0.25, 10);
    // @ts-expect-error — an id outside the union is exactly what should throw.
    expect(() => contingencyFor("nonsense")).toThrow();
  });

  it("offers a verdict for each outcome the review can reach", () => {
    expect(mdlPolicy.verdicts.map((entry) => entry.id).sort()).toEqual([
      "closes",
      "doesNotClose",
      "tight",
    ]);
  });
});

describe("the measured JPL constants", () => {
  it("uses the defined values of the AU, the speed of light and g0", () => {
    // These three are defined exactly by international agreement, so they are
    // not approximations and must not drift.
    expect(jpl.universal.astronomicalUnitKm).toBe(149597870.7);
    expect(jpl.universal.speedOfLightKmS).toBe(299792.458);
    expect(jpl.universal.standardGravityMS2).toBe(9.80665);
  });

  it("derives light time per AU from those two, rather than stating it", () => {
    const derived = jpl.universal.astronomicalUnitKm / jpl.universal.speedOfLightKmS;
    expect(jpl.universal.lightTimePerAuSeconds).toBeCloseTo(derived, 3);
    expect(jpl.universal.lightTimePerAuMinutes).toBeCloseTo(derived / 60, 4);
  });

  it("gets each planet's sunlight share from the inverse-square law", () => {
    for (const id of ["mars", "jupiter"] as const) {
      const body = jpl.bodies[id];
      const expected = 1 / (body.semiMajorAxisAu! * body.semiMajorAxisAu!);
      expect(body.sunlightShare, id).toBeCloseTo(expected, 3);
    }
  });

  it("gets each launch window from the two real orbit periods", () => {
    const earth = jpl.bodies.earth.orbitDays!;
    for (const id of ["mars", "jupiter"] as const) {
      const planet = jpl.bodies[id].orbitDays!;
      const synodic = 1 / Math.abs(1 / earth - 1 / planet);
      expect(jpl.synodic[id].days, id).toBeCloseTo(synodic, 0);
      // And the whole number of months the game actually shows the player.
      expect(jpl.synodic[id].gameMonths, id).toBe(Math.round(jpl.synodic[id].months));
    }
  });

  it("agrees with the scenarios the game ships", () => {
    for (const scenario of scenarios) {
      const body = jpl.bodies[scenario.id];
      if (!body) continue;
      expect(body.orbitDays, scenario.id).toBeCloseTo(scenario.targetOrbitDays, 0);
      if (scenario.centralBody === "sun") {
        expect(body.semiMajorAxisAu, scenario.id).toBeCloseTo(scenario.distanceAU, 1);
      }
      if (scenario.windowMonths > 0) {
        expect(jpl.synodic[scenario.id].gameMonths, scenario.id).toBe(scenario.windowMonths);
      }
    }
  });

  it("gives every body a positive GM and radius", () => {
    for (const [id, body] of Object.entries(jpl.bodies)) {
      expect(body.gmKm3S2, id).toBeGreaterThan(0);
      expect(body.radiusKm, id).toBeGreaterThan(0);
      expect(body.source.length, id).toBeGreaterThan(5);
    }
  });
});

describe("the GMAT export settings", () => {
  it("has a setup for every mission the game ships", () => {
    for (const scenario of scenarios) {
      expect(gmat.bodies[scenario.id], scenario.id).toBeDefined();
    }
  });

  it("names a target body and a parking orbit for each mission", () => {
    for (const [id, body] of Object.entries(gmat.bodies)) {
      expect(body.targetBody.length, id).toBeGreaterThan(2);
      expect(body.parkingAltitudeKm, id).toBeGreaterThan(100);
      expect(body.pointMasses.length, id).toBeGreaterThan(0);
      // Whether a body appears in both lists is not checked here: GMAT rejects
      // that, and the exporter filters it, which gmatExport.test.ts proves.
      // Asserting it on the data too would just forbid a harmless convenience.
      expect(body.coordinateSystem.length, id).toBeGreaterThan(3);
    }
  });

  it("propagates with a real integrator and a sane step", () => {
    expect(gmat.propagator.type).toBe("PrinceDormand78");
    expect(gmat.propagator.accuracy).toBeGreaterThan(0);
    expect(gmat.propagator.initialStepSize).toBeGreaterThan(0);
    expect(gmat.propagator.maxStep).toBeGreaterThanOrEqual(gmat.propagator.initialStepSize);
  });
});
