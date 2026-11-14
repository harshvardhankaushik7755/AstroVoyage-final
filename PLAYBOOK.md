# Hackathon playbook — rebuild Mission Architect in 6–8 hours

One laptop, one day, virtual event. Every prompt below is self-contained: paste it into a fresh Claude
Code session in the new folder and it will work without knowing anything about the old project.

---

## Before you start — 15 minutes, do it tonight

1. **Read this edition's rules on pre-existing work.** Space Apps normally allows your own
   open-source work if you say so. Your old repo is public with commits dated September and October,
   so a judge can see them. Decide now which line you are using and put it on the project page:

   > Built during the event on top of my own earlier prototype
   > (github.com/kunalkaushik1982/astrovoyage, MIT), which I wrote and open-sourced before the hackathon.

   That sentence costs you nothing and removes the only real risk to the entry.

2. **Make the new repo** (empty, no README — you want the first commit to be yours, tomorrow):
   `github.com/<you>/mission-architect-spaceapps`

3. **Keep this file open in a second window.** Do not copy code from the old project — copy *prompts*.
   The commit history of the new repo is your evidence that it was built during the event.

---

## The clock

| Time | Prompt | What you have at the end |
|---|---|---|
| 0:00 | Setup + **P0** | Empty Vite app, CLAUDE.md, first commit |
| 0:20 | **P1** | All the game numbers in `src/data/*.json` |
| 1:00 | **P2** | Real physics, with tests that prove it |
| 1:45 | **P3** | Home → Choose mission → Design Lab, four live bars |
| 2:30 | **P4** | Launch calendar with a real launch window |
| 3:00 | **P5** | Flight engine: Hohmann transfer, fuel, power, signal |
| 3:50 | **P6** | Mission Control: live map, gauges, clock |
| 4:40 | **P7** | Challenges with decisions ← **YOU CAN DEMO FROM HERE** |
| 5:30 | **P8** | Results, score, stars, Flight Director |
| 6:10 | **P9** | `?demo=1` one-click demo, fits a laptop |
| 6:40 | **P10** | README with screenshots |
| 7:10 | — | **Submission pack. Do not skip this.** |

**The rule that saves you:** after every prompt run `npm test` and `npm run build`, then commit.
Never start the next prompt on a red test. If a prompt runs past 50 minutes, keep what works, commit,
and move on — a finished small game beats an unfinished big one.

---

## Setup — copy-paste, 10 minutes

```bash
npm create vite@latest mission-architect-spaceapps -- --template react-ts
cd mission-architect-spaceapps
npm install
npm install zustand
npm install -D vitest jsdom
git init
git add -A && git commit -m "Scaffold: Vite + React + TypeScript"
git remote add origin https://github.com/<you>/mission-architect-spaceapps.git
git push -u origin main
```

Then one terminal on `npm run dev` all day, one for Claude Code, one for `npm test`.

---

## P0 — the rules file (do this first, it pays for itself)

```
Create CLAUDE.md in the repo root with exactly this content, then set up vitest.

# Mission Architect — project context

A browser game for NASA Space Apps 2026, challenge "Space Mission Design Game". The player picks a
mission (Moon / Mars / Jupiter), designs a spacecraft under budget, mass, power and fuel limits,
launches it, watches a time-scaled simulation with surprise challenges, and gets a score plus a
"Flight Director" explanation. Players are students aged 12+. UI language: very simple English.

## Stack (do not change)
- React 19 + TypeScript + Vite. State in zustand (src/store/gameStore.ts). Tests in vitest.
- No new UI libraries. Plain CSS in src/styles.css. Animation with SVG + requestAnimationFrame.
- Physics is pure TypeScript in src/physics/ with NO React imports, so it can be unit-tested.

## Rules
1. Numbers come from src/data/*.json, never hard-coded in screens.
2. Physics stays real: rocket equation, inverse-square sunlight, real launch windows.
3. Every physics and simulation function gets a vitest test.
4. `npm run build` must pass (it runs tsc --noEmit) before any task is done.
5. Plain English in the UI. Short sentences. A 12-year-old must understand every message.
6. Screens are dumb: they read the store and call store actions. Logic lives in src/physics/ or src/sim/.
7. Keep the dark space theme and the CSS variables in styles.css.

Also: add vitest to vite.config.ts (globals: true, environment: "node"), add "test": "vitest run" and
"build": "tsc --noEmit && vite build" to package.json scripts, and create the folders src/data,
src/physics/__tests__, src/sim/__tests__, src/screens, src/components, src/store.
Run npm test and npm run build to prove it works.
```

---

## P1 — all the game numbers (20 min)

```
Create the three data files below exactly as given. These are balanced game values — do not change
any number. Add a short comment at the top of each explaining what it is. Then write a vitest test
that loads all three and checks every id is unique and every scenario preset refers to real part ids.

src/data/parts.json:
{
  "fuelPricePerKg": 0.01,
  "bodies": [
    { "id": "small", "name": "Small bus", "mass": 250, "cost": 30, "slots": 2, "backup": false, "note": "Room for 2 instruments" },
    { "id": "medium", "name": "Medium bus", "mass": 500, "cost": 60, "slots": 3, "backup": false, "note": "Room for 3 instruments" },
    { "id": "large", "name": "Large bus", "mass": 1000, "cost": 120, "slots": 3, "backup": true, "note": "3 instruments + backup systems" }
  ],
  "instruments": [
    { "id": "camera", "name": "Camera", "mass": 20, "power": 30, "cost": 10, "science": 10, "dataNeed": 2, "note": "Takes pictures" },
    { "id": "spectrometer", "name": "Spectrometer", "mass": 30, "power": 40, "cost": 20, "science": 20, "dataNeed": 3, "note": "Finds what things are made of" },
    { "id": "radar", "name": "Radar", "mass": 60, "power": 120, "cost": 35, "science": 30, "dataNeed": 6, "note": "Sees below the surface" },
    { "id": "magnetometer", "name": "Magnetometer", "mass": 5, "power": 5, "cost": 3, "science": 8, "dataNeed": 1, "note": "Measures magnetic field" },
    { "id": "weather", "name": "Weather sensor", "mass": 10, "power": 15, "cost": 5, "science": 8, "dataNeed": 1, "note": "Wind, dust and temperature" }
  ],
  "powerSources": [
    { "id": "solarSmall", "name": "Small solar panels", "type": "solar", "mass": 40, "powerAt1AU": 600, "cost": 8, "note": "Power drops far from the Sun" },
    { "id": "solarLarge", "name": "Large solar panels", "type": "solar", "mass": 120, "powerAt1AU": 2800, "cost": 20, "note": "Power drops far from the Sun" },
    { "id": "rtg", "name": "Nuclear battery (RTG)", "type": "rtg", "mass": 60, "powerAt1AU": 110, "cost": 80, "note": "Same power anywhere, but expensive" }
  ],
  "antennas": [
    { "id": "antSmall", "name": "Small antenna", "mass": 5, "power": 20, "cost": 2, "dataRate": 4, "note": "Slow" },
    { "id": "antLarge", "name": "Large dish antenna", "mass": 30, "power": 60, "cost": 12, "dataRate": 40, "note": "10 times faster" }
  ],
  "engines": [
    { "id": "chemical", "name": "Chemical engine", "isp": 320, "mass": 30, "cost": 10, "powerNeed": 0, "burnProfile": "impulsive", "note": "Strong push. Needs a lot of fuel." },
    { "id": "ion", "name": "Electric (ion) engine", "isp": 3000, "mass": 50, "cost": 30, "powerNeed": 1000, "burnProfile": "continuous", "note": "Very little fuel, but needs 1,000 W and makes trips longer." }
  ],
  "rockets": [
    { "id": "light", "name": "Light rocket", "capacity": 2200, "cost": 30, "note": "Like a small PSLV-class rocket" },
    { "id": "medium", "name": "Medium rocket", "capacity": 8000, "cost": 70, "note": "Like an LVM3-class rocket" },
    { "id": "heavy", "name": "Heavy rocket", "capacity": 22000, "cost": 150, "note": "Like a Falcon 9-class rocket" }
  ]
}

src/data/scenarios.json — three entries with these fields:
  moon:    name "Moon Orbiter", level "Easy (tutorial)", goal "Map the Moon from orbit", budget 250,
           deltaV 4.0, distanceAU 1.0, commsFactor 1.0, tripDays 3, windowMonths 0, windowOffset 0,
           missionMonths 6, dustRisk 0, target "Moon", targetProse "the Moon", color "#cfcfcf",
           centralBody "earth", targetOrbitRadiusAU 0.00257, targetOrbitDays 27.3, insertionDeltaV 0.8,
           preset { bodyId small, instrumentIds [camera, magnetometer], powerId solarSmall,
                    antennaId antSmall, engineId chemical, rocketId medium, fuelKg 1400,
                    launchMonth 3, route "slow" }
  mars:    name "Mars on a Budget", level "Medium", goal "Reach Mars orbit and send back photos",
           budget 150, deltaV 5.7, distanceAU 1.52, commsFactor 0.1, tripDays 240, windowMonths 26,
           windowOffset 10, missionMonths 12, dustRisk 0.15, target "Mars", targetProse "Mars",
           color "#e5744a", centralBody "sun", targetOrbitRadiusAU 1.52, targetOrbitDays 687,
           insertionDeltaV 1.0,
           preset { bodyId small, instrumentIds [camera], powerId solarSmall, antennaId antLarge,
                    engineId chemical, rocketId light, fuelKg 1800, launchMonth 10, route "slow" }
  jupiter: name "Jupiter Explorer", level "Hard", goal "Study Jupiter's clouds and magnetic field",
           budget 900, deltaV 7.0, distanceAU 5.2, commsFactor 0.05, tripDays 1900, windowMonths 13,
           windowOffset 4, missionMonths 12, dustRisk 0, target "Jupiter", targetProse "Jupiter",
           color "#d9a066", centralBody "sun", targetOrbitRadiusAU 5.2, targetOrbitDays 4333,
           insertionDeltaV 1.5,
           preset { bodyId small, instrumentIds [camera, magnetometer], powerId solarLarge,
                    antennaId antLarge, engineId chemical, rocketId medium, fuelKg 3500,
                    launchMonth 4, route "slow" }
  Give each one a one-line `description` in simple English.

src/data/settings.json:
{ "cruiseSeconds": 75, "fuelMargin": 1.15, "decisionSeconds": 20, "burnHoldMs": 1200,
  "insertionCountdownMs": 1500, "effectMs": 2000, "clockJumpMs": 1500,
  "eventsPerMission": { "min": 3, "max": 5 }, "eventWindow": { "from": 0.15, "to": 0.85 } }
```

---

## P2 — the physics, with tests that prove it (45 min)

This is the part judges score as "scientific validity". Do not rush it.

```
Write the physics layer in src/physics/ as pure TypeScript — no React imports anywhere — with a
vitest test file per module in src/physics/__tests__/. Use these exact formulas.

rocketEquation.ts  (G0 = 9.80665)
  deltaV(isp, fullMassKg, emptyMassKg) = isp * G0 * ln(full/empty) / 1000   → km/s, 0 if full <= empty
  fuelNeeded(isp, emptyMassKg, dvKmS)  = emptyMassKg * (exp(dv*1000/(isp*G0)) - 1)
  fuelBurned(isp, fullMassKg, dvKmS)   = fullMassKg * (1 - exp(-dv*1000/(isp*G0)))
  Test against a known case: Isp 320, 1000 kg wet, 500 kg dry → about 2.18 km/s.

power.ts
  solarPowerAt(powerAt1AU, distanceAU) = powerAt1AU / distanceAU^2   (inverse square, real physics)
  powerMade(source, distanceAU) = source.type === "rtg" ? powerAt1AU : solarPowerAt(...)
  Test: the same panels make about 600 W at 1 AU and about 22 W at Jupiter (5.2 AU). An RTG does not care.

comms.ts
  LIGHT_MINUTES_PER_AU = 8.317   (a real number, not a game value)
  dataReturnedFraction(antennaRate, commsFactor, dataNeed) = min(1, antennaRate*commsFactor/dataNeed)
  formatSignalDelay(minutes) → "18 seconds" under a minute, "20 minutes", "1 hour 4 minutes" above.
  Test: the small antenna returns 100% of the science at the Moon and about 10% at Mars.

windows.ts
  A launch window repeats every scenario.windowMonths months, starting at windowOffset, and lasts
  one month. windowMonths 0 means every month is fine (the Moon).
  checkWindow(scenario, launchMonth) → { ok, nextOkMonth, message in plain English }
  ROUTE: "slow" = the cheap Hohmann transfer (tripDays as given, deltaV as given);
         "fast" = 25% less trip time for 20% more deltaV.
  Test: Mars is open at month 10 and shut at month 11; the Moon is open every month.

checks.ts — the four launch checks the whole game turns on:
  runChecks(design, scenario, launchMonth, route) returns, for each of budget / mass / power / dv,
  a { value, limit, ok, label } bar, plus a comms fraction, instrument slots, trip days, dry mass,
  science total, allOk and a list of plain-English problems.
    budget: sum of part costs + fuelKg * fuelPricePerKg, limit scenario.budget
    mass:   dry mass + fuel, limit rocket.capacity
    power:  sum of instrument + antenna + engine power needs, limit powerMade at the target distance
    dv:     deltaV(engine.isp, dry+fuel, dry) must be >= scenario.deltaV * route multiplier
  Also export getBody/getInstrument/getPower/getAntenna/getEngine/getRocket/findScenario helpers.
  Test: each scenario's preset design passes all four checks; a design with no fuel fails dv only.

Run npm test and npm run build before you finish.
```

---

## P3 — store, Home, Choose mission, Design Lab (45 min)

```
Build the first three screens and the store. Dark space theme, CSS variables in src/styles.css.

src/store/gameStore.ts (zustand): screen, scenarioId, design, launchMonth, route, sim (null for now),
and the actions go, pickScenario, setPart, toggleInstrument, setFuel, loadPreset, reset.
The Design type is { bodyId, instrumentIds[], powerId, antennaId, engineId, rocketId, fuelKg }.

src/screens/Home.tsx — title, one sentence on what the game is, a three-step "How to play" strip
(1 Pick a mission, 2 Build a spacecraft, 3 Launch and keep it alive), and two buttons:
"Try the tutorial (Moon)" and "Start a mission".

src/screens/ChooseMission.tsx — one card per scenario with name, level, goal, budget and description,
and a "Design this mission" button.

src/screens/DesignLab.tsx — the heart of the game:
  - Six part groups as an accordion, one open at a time: 1. Spacecraft body, 2. Science instruments
    (multi-select, limited by body slots), 3. Power, 4. Antenna, 5. Engine and fuel (a fuel slider),
    6. Rocket.
  - Every part card shows name, mass, cost and its note.
  - Four live bars across the top from runChecks: Budget, Mass, Power, Fuel (Δv). Green when ok, red
    when not, each with its number and limit.
  - Plain-English problems listed under the bars ("The rocket cannot lift this much", not "mass > capacity").
  - A "Load a design that works" button that fills in the scenario preset.
  - "Go to launch calendar" is disabled until all four checks pass.

Keyboard: every control focusable, visible focus ring, arrow keys move within a part group.
Screens read the store and call actions — no physics in the components.
```

---

## P4 — launch calendar (30 min)

```
src/screens/Launch.tsx — a 12-month calendar grid for the launch year.
  - Months inside the launch window are a green band; months outside are dimmed and say why
    ("Mars is only in the right place every 26 months. The next window is month 10.").
  - A Fast / Slow route choice showing the trade: slow is cheaper in fuel, fast arrives sooner.
  - A one-line summary of the spacecraft being flown, with the live fuel figure.
  - A big "Launch! 🚀" button, disabled unless the window is open and all checks still pass.
  - Under it, a "Learn more" fold explaining in two sentences what a launch window is and why it exists.
Clicking Launch calls startMission() in the store and moves to the mission screen.
```

---

## P5 — the flight engine (50 min)

The other half of "scientific validity". Pure functions, fully tested, no React.

```
Write src/sim/simulation.ts as a pure engine with vitest tests in src/sim/__tests__/.

createSimulation(design, scenario, launchMonth, route, check, seed?, schedule?) → SimState
step(state, days) → SimState          (never mutates; returns the same object if nothing can happen)
timeScale(totalDays) → { daysPerSecond, label }

SimState holds: config, missionDay, totalDays, phase ("cruise" | "insertion" | "orbit" | "failed"),
spacecraft { radiusAU, angleRad }, earthAngleRad, targetAngleRad, distanceFromEarthAU,
distanceFromSunAU, powerW, signalStrength, signalDelayMinutes, fuelKg, scienceCollected, log[].

The flight path is a real Hohmann-style half-ellipse solved with Kepler's equation, so the spacecraft
moves fast near the Sun and slow far from it:
  a = (r1 + r2) / 2,  e = |r2 - r1| / (r1 + r2)
  mean anomaly M = (outward ? 0 : π) + π * fraction
  solve M = E - e·sin(E) for E by bisection (60 iterations is plenty)
  radius = a(1 - e·cos E), true anomaly from the standard half-angle formula
Earth and the target move on their own circular orbits (EARTH_ORBIT_DAYS = 365.25, the target's
period from scenario.targetOrbitDays), placed so the target is where the transfer ends on arrival day.

Along the way, recomputed every step: power from the inverse-square law at the current distance,
signal strength and one-way delay from distance (8.317 light-minutes per AU), fuel burned by the
cruise, science collected scaled by how much data actually reaches Earth.

Time scale rule: every mission's cruise must take 60–90 real seconds whatever the distance, so
daysPerSecond = totalDays / settings.cruiseSeconds. Label it for the player: the Moon reads
"1 sec = 90 minutes", Mars "1 sec = 5 days", Jupiter about "1 sec = 1 month".

At totalDays the phase becomes "insertion": the next step performs the braking burn. If there is not
enough fuel left for scenario.insertionDeltaV the spacecraft flies past and the phase becomes
"failed"; otherwise "orbit".

Seeded randomness only (mulberry32), so a mission can be replayed exactly: nextRandom(state) returns
{ value, state }. Never call Math.random in the engine.

Tests: the transfer ends at the target radius; the Moon trip takes 3 days and Jupiter 1900; power at
Jupiter is a fraction of power at Earth; a fuel-starved design flies past instead of entering orbit;
step() with a pending decision does not move the clock.
```

---

## P6 — Mission Control (50 min)

```
src/screens/MissionControl.tsx — the cockpit, on one screen at 1366x650 with no scrolling.

Layout: the map fills the left, six gauges stack on the right, a three-line mission log sits below.

The map is an SVG, viewBox 0 0 640 400:
  - Sun-centred missions: the Sun in the middle, dashed circles for Earth's orbit and the target's,
    both planets as labelled dots moving along them.
  - Moon missions: Earth in the middle, the Moon on its orbit.
  - The spacecraft as a small triangle pointing along its direction of travel, with the path it has
    already flown as a solid trail behind it.
  - A scale bar in the corner worked out from the map's own AU-to-pixel factor ("0.5 AU · 75 million km").

Six gauges, each a labelled bar with a number and a unit: Fuel (kg left), Power (W made vs W needed),
Signal strength (%), Signal delay (in words: "Earth hears you after 20 minutes"), Distance from Earth
(km, switching to million km), Science collected (points).

A mission clock reading "Day 142 of 240 · 1 sec = 5 days", and Pause / 1x / 4x speed buttons.

The animation loop lives in this component: requestAnimationFrame, dt capped at 0.1s, calling the
store's tick(days) — the engine itself stays pure. Pause stops the clock entirely.

At arrival: a 3-2-1 countdown, then the braking burn with an engine flame, then the engine settles it
into orbit (spacecraft circling the target) or a fly-past. A "See results →" button appears.
```

---

## P7 — challenges (50 min) ← you can demo from here

```
Add surprise challenges. Create src/data/events.json with these seven events exactly, then wire them in.

solarStorm | "Solar storm" | chance 0.1 | protectedBy "backup"
  explain: "The Sun has thrown out a burst of charged particles. They can damage the electronics on board."
  safe:  "Switch the instruments off until it passes"  → { sciencePenalty: 0.1 }
  risky: "Keep working"                                → { riskOfFailure: 0.25 }
dust | "Dust on the solar panels" | chance 0.15 | protectedBy "rtg" | onlyIf "dustRisk"
  explain: "A dust storm has coated the solar panels. They make less power now."
  shake:   "Shake the panels clean (burns 5 kg of fuel)" → { fuelCost: 5 }
  nothing: "Do nothing (power drops by 30%)"             → { powerPenalty: 0.3 }
courseDrift | "Course drift" | chance 0.12
  explain: "Tracking shows the spacecraft is slowly drifting off its planned path."
  correct: "Correction burn (burns 8 kg of fuel)"        → { fuelCost: 8 }
  ignore:  "Ignore it (3 in 10 chance of missing {target} on arrival)" → { riskAtInsertion: 0.3 }
lostSignal | "Lost signal" | chance 0.08 | protectedBy "antLarge"
  explain: "Earth has stopped hearing the spacecraft. The antenna may be pointing the wrong way."
  switch: "Switch to the large dish antenna"             → { none: true }
  wait:   "Wait for Earth to call again"                 → { sciencePenalty: 0.1, daysLost: 7 }
  guess:  "Point the antenna by guesswork (signal drops by 20% for the rest of the trip)" → { signalPenalty: 0.2 }
instrumentFault | "Instrument fault" | chance 0.08 | protectedBy "threeInstruments" | onlyIf "hasInstruments"
  explain: "One of the science instruments has stopped working."
  reboot: "Reboot it (1 kg of fuel to turn the spacecraft, science drops by 10%)" → { fuelCost: 1, sciencePenalty: 0.1 }
  accept: "Leave it off (science drops by 20%)"          → { sciencePenalty: 0.2 }
debris | "Debris warning" | chance 0.12 | protectedBy "large"
  explain: "Radar on Earth has spotted a piece of old space junk heading close to the spacecraft."
  move: "Move out of the way (burns 12 kg of fuel)"      → { fuelCost: 12 }
  wait: "Wait one day for better tracking (the warning is usually a false alarm)" → { daysLost: 1, riskOfFailure: 0.05 }
  hold: "Hold course"                                    → { riskOfFailure: 0.15 }
bonusTarget | "An asteroid is passing close" | chance 0.12 | kind "opportunity" | onlyIf "hasInstruments"
  explain: "A small asteroid will pass near the flight path. Turning to look at it is science nobody planned for."
  turn: "Turn and photograph it (burns 4 kg of fuel)"    → { scienceBonus: 0.15, fuelCost: 4, daysLost: 3 }
  stay: "Stay on plan"                                   → { none: true }

Engine side (pure, tested):
  - At createSimulation, draw 3 to 5 events (settings.eventsPerMission) weighted by chance, only ones
    whose onlyIf flag the design or scenario has, and schedule them at random days between 15% and 85%
    of the trip. Seeded, so the same seed gives the same mission.
  - step() stops the clock dead on the day an event is due and puts it in state.pendingEvent.
  - resolveEvent(state, optionId, auto?) applies the effect and lets time move again.
  - A design flag that protects against an event softens it: backup systems, an RTG instead of panels,
    the large dish, three instruments, a large bus. Say so in the log in plain English.
  - daysLost may never push the clock past the end of the mission — clamp it to whole days remaining.
  - Record every decision: day, event, option, outcome, and whether it hurt or gained.

UI side: when an event is waiting, pause the mission and show a card over the map with the event name,
its one-line explanation, and one real labelled <button> per option. Each option carries small coloured
chips saying exactly what it changes ("Fuel −8 kg", "Science −10%", "3 in 10 chance of missing Mars"),
generated from the effect object so the card can never promise something the engine does not do.
A 20-second countdown runs on the card; at zero mission control picks the safest option for the player
and says so. The card must be fully playable with Tab and Enter.
```

**Commit here and breathe. This is a complete, demoable game.** Everything below makes it better,
not longer.

---

## P8 — results, score and the Flight Director (40 min)

```
src/screens/Result.tsx plus src/sim/score.ts (pure, tested).

Score: science collected out of science possible, money left over, and three stars —
  ★ reached the target
  ★ full success (science >= 90% of the maximum)
  ★ came in under budget
Show the number, the stars, and one line on how each star was won or lost.

The Flight Director: a short explanation in a chat bubble, written by rules in plain English, that
tells the player WHY the mission went the way it did. Pick at most five sentences from: the biggest
thing that went right, the biggest thing that went wrong, a decision that cost them, a decision that
saved them, and one concrete thing to try next time ("A bigger dish would have brought back three
times the science from Mars"). Every sentence must be generated from the real numbers in the sim, not
canned text, and all the sentence templates live in src/data/directorLines.json, not in the .ts file.

Below it: every decision the player made with a ✅ or ⚠️ and its one-line outcome, and a comparison
with a real mission (Chandrayaan-2 for the Moon, Mangalyaan for Mars, Juno for Jupiter) — its cost,
its trip time and whether it worked, so the player can see how their mission compares to a real one.

"Play again" returns to the mission chooser.
```

---

## P9 — demo mode and fit the laptop (30 min)

The single highest-value half hour for judging. Judges open the link and have 30 seconds of patience.

```
1. Demo mode: opening the game with ?demo=1 shows one button on the home screen, "Start the demo
   mission (Mars) 🚀", that picks Mars, loads the ready-made design and launches straight into a
   flying mission. Script the challenges so five arrive in the first half-minute of cruise, spaced so
   no two land on top of each other, and include at least one opportunity as well as problems.
   Use Mars, not the Moon: a Moon trip is only 3 days, so a challenge that costs 3 days would throw
   the cards on top of each other.

2. Fit a 1366x650 laptop: no screen may need a vertical scrollbar except Results. Mission Control is
   a full-screen cockpit. The challenge card sits over the map and never leaves it. No text under 12px.

3. Responsive: under 800px wide every screen stacks into one column, so it works on a phone.

4. Accessibility pass: visible focus rings, aria-labels on every bar and gauge, a text label next to
   every colour signal, and the whole game playable from the keyboard.
```

---

## P10 — README with screenshots (30 min)

```
1. Write a README.md that opens with one sentence on what the game is, a screenshot, and then:
   how to run it (npm install, npm run dev), what is real physics and what is a game value, the
   folder map, and an MIT LICENSE file.
2. Take screenshots at 1366x768 of: home, Design Lab, launch calendar, Mission Control, a challenge
   card, orbit captured, and the results screen. Put them in docs/screenshots/ and show them in the
   README as a two-column table.
3. Add the disclosure line about prior work to the README and the project page.
```

---

## If you fall behind — cut in this order

1. **P10** — a README can be written after the deadline for the repo; the project page is what judges read.
2. **P8's real-mission comparison** — keep the score and the Flight Director, drop the comparison.
3. **P9 item 3 and 4** — responsive and accessibility. Painful to lose, but a judge on a laptop will not see it.
4. **P7's opportunity event** — ship the six problems, add `bonusTarget` only if there is time.
5. **Jupiter** — two missions demo as well as three, and Jupiter is the one with the awkward numbers.

**Never cut:** P2 (the physics tests are your scientific validity), P7 (the challenges are the game),
P9 item 1 (demo mode is how a judge sees it at all).

---

## The last 50 minutes — the submission pack

This is the part that was never finished last time, and it is worth more marks than another feature.

- [ ] **30-second video.** Screen recording, no face, no editing suite. Say out loud: what the problem
      is, what the game does, one sentence of real physics, and show a challenge being answered.
      Upload unlisted to YouTube and paste the link.
- [ ] **Project page text.** Five short paragraphs: what it does, how it works, the real physics
      (name the rocket equation, the inverse-square law, launch windows), who it is for (students 12+),
      and what you would do next.
- [ ] **The disclosure line** about your earlier repo. One sentence, near the top.
- [ ] **Links:** the live game (deploy with `npm run build` then drag `dist/` onto netlify.com/drop —
      it takes two minutes and judges can click it), the GitHub repo, the video.
- [ ] **Push everything.** Check the repo actually shows the commits from today.

---

## Quick reference while you work

```bash
npm run dev      # the game at http://localhost:5173
npm test         # the physics and simulation tests
npm run build    # type-check + production build — must pass before any commit
git add -A && git commit -m "P4: launch calendar" && git push
```

Open with `?demo=1` to jump straight into a flying mission.
