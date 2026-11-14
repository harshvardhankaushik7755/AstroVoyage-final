/**
 * Launch windows.
 *
 * A spacecraft cannot leave for Mars whenever it likes. Earth and Mars have to
 * be in the right places, and that only happens about every 26 months; for
 * Jupiter it is about every 13. The Moon needs no window at all, which is why
 * it makes a good tutorial.
 *
 * Alignment periods: NASA JPL Horizons, Solar System Dynamics
 * https://ssd.jpl.nasa.gov/horizons/
 */
import type { Route, Scenario } from "../data/game";
import { settings } from "../data/game";

/** The calendar the player picks from: two years, so Jupiter shows two windows and Mars one. */
export const CALENDAR_MONTHS = 24;

/** The first year on the calendar. */
export const START_YEAR = 2027;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** True modulo: always returns a value between 0 and n−1, even for negative input. */
function mod(value: number, n: number): number {
  return ((value % n) + n) % n;
}

/** "Nov 2027" for calendar month 10. */
export function monthLabel(month: number): string {
  const name = MONTH_NAMES[mod(month, 12)];
  const year = START_YEAR + Math.floor(month / 12);
  return `${name} ${year}`;
}

/** Just "Nov", for a tight calendar cell. */
export function monthShortLabel(month: number): string {
  return MONTH_NAMES[mod(month, 12)];
}

/**
 * Is the window open in this calendar month?
 * A mission with `windowMonths: 0` — the Moon — can launch any month.
 */
export function isWindowOpen(scenario: Scenario, month: number): boolean {
  if (scenario.windowMonths <= 0) return true;
  return mod(month - scenario.windowOffset, scenario.windowMonths) === 0;
}

/** Every month on the calendar when this mission could launch. */
export function openWindows(scenario: Scenario): number[] {
  const months: number[] = [];
  for (let month = 0; month < CALENDAR_MONTHS; month += 1) {
    if (isWindowOpen(scenario, month)) months.push(month);
  }
  return months;
}

/**
 * The first open month from `fromMonth` onwards, or null if the calendar runs
 * out before the next one. Used for the "next window" line on the Launch screen.
 */
export function nextWindow(scenario: Scenario, fromMonth: number): number | null {
  for (let month = Math.max(0, fromMonth); month < CALENDAR_MONTHS; month += 1) {
    if (isWindowOpen(scenario, month)) return month;
  }
  return null;
}

/** How many months until the window opens again. 0 when it is open now. */
export function monthsToWait(scenario: Scenario, fromMonth: number): number | null {
  const next = nextWindow(scenario, fromMonth);
  return next === null ? null : next - fromMonth;
}

/**
 * The Δv this trip needs, in km/s: the cruise plus the braking burn at
 * arrival, scaled by the route the player picked.
 */
export function requiredDeltaV(scenario: Scenario, route: Route): number {
  const factor = settings.routes[route].deltaVFactor;
  return (scenario.deltaV + scenario.insertionDeltaV) * factor;
}

/** How long the trip takes on this route, in whole days. */
export function tripDays(scenario: Scenario, route: Route): number {
  return Math.round(scenario.tripDays * settings.routes[route].tripFactor);
}

/**
 * A one-line plain-English answer to "can I launch this month?".
 */
export function windowMessage(scenario: Scenario, month: number): string {
  if (scenario.windowMonths <= 0) {
    return `${scenario.targetProse} needs no launch window. Any month works.`;
  }
  if (isWindowOpen(scenario, month)) {
    return `${monthLabel(month)} is a launch window. ${scenario.target} is in the right place.`;
  }
  const wait = monthsToWait(scenario, month);
  if (wait === null) {
    return `${scenario.target} is not in the right place. Pick a green month.`;
  }
  return `${scenario.target} is not in the right place in ${monthLabel(month)}. The next window is ${monthLabel(month + wait)}.`;
}
