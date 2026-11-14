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
import { findBody, findScenario, parts, presetDesign } from "../data/game";

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
  design: Design;
  launchMonth: number;
  route: Route;

  /** Set by the player, and by the operating system's reduced-motion setting. */
  skipAnimations: boolean;
  muted: boolean;

  /* ---- moving around */
  go: (screen: Screen) => void;
  chooseScenario: (id: string) => void;
  startOver: () => void;

  /* ---- designing */
  setPart: (group: Exclude<PartGroup, "instruments">, id: string) => void;
  toggleInstrument: (id: string) => void;
  setFuel: (kg: number) => void;
  loadPreset: () => void;

  /* ---- launching */
  setLaunchMonth: (month: number) => void;
  setRoute: (route: Route) => void;

  /* ---- preferences */
  setSkipAnimations: (skip: boolean) => void;
  setMuted: (muted: boolean) => void;
}

export const useGame = create<GameState>((set, get) => ({
  screen: "home",
  scenarioId: null,
  design: startingDesign(),
  launchMonth: 0,
  route: "slow",
  skipAnimations: false,
  muted: true,

  go: (screen) => set({ screen }),

  chooseScenario: (id) => {
    const scenario = findScenario(id);
    if (!scenario) return;
    // A fresh design each time, so switching mission never leaves old parts behind.
    set({
      scenarioId: id,
      design: startingDesign(),
      launchMonth: scenario.preset.launchMonth,
      route: "slow",
      screen: "design",
    });
  },

  startOver: () =>
    set({
      screen: "home",
      scenarioId: null,
      design: startingDesign(),
      launchMonth: 0,
      route: "slow",
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
    const scenario = currentScenario(get());
    if (!scenario) return;
    set({
      design: presetDesign(scenario),
      launchMonth: scenario.preset.launchMonth,
      route: scenario.preset.route,
    });
  },

  setLaunchMonth: (month) => set({ launchMonth: Math.max(0, Math.round(month)) }),
  setRoute: (route) => set({ route }),

  setSkipAnimations: (skipAnimations) => set({ skipAnimations }),
  setMuted: (muted) => set({ muted }),
}));

/** The chosen mission, or undefined before one is picked. */
export function currentScenario(state: Pick<GameState, "scenarioId">): Scenario | undefined {
  return state.scenarioId ? findScenario(state.scenarioId) : undefined;
}

/** A hook for the common case: the screen needs the mission it is showing. */
export function useScenario(): Scenario | undefined {
  return useGame((state) => (state.scenarioId ? findScenario(state.scenarioId) : undefined));
}
