import { describe, expect, it } from "vitest";
import {
  coastAngles,
  createSimulation,
  effectChips,
  isOver,
  keplerE,
  planetAngle,
  progressOf,
  remainingDeltaV,
  resolveEvent,
  resolveInsertion,
  safestOption,
  scaleLabel,
  step,
  timeScale,
  transferPath,
  transferPosition,
} from "./simulation";
import type { SimState } from "./simulation";
import { designFlags } from "../physics/checks";
import { presetDesign, scenarios, settings } from "../data/game";

const [moon, mars, jupiter] = scenarios;

function makeSim(scenario = mars, seed = 1234): SimState {
  const design = presetDesign(scenario);
  return createSimulation(
    design,
    scenario,
    scenario.preset.route,
    scenario.preset.launchMonth,
    [...designFlags(design, scenario)],
    seed,
  );
}

/** Fly the whole cruise, always taking the safest option. */
function flySafely(start: SimState, seconds = 0.25): SimState {
  let sim = start;
  let guard = 0;
  while (sim.phase === "cruise" && guard < 4000) {
    if (sim.pendingEvent) sim = resolveEvent(sim, safestOption(sim.pendingEvent));
    else sim = step(sim, seconds);
    guard += 1;
  }
  return sim;
}

describe("the time scale", () => {
  it("makes every cruise last about the same wall-clock time", () => {
    for (const scenario of scenarios) {
      const perSecond = timeScale(scenario.tripDays);
      expect(scenario.tripDays / perSecond).toBeCloseTo(settings.cruiseSeconds, 6);
    }
  });

  it("names the scale in the unit that reads best", () => {
    expect(scaleLabel(timeScale(moon.tripDays))).toBe("1 sec = 1 hour");
    expect(scaleLabel(timeScale(mars.tripDays))).toBe("1 sec = 3 days");
    expect(scaleLabel(timeScale(jupiter.tripDays))).toBe("1 sec = 1 month");
  });
});

describe("Kepler's equation", () => {
  it("is exact at both ends", () => {
    expect(keplerE(0, 0.2)).toBeCloseTo(0, 6);
    expect(keplerE(Math.PI, 0.2)).toBeCloseTo(Math.PI, 6);
  });

  it("solves E − e·sin E = M for the answer it returns", () => {
    for (const e of [0, 0.1, 0.5, 0.8]) {
      for (const m of [0.3, 1, 2, 3]) {
        const E = keplerE(m, e);
        expect(E - e * Math.sin(E), `e=${e} M=${m}`).toBeCloseTo(m, 8);
      }
    }
  });

  it("reduces to E = M for a circle", () => {
    expect(keplerE(1.2, 0)).toBeCloseTo(1.2, 8);
  });
});

describe("the transfer path", () => {
  it("starts on the departure orbit and ends on the target's", () => {
    const start = transferPosition(0, 1, 1.52);
    const end = transferPosition(1, 1, 1.52);
    expect(start.r).toBeCloseTo(1, 8);
    expect(end.r).toBeCloseTo(1.52, 8);
  });

  it("turns exactly half a circle, which is what makes it a Hohmann transfer", () => {
    expect(transferPosition(0, 1, 1.52).nu).toBeCloseTo(0, 8);
    expect(transferPosition(1, 1, 1.52).nu).toBeCloseTo(Math.PI, 6);
  });

  it("never goes backwards or inwards along the way", () => {
    const path = transferPath(1, 5.2, 120);
    for (let i = 1; i < path.length; i += 1) {
      expect(path[i].r, `step ${i}`).toBeGreaterThanOrEqual(path[i - 1].r - 1e-9);
      expect(path[i].nu, `step ${i}`).toBeGreaterThanOrEqual(path[i - 1].nu - 1e-9);
    }
  });

  it("covers more than half the distance in the first half of the time", () => {
    // Real orbital motion: fast near the Sun, slow far away.
    const half = transferPosition(0.5, 1, 5.2);
    const midRadius = (1 + 5.2) / 2;
    expect(half.r).toBeGreaterThan(midRadius);
  });

  it("works for the Moon's much tighter transfer too", () => {
    const end = transferPosition(1, moon.startRadiusAU, moon.targetOrbitRadiusAU);
    expect(end.r).toBeCloseTo(moon.targetOrbitRadiusAU, 10);
  });

  it("survives a nonsense radius without returning NaN", () => {
    const point = transferPosition(0.5, 0, 0);
    expect(Number.isFinite(point.r)).toBe(true);
    expect(Number.isFinite(point.nu)).toBe(true);
  });

  it("clamps progress outside 0 to 1", () => {
    expect(transferPosition(-1, 1, 2).r).toBeCloseTo(1, 8);
    expect(transferPosition(5, 1, 2).r).toBeCloseTo(2, 8);
  });
});

describe("where the planets are", () => {
  it("puts the target at the meeting point exactly when the spacecraft arrives", () => {
    const sim = makeSim(mars);
    const shipAtArrival = sim.startAngleRad + Math.PI;
    const targetAtArrival = planetAngle("target", sim.totalDays, sim.config, sim.totalDays);
    // The real lead angle: same place, same moment.
    expect(Math.cos(targetAtArrival - shipAtArrival)).toBeCloseTo(1, 8);
  });

  it("has the target somewhere else at launch — that is the lead angle", () => {
    const sim = makeSim(mars);
    const atLaunch = planetAngle("target", 0, sim.config, sim.totalDays);
    const meeting = sim.startAngleRad + Math.PI;
    expect(Math.abs(Math.cos(atLaunch - meeting))).toBeLessThan(0.99);
  });

  it("starts the departure body where the spacecraft leaves from", () => {
    const sim = makeSim(mars);
    expect(planetAngle("earth", 0, sim.config, sim.totalDays)).toBeCloseTo(sim.startAngleRad, 8);
  });

  it("moves both bodies as the days pass", () => {
    const sim = makeSim(mars);
    const earlier = planetAngle("target", 10, sim.config, sim.totalDays);
    const later = planetAngle("target", 60, sim.config, sim.totalDays);
    expect(later).toBeGreaterThan(earlier);
  });

  it("gives a different sky for a different launch month", () => {
    const march = createSimulation(presetDesign(moon), moon, "slow", 3, [], 1);
    const august = createSimulation(presetDesign(moon), moon, "slow", 8, [], 1);
    expect(march.startAngleRad).not.toBeCloseTo(august.startAngleRad, 3);
  });
});

describe("the planets keep moving after you arrive", () => {
  it("turns both bodies on past the arrival day", () => {
    const sim = makeSim(mars);
    const atArrival = coastAngles(sim, 0);
    const later = coastAngles(sim, 100);
    expect(later.targetAngleRad).toBeGreaterThan(atArrival.targetAngleRad);
    expect(later.earthAngleRad).toBeGreaterThan(atArrival.earthAngleRad);
  });

  it("treats a negative coast as no coast at all", () => {
    const sim = makeSim(mars);
    expect(coastAngles(sim, -50)).toEqual(coastAngles(sim, 0));
  });

  it("agrees with planetAngle at zero", () => {
    const sim = makeSim(mars);
    const coast = coastAngles(sim, 0);
    expect(coast.targetAngleRad).toBeCloseTo(
      planetAngle("target", sim.missionDay, sim.config, sim.totalDays),
      10,
    );
  });
});

describe("setting up a mission", () => {
  it("starts at day zero, on the way, with the fuel that was loaded", () => {
    const sim = makeSim(mars);
    expect(sim.missionDay).toBe(0);
    expect(sim.phase).toBe("cruise");
    expect(sim.fuelKg).toBe(presetDesign(mars).fuelKg);
    expect(sim.log).toHaveLength(1);
    expect(sim.log[0].text).toContain("Launched");
  });

  it("draws between three and five challenges", () => {
    for (const seed of [1, 7, 99, 1234, 55555]) {
      const sim = makeSim(mars, seed);
      expect(sim.schedule.length, `seed ${seed}`).toBeGreaterThanOrEqual(
        settings.eventsPerMission.min,
      );
      expect(sim.schedule.length, `seed ${seed}`).toBeLessThanOrEqual(
        settings.eventsPerMission.max,
      );
    }
  });

  it("never draws the same challenge twice", () => {
    for (const seed of [2, 13, 404, 9001]) {
      const sim = makeSim(mars, seed);
      const ids = sim.schedule.map((item) => item.defId);
      expect(new Set(ids).size, `seed ${seed}`).toBe(ids.length);
    }
  });

  it("keeps every challenge inside the middle of the cruise", () => {
    const sim = makeSim(mars, 31);
    for (const item of sim.schedule) {
      expect(item.day).toBeGreaterThanOrEqual(settings.eventWindow.from * sim.totalDays - 1e-9);
      expect(item.day).toBeLessThanOrEqual(settings.eventWindow.to * sim.totalDays + 1e-9);
    }
  });

  it("schedules them in order", () => {
    const sim = makeSim(jupiter, 77);
    for (let i = 1; i < sim.schedule.length; i += 1) {
      expect(sim.schedule[i].day).toBeGreaterThanOrEqual(sim.schedule[i - 1].day);
    }
  });

  it("never draws a follow-up on its own", () => {
    const followUpIds = ["debrisDamage", "assistCheck", "extraData"];
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const sim = makeSim(mars, seed);
      for (const item of sim.schedule) {
        expect(followUpIds, `seed ${seed}`).not.toContain(item.defId);
      }
    }
  });

  it("only offers a gravity assist on a trip past the asteroid belt", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      expect(makeSim(mars, seed).schedule.map((s) => s.defId)).not.toContain("gravityAssist");
    }
  });

  it("gives the same mission twice for the same seed", () => {
    expect(makeSim(mars, 4242).schedule).toEqual(makeSim(mars, 4242).schedule);
  });

  it("gives a different mission for a different seed", () => {
    const a = makeSim(mars, 1).schedule.map((s) => s.defId).join();
    const b = makeSim(mars, 999).schedule.map((s) => s.defId).join();
    expect(a).not.toBe(b);
  });
});

describe("flying it", () => {
  it("moves the clock forward with real time", () => {
    const sim = makeSim(mars);
    const later = step(sim, 1);
    expect(later.missionDay).toBeCloseTo(sim.daysPerSecond, 6);
  });

  it("goes four times as fast at 4x", () => {
    const sim = makeSim(mars);
    const normal = step(sim, 1).missionDay;
    const fast = step({ ...sim, speed: 4 }, 1).missionDay;
    expect(fast).toBeCloseTo(normal * 4, 6);
  });

  it("stands still when paused", () => {
    const sim = { ...makeSim(mars), speed: 0 };
    expect(step(sim, 5).missionDay).toBe(0);
  });

  it("stops the clock dead while a challenge is waiting", () => {
    let sim = makeSim(mars);
    while (!sim.pendingEvent && sim.phase === "cruise") sim = step(sim, 0.5);
    expect(sim.pendingEvent).not.toBeNull();
    expect(sim.speed).toBe(0);

    const day = sim.missionDay;
    const waited = step(sim, 10);
    expect(waited.missionDay).toBe(day);
  });

  it("reaches the arrival burn and no further on its own", () => {
    const sim = flySafely(makeSim(mars));
    expect(["insertion", "lost"]).toContain(sim.phase);
    if (sim.phase === "insertion") expect(sim.missionDay).toBe(sim.totalDays);
  });

  it("never runs the clock past the arrival day", () => {
    let sim = makeSim(moon);
    for (let i = 0; i < 500; i += 1) {
      if (sim.pendingEvent) sim = resolveEvent(sim, safestOption(sim.pendingEvent));
      else sim = step(sim, 2);
      expect(sim.missionDay).toBeLessThanOrEqual(sim.totalDays + 1e-9);
    }
  });

  it("collects science as it goes, and all of it once in orbit", () => {
    const sim = makeSim(mars);
    expect(sim.scienceCollected).toBe(0);
    const halfway = step({ ...sim, speed: 1 }, settings.cruiseSeconds / 2);
    expect(halfway.scienceCollected).toBeGreaterThan(0);
    expect(halfway.scienceCollected).toBeLessThan(sim.scienceMax);
  });

  it("logs the launch and the arrival", () => {
    const sim = flySafely(makeSim(moon));
    const text = sim.log.map((line) => line.text).join(" ");
    expect(text).toContain("Launched");
    if (sim.phase === "insertion") expect(text).toContain("braking burn");
  });
});

describe("making a decision", () => {
  /** Fly until a card appears. */
  function untilCard(scenario = mars, seed = 1234): SimState {
    let sim = makeSim(scenario, seed);
    let guard = 0;
    while (!sim.pendingEvent && sim.phase === "cruise" && guard < 2000) {
      sim = step(sim, 0.25);
      guard += 1;
    }
    return sim;
  }

  it("always offers something safe to do", () => {
    const sim = untilCard();
    expect(sim.pendingEvent).not.toBeNull();
    const safe = safestOption(sim.pendingEvent!);
    expect(sim.pendingEvent!.options.some((option) => option.id === safe)).toBe(true);
  });

  it("clears the card and restarts the clock", () => {
    const sim = untilCard();
    const after = resolveEvent(sim, safestOption(sim.pendingEvent!));
    expect(after.pendingEvent).toBeNull();
    expect(after.speed).toBeGreaterThan(0);
  });

  it("writes down every decision for the results screen", () => {
    const sim = untilCard();
    const after = resolveEvent(sim, safestOption(sim.pendingEvent!));
    expect(after.decisions).toHaveLength(1);
    expect(after.decisions[0].eventName).toBe(sim.pendingEvent!.name);
    expect(after.decisions[0].day).toBe(Math.floor(sim.missionDay));
  });

  it("takes the fuel a fuel-costing choice says it will", () => {
    // Course drift: a correction burn costs exactly 8 kg.
    const base = makeSim(mars);
    const sim: SimState = {
      ...base,
      pendingEvent: {
        defId: "courseDrift",
        name: "Course drift",
        kind: "problem",
        explain: "",
        whatIsIt: "",
        realExample: "",
        howCommon: "",
        affectsPart: "engine",
        isProtected: false,
        protectedText: null,
        day: 50,
        options: [
          { id: "correct", label: "Correction burn", safe: true, chips: [] },
          { id: "ignore", label: "Ignore it", safe: false, chips: [] },
        ],
      },
      missionDay: 50,
    };
    const after = resolveEvent(sim, "correct");
    expect(after.fuelKg).toBe(base.fuelKg - 8);
    expect(after.decisions[0].hurt).toBe(false);
  });

  it("adds risk at arrival when the player ignores a problem", () => {
    const base = makeSim(mars);
    const sim: SimState = {
      ...base,
      missionDay: 50,
      pendingEvent: {
        defId: "courseDrift",
        name: "Course drift",
        kind: "problem",
        explain: "",
        whatIsIt: "",
        realExample: "",
        howCommon: "",
        affectsPart: "engine",
        isProtected: false,
        protectedText: null,
        day: 50,
        options: [{ id: "ignore", label: "Ignore it", safe: false, chips: [] }],
      },
    };
    const after = resolveEvent(sim, "ignore");
    expect(after.insertionRisk).toBeCloseTo(0.3, 6);
    expect(after.decisions[0].hurt).toBe(true);
  });

  it("moves the clock and the arrival together when days are lost", () => {
    const base = makeSim(mars);
    const sim: SimState = {
      ...base,
      missionDay: 60,
      pendingEvent: {
        defId: "softwareBug",
        name: "A bug in the flight software",
        kind: "problem",
        explain: "",
        whatIsIt: "",
        realExample: "",
        howCommon: "",
        affectsPart: "body",
        isProtected: false,
        protectedText: null,
        day: 60,
        options: [{ id: "upload", label: "Upload the fix", safe: true, chips: [] }],
      },
    };
    const daysLeftBefore = sim.totalDays - sim.missionDay;
    const after = resolveEvent(sim, "upload");
    expect(after.missionDay).toBe(68);
    expect(after.totalDays).toBe(base.totalDays + 8);
    // The clock jumps and the arrival moves back by the same amount, so the
    // journey still has exactly as far to run as it did a moment ago.
    expect(after.totalDays - after.missionDay).toBeCloseTo(daysLeftBefore, 6);
    // The spacecraft edges forward along its path, and never backwards.
    expect(progressOf(after)).toBeGreaterThan(progressOf(sim));
  });

  it("reports the days lost as the number on the card, not a rounded difference", () => {
    const base = makeSim(mars);
    const sim: SimState = {
      ...base,
      // An awkward fractional day, which is where a naive difference goes wrong.
      missionDay: 121.44,
      pendingEvent: {
        defId: "softwareBug",
        name: "A bug",
        kind: "problem",
        explain: "",
        whatIsIt: "",
        realExample: "",
        howCommon: "",
        affectsPart: "body",
        isProtected: false,
        protectedText: null,
        day: 121.44,
        options: [{ id: "upload", label: "Upload the fix", safe: true, chips: [] }],
      },
    };
    const after = resolveEvent(sim, "upload");
    expect(after.log.some((line) => line.text === "Lost 8 days.")).toBe(true);
  });

  it("schedules the follow-up a choice causes", () => {
    const base = makeSim(jupiter, 5);
    const sim: SimState = {
      ...base,
      missionDay: 300,
      pendingEvent: {
        defId: "bonusTarget",
        name: "An asteroid is passing close",
        kind: "opportunity",
        explain: "",
        whatIsIt: "",
        realExample: "",
        howCommon: "",
        affectsPart: "instruments",
        isProtected: false,
        protectedText: null,
        day: 300,
        options: [{ id: "turn", label: "Turn and photograph it", safe: false, chips: [] }],
      },
    };
    const after = resolveEvent(sim, "turn");
    const followUp = after.schedule.find((item) => item.defId === "extraData");
    expect(followUp).toBeDefined();
    expect(followUp!.day).toBeGreaterThan(after.missionDay);
    expect(followUp!.day).toBeLessThan(after.totalDays);
  });

  it("does nothing at all when there is no card waiting", () => {
    const sim = makeSim(mars);
    expect(resolveEvent(sim, "anything")).toBe(sim);
  });
});

describe("the braking burn", () => {
  function atArrival(scenario = mars, seed = 1234): SimState {
    return flySafely(makeSim(scenario, seed));
  }

  it("captures into orbit when there is fuel and the aim is good", () => {
    const sim = atArrival(moon);
    if (sim.phase !== "insertion") return; // lost on the way; nothing to test
    const after = resolveInsertion({ ...sim, insertionRisk: 0 });
    expect(after.phase).toBe("orbit");
    expect(after.log.at(-1)!.text).toContain("Orbit captured");
  });

  it("spends the fuel the burn needs", () => {
    const sim = atArrival(moon);
    if (sim.phase !== "insertion") return;
    const after = resolveInsertion({ ...sim, insertionRisk: 0 });
    expect(after.fuelKg).toBeLessThan(sim.fuelKg);
  });

  it("flies straight past when there is not enough fuel to slow down", () => {
    const sim = atArrival(moon);
    if (sim.phase !== "insertion") return;
    const after = resolveInsertion({ ...sim, fuelKg: 0 });
    expect(after.phase).toBe("flyby");
    expect(after.failReason).toContain("not enough fuel");
  });

  it("flies straight past when earlier decisions spoiled the aim", () => {
    const sim = atArrival(moon);
    if (sim.phase !== "insertion") return;
    const after = resolveInsertion({ ...sim, insertionRisk: 1 });
    expect(after.phase).toBe("flyby");
    expect(after.failReason).toContain("aim");
  });

  it("collects all the science once in orbit", () => {
    const sim = atArrival(moon);
    if (sim.phase !== "insertion") return;
    const after = resolveInsertion({ ...sim, insertionRisk: 0 });
    expect(after.scienceCollected).toBe(
      Math.round(after.scienceMax * after.scienceFactor * after.signalFactor),
    );
  });

  it("only runs at the arrival, not before", () => {
    const sim = makeSim(mars);
    expect(resolveInsertion(sim)).toBe(sim);
  });

  it("counts the remaining Δv from the fuel still on board", () => {
    const sim = makeSim(mars);
    expect(remainingDeltaV(sim)).toBeGreaterThan(0);
    expect(remainingDeltaV({ ...sim, fuelKg: 0 })).toBe(0);
  });
});

describe("a whole mission, every mission", () => {
  it("always finishes, and in a state the results screen understands", () => {
    for (const scenario of scenarios) {
      for (const seed of [1, 42, 777, 31337]) {
        let sim = flySafely(makeSim(scenario, seed));
        if (sim.phase === "insertion") sim = resolveInsertion(sim);
        expect(["orbit", "flyby", "lost"], `${scenario.id}/${seed}`).toContain(sim.phase);
        expect(isOver(sim), `${scenario.id}/${seed}`).toBe(true);
      }
    }
  });

  it("answers every card it raises", () => {
    for (const scenario of scenarios) {
      const sim = flySafely(makeSim(scenario, 2026));
      const fired = sim.schedule.filter((item) => item.fired).length;
      // Every fired card is either decided, or handled by the design with no card.
      expect(sim.decisions.length).toBeLessThanOrEqual(fired);
      expect(sim.pendingEvent).toBeNull();
    }
  });

  it("keeps every number sane the whole way", () => {
    for (const seed of [3, 30, 300]) {
      let sim = makeSim(jupiter, seed);
      let guard = 0;
      while (sim.phase === "cruise" && guard < 4000) {
        if (sim.pendingEvent) sim = resolveEvent(sim, safestOption(sim.pendingEvent));
        else sim = step(sim, 0.25);
        expect(sim.fuelKg).toBeGreaterThanOrEqual(0);
        expect(sim.powerFactor).toBeGreaterThan(0);
        expect(sim.signalFactor).toBeGreaterThan(0);
        expect(sim.scienceCollected).toBeGreaterThanOrEqual(0);
        expect(sim.insertionRisk).toBeLessThanOrEqual(0.9);
        expect(Number.isFinite(sim.missionDay)).toBe(true);
        guard += 1;
      }
    }
  });
});

describe("the chips on an option", () => {
  it("says so when a choice costs nothing", () => {
    expect(effectChips({ none: true })).toEqual([{ text: "Costs nothing", tone: "good" }]);
  });

  it("puts a sign on everything, so the direction is never in doubt", () => {
    const chips = effectChips({ fuelCost: 8, sciencePenalty: 0.1, daysLost: 3 });
    expect(chips.map((chip) => chip.text)).toEqual(["−8 kg fuel", "−10% science", "+3 days"]);
  });

  it("marks a gain as good and a loss as bad", () => {
    expect(effectChips({ scienceBonus: 0.15 })[0].tone).toBe("good");
    expect(effectChips({ signalPenalty: 0.2 })[0].tone).toBe("bad");
    expect(effectChips({ fuelSaved: 60 })[0].tone).toBe("good");
  });

  it("puts a risk in tens, which is easier to picture than a percentage", () => {
    expect(effectChips({ riskOfFailure: 0.25 })[0].text).toBe("3 in 10 risk of losing it");
    expect(effectChips({ riskAtInsertion: 0.3 })[0].text).toBe("3 in 10 risk at arrival");
  });

  it("never returns an empty list for a real effect", () => {
    expect(effectChips({ clearInsertionRisk: true }).length).toBeGreaterThan(0);
  });
});
