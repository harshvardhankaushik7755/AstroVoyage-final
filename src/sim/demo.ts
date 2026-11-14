/**
 * Demo mode, for testers and judges: open the game with `?demo=1` and one
 * button flies a mission that shows everything the game does, in half a minute.
 *
 * The cards are chosen, not random: a problem, a green opportunity, the
 * follow-up that the opportunity causes (which names the day it was chosen),
 * and a hazard that only happens to solar panels. That last one is the point —
 * the challenges depend on the spacecraft you built.
 *
 * It flies Mars rather than the Moon on purpose. Every cruise takes about the
 * same 75 seconds whatever the distance, but a Moon trip is only four days
 * long, so the three days a photograph costs would throw the last cards on top
 * of each other. On Mars those three days are a nudge in a 240-day trip and the
 * cards stay evenly spaced.
 */

/** The mission the demo flies. */
export const DEMO_SCENARIO = "mars";

/**
 * The cards, in order, as a share of the cruise. Kept inside the first half so
 * a judge sees all of them without waiting out the whole flight.
 */
const DEMO_CARDS: { defId: string; at: number }[] = [
  { defId: "debris", at: 0.08 },
  { defId: "bonusTarget", at: 0.17 },
  { defId: "sunPush", at: 0.26 },
  { defId: "safeMode", at: 0.36 },
];

export interface DemoSlot {
  day: number;
  defId: string;
  fired: boolean;
}

/** Is the game running in demo mode? */
export function isDemo(search = typeof window === "undefined" ? "" : window.location.search): boolean {
  return new URLSearchParams(search).get("demo") === "1";
}

/** The curated schedule, in mission days. */
export function demoSchedule(totalDays: number): DemoSlot[] {
  return DEMO_CARDS.map((card) => ({
    day: Math.round(card.at * totalDays),
    defId: card.defId,
    fired: false,
  }));
}
