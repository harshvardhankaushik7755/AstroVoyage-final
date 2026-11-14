/**
 * The one place the player's choices live.
 *
 * Screens read from this store and call its actions; they never work anything
 * out for themselves. Everything derived — costs, checks, the flight — is
 * computed by the pure functions in src/physics and src/sim from what is held
 * here, so there is never a second copy of a number to keep in step.
 */
import { create } from "zustand";
import type { Design, PartGroup, Route, Scenario } from "../data/game";
import { findBody, findScenario, missionGoal, parts, presetDesign } from "../data/game";
import { withGoalInstrument } from "../physics/goals";
import { playSound, setMutedForSound } from "../audio";
import { designFlags } from "../physics/checks";
import type { SimState } from "../sim/simulation";
import { createSimulation, resolveEvent, resolveInsertion, step } from "../sim/simulation";
import { DEMO_SCENARIO, demoSchedule } from "../sim/demo";

export type Screen = "home" | "choose" | "design" | "launch" | "control" | "result";

/** What the Design Lab starts with: the cheapest of everything, and nothing to do science with yet. */
function startingDesign(): Design {
  return {
    bodyId: parts.bodies[0].id,
    instrumentIds: [],
    powerId: parts.powerSources[0].id,
    antennaId: parts.antennas[0].id,
    engineId: parts.engines[0].id,
    rocketId: parts.rockets[0].id,
    fuelKg: 0,
  };
}

export interface GameState {
  screen: Screen;
  scenarioId: string | null;
  /** Which of the mission's goals the player chose. Null before they choose. */
  goalId: string | null;
  design: Design;
  launchMonth: number;
  route: Route;

  /** The flight, once it has started. Null everywhere before Mission Control. */
  sim: SimState | null;

  /** Set by the player, and by the operating system's reduced-motion setting. */
  skipAnimations: boolean;
  muted: boolean;

  /* ---- moving around */
  go: (screen: Screen) => void;
  chooseScenario: (id: string) => void;
  chooseGoal: (id: string) => void;
  startOver: () => void;

  /* ---- designing */
  setPart: (group: Exclude<PartGroup, "instruments">, id: string) => void;
  toggleInstrument: (id: string) => void;
  setFuel: (kg: number) => void;
  loadPreset: () => void;

  /* ---- launching */
  setLaunchMonth: (month: number) => void;
  setRoute: (route: Route) => void;

  /* ---- flying */
  launch: (seed?: number) => void;
  /** Pick Mars, load the tested design, and fly a curated set of challenges. */
  startDemo: () => void;
  /** Advance the flight by this many real seconds. */
  tick: (realSeconds: number) => void;
  setSpeed: (speed: number) => void;
  /** Answer the waiting challenge. */
  answer: (optionId: string) => void;
  /** Run the braking burn at arrival. */
  doInsertion: () => void;

  /* ---- preferences */
  setSkipAnimations: (skip: boolean) => void;
  setMuted: (muted: boolean) => void;
}

export const useGame = create<GameState>((set, get) => ({
  screen: "home",
  scenarioId: null,
  goalId: null,
  design: startingDesign(),
  launchMonth: 0,
  route: "slow",
  sim: null,
  skipAnimations: false,
  muted: true,

  go: (screen) => set({ screen }),

  chooseScenario: (id) => {
    const scenario = findScenario(id);
    if (!scenario) return;
    // A fresh design each time, so switching mission never leaves old parts behind.
    set({
      scenarioId: id,
      goalId: scenario.goals[0].id,
      design: startingDesign(),
      launchMonth: scenario.preset.launchMonth,
      route: "slow",
      sim: null,
      screen: "design",
    });
  },

  chooseGoal: (id) => set({ goalId: id }),

  startOver: () =>
    set({
      screen: "home",
      scenarioId: null,
      goalId: null,
      design: startingDesign(),
      launchMonth: 0,
      route: "slow",
      sim: null,
    }),

  setPart: (group, id) =>
    set((state) => {
      const design = { ...state.design };
      switch (group) {
        case "body": {
          design.bodyId = id;
          // A smaller bus may not have room for everything already chosen.
          const slots = findBody(id)?.slots ?? 0;
          design.instrumentIds = design.instrumentIds.slice(0, slots);
          break;
        }
        case "power":
          design.powerId = id;
          break;
        case "antenna":
          design.antennaId = id;
          break;
        case "engine":
          design.engineId = id;
          break;
        case "rocket":
          design.rocketId = id;
          break;
      }
      return { design };
    }),

  toggleInstrument: (id) =>
    set((state) => {
      const chosen = state.design.instrumentIds;
      if (chosen.includes(id)) {
        return { design: { ...state.design, instrumentIds: chosen.filter((i) => i !== id) } };
      }
      const slots = findBody(state.design.bodyId)?.slots ?? 0;
      // Silently ignoring the click would be baffling; the screen disables the
      // card instead and explains that the bus is full.
      if (chosen.length >= slots) return state;
      return { design: { ...state.design, instrumentIds: [...chosen, id] } };
    }),

  setFuel: (kg) =>
    set((state) => ({
      design: { ...state.design, fuelKg: Math.max(0, Math.round(kg)) },
    })),

  loadPreset: () => {
    const state = get();
    const scenario = currentScenario(state);
    if (!scenario) return;
    // The preset is tuned for the mission's first goal. If the player picked a
    // different one, the instrument it needs goes in too, or the button would
    // hand back a design that fails the very first check.
    set({
      design: withGoalInstrument(presetDesign(scenario), missionGoal(scenario, state.goalId)),
      launchMonth: scenario.preset.launchMonth,
      route: scenario.preset.route,
    });
  },

  setLaunchMonth: (month) => set({ launchMonth: Math.max(0, Math.round(month)) }),
  setRoute: (route) => set({ route }),

  launch: (seed) => {
    const state = get();
    const scenario = currentScenario(state);
    if (!scenario) return;
    // A fresh seed each launch, so the same design can have a different trip.
    const useSeed = seed ?? Math.floor(Math.random() * 0x7fffffff);
    set({
      sim: createSimulation(
        state.design,
        scenario,
        state.route,
        state.launchMonth,
        [...designFlags(state.design, scenario)],
        useSeed,
      ),
      screen: "control",
    });
    playSound("launch");
  },

  startDemo: () => {
    const scenario = findScenario(DEMO_SCENARIO);
    if (!scenario) return;
    const design = presetDesign(scenario);
    const sim = createSimulation(
      design,
      scenario,
      scenario.preset.route,
      scenario.preset.launchMonth,
      [...designFlags(design, scenario)],
      20261114,
    );
    set({
      scenarioId: scenario.id,
      goalId: scenario.goals[0].id,
      design,
      launchMonth: scenario.preset.launchMonth,
      route: scenario.preset.route,
      // The drawn schedule is replaced with the curated one, so a judge sees
      // the same four cards every time.
      sim: { ...sim, schedule: demoSchedule(sim.totalDays) },
      screen: "control",
    });
  },

  tick: (realSeconds) => {
    const sim = get().sim;
    if (!sim) return;
    const next = step(sim, realSeconds);
    // step() returns the same object when nothing moved, so this avoids a
    // pointless re-render on every animation frame while paused.
    if (next !== sim) set({ sim: next });
  },

  setSpeed: (speed) => {
    const sim = get().sim;
    if (!sim) return;
    set({ sim: { ...sim, speed: Math.max(0, speed) } });
  },

  answer: (optionId) => {
    const sim = get().sim;
    if (!sim) return;
    set({ sim: resolveEvent(sim, optionId) });
  },

  doInsertion: () => {
    const sim = get().sim;
    if (!sim) return;
    set({ sim: resolveInsertion(sim) });
  },

  setSkipAnimations: (skipAnimations) => set({ skipAnimations }),
  setMuted: (muted) => {
    setMutedForSound(muted);
    set({ muted });
    // Play something the moment it is switched on, so the button proves itself.
    if (!muted) playSound("click");
  },
}));

/** The chosen mission, or undefined before one is picked. */
export function currentScenario(state: Pick<GameState, "scenarioId">): Scenario | undefined {
  return state.scenarioId ? findScenario(state.scenarioId) : undefined;
}

/** A hook for the common case: the screen needs the mission it is showing. */
export function useScenario(): Scenario | undefined {
  return useGame((state) => (state.scenarioId ? findScenario(state.scenarioId) : undefined));
}
