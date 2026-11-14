# Mission Architect — project context

A browser game for the NASA Space Apps Challenge 2026, challenge "Space Mission Design Game".
The player picks a mission (Moon / Mars / Jupiter), designs a spacecraft under budget, mass, power and
fuel limits, launches it, watches a time-scaled simulation with surprise challenges, and gets a score
plus a "Flight Director" explanation.

Players are students aged 12+. UI language: very simple English.

## Stack (do not change)
- React 19 + TypeScript + Vite. State in zustand (`src/store/gameStore.ts`). Tests in vitest.
- No new UI libraries. Plain CSS in `src/styles.css`. Animation with SVG + requestAnimationFrame.
- Physics is pure TypeScript in `src/physics/` with NO React imports, so it can be unit-tested.

## Folder map
```
src/data/       parts, scenarios, events, settings, realMissions, glossary, nasaSources, sky  ← all numbers
src/physics/    rocketEquation, power, comms, windows, checks, partEffects, missionFacts
src/sim/        simulation (the cruise engine), score, shipLayout, context, sky, demo
src/store/      gameStore.ts — the ONLY place game state lives
src/screens/    Home, ChooseMission, DesignLab, Launch, MissionControl, Result
src/components/ ResourceBars, Gauge, Spacecraft, Starfield, Beat, Glossary, Provenance, Timeline
```

## Rules
1. Numbers come from `src/data/*.json`, never hard-coded in screens.
2. Physics stays real: Tsiolkovsky rocket equation, inverse-square sunlight, real launch windows,
   a Hohmann transfer timed with Kepler's equation.
3. Every physics and simulation function gets a vitest test next to it (`*.test.ts`).
4. `npm run build` must pass (it runs `tsc -b`) before any task is done.
5. Plain English in the UI. Short sentences. A 12-year-old must understand every message.
6. Screens are dumb: they read the store and call store actions. Logic lives in `src/physics/` or `src/sim/`.
7. Keep the dark space theme and the CSS variables in `src/styles.css`.
8. No backend. The Flight Director must work from rules when there is no API key.

## Time scale rule
Every mission's cruise takes about 60-90 real seconds whatever the distance, so the time scale is
per scenario: Moon ~ "1 second = 1 hour", Mars ~ "1 second = 4 days", Jupiter ~ "1 second = 1 month".
Always show the scale and the mission clock ("Day 142 of 240 - 1 sec = 4 days").
Speed buttons: Pause / 1x / 4x. The game auto-pauses when a challenge appears.

## Commands
- `npm run dev` — dev server on http://localhost:5173
- `npm test` — vitest
- `npm run build` — type-check + production build
