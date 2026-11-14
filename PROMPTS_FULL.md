# The complete prompt set — rebuild Mission Architect exactly

Sixteen steps, in order, each self-contained. Paste one into a fresh Claude Code session in an empty
folder and it works without knowing anything about the old project.

**Which file do I use?**
- `HACKATHON.md` — the 6–8 hour sprint cut. Stops at a complete, demoable game.
- **This file** — everything, the game as it actually exists. Steps 1–9 are the same ground the sprint
  covers; steps 10–16 are what makes it look and teach like the real thing. Expect 20–30 hours.

**Every corrective fix from the first build is already folded into these prompts.** The original took
far longer than it should have because of bugs found late — all of them are specified here as
requirements, so you get the right behaviour on the first pass. Those lines are marked **[fix]**.

**After every step:** `npm test`, `npm run build`, then commit. Never start a step on a red test.

---

## Setup

```bash
npm create vite@latest mission-architect -- --template react-ts
cd mission-architect
npm install && npm install zustand && npm install -D vitest jsdom playwright
git init && git add -A && git commit -m "Scaffold"
```

---

## Step 1 — the rules file

```
Create CLAUDE.md in the repo root with this content, then wire up vitest.

# Mission Architect — project context

A browser game for NASA Space Apps 2026, challenge "Space Mission Design Game". The player picks a
mission (Moon / Mars / Jupiter), designs a spacecraft under budget, mass, power and fuel limits,
launches it, watches a time-scaled simulation with surprise challenges, and gets a score plus a
"Flight Director" explanation. Players are students aged 12+. UI language: very simple English.

## Stack (do not change)
- React 19 + TypeScript + Vite. State in zustand (src/store/gameStore.ts). Tests in vitest.
- No new UI libraries. Plain CSS in src/styles.css. Animation with SVG + requestAnimationFrame.
- Physics is pure TypeScript in src/physics/ with NO React imports.

## Rules
1. Numbers come from src/data/*.json, never hard-coded in screens.
2. All authored English lives in src/data/*.json too — never a sentence template in a .ts file.
3. Physics stays real: rocket equation, inverse-square sunlight, real launch windows, Kepler's equation.
4. Every physics and simulation function gets a vitest test.
5. `npm run build` must pass (tsc --noEmit + vite build) before any task is done.
6. Plain English in the UI. Short sentences. A 12-year-old must understand every message.
7. Screens are dumb: they read the store and call store actions. Logic lives in src/physics/ or src/sim/.
8. Small steps. Finish one thing, check the game still plays end to end, then move on.
9. Dark space theme, CSS variables in styles.css.

## Status log (required)
After finishing any step, append under 15 lines to STATUS.md: what was built, what was skipped and
why, decisions made alone, test count, whether the build passed, and open questions.

Then: add vitest to vite.config.ts (globals true, environment "node"), add scripts "test": "vitest run"
and "build": "tsc --noEmit && vite build", and create src/data, src/physics/__tests__, src/sim/__tests__,
src/screens, src/components, src/store. Prove it with npm test and npm run build.
```

---

## Step 2 — the game numbers

```
Create src/data/parts.json exactly as below — these are balanced values, change nothing.

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

src/data/scenarios.json — three entries, these exact numbers, plus a one-line plain-English description each:
  moon:    name "Moon Orbiter", level "Easy (tutorial)", goal "Map the Moon from orbit", budget 250,
           deltaV 4.0, distanceAU 1.0, commsFactor 1.0, tripDays 3, windowMonths 0, windowOffset 0,
           missionMonths 6, dustRisk 0, target "Moon", targetProse "the Moon", color "#cfcfcf",
           centralBody "earth", targetOrbitRadiusAU 0.00257, targetOrbitDays 27.3, insertionDeltaV 0.8,
           realMissionIds ["chandrayaan2","lro"],
           preset { small, [camera, magnetometer], solarSmall, antSmall, chemical, medium, fuelKg 1400, launchMonth 3, route slow }
  mars:    name "Mars on a Budget", level "Medium", goal "Reach Mars orbit and send back photos",
           budget 150, deltaV 5.7, distanceAU 1.52, commsFactor 0.1, tripDays 240, windowMonths 26,
           windowOffset 10, missionMonths 12, dustRisk 0.15, target "Mars", targetProse "Mars",
           color "#e5744a", centralBody "sun", targetOrbitRadiusAU 1.52, targetOrbitDays 687,
           insertionDeltaV 1.0, realMissionIds ["mangalyaan","maven"],
           preset { small, [camera], solarSmall, antLarge, chemical, light, fuelKg 1800, launchMonth 10, route slow }
  jupiter: name "Jupiter Explorer", level "Hard", goal "Study Jupiter's clouds and magnetic field",
           budget 900, deltaV 7.0, distanceAU 5.2, commsFactor 0.05, tripDays 1900, windowMonths 13,
           windowOffset 4, missionMonths 12, dustRisk 0, target "Jupiter", targetProse "Jupiter",
           color "#d9a066", centralBody "sun", targetOrbitRadiusAU 5.2, targetOrbitDays 4333,
           insertionDeltaV 1.5, realMissionIds ["juno"],
           preset { small, [camera, magnetometer], solarLarge, antLarge, chemical, medium, fuelKg 3500, launchMonth 4, route slow }

[fix] Every scenario needs BOTH `target` ("the Moon" is wrong in a sentence) and `targetProse`
("at the Moon" reads right). Screens must use targetProse in sentences.

src/data/settings.json:
{ "cruiseSeconds": 75, "fuelMargin": 1.15, "decisionSeconds": 20, "burnHoldMs": 1200,
  "insertionCountdownMs": 1500, "effectMs": 2000, "shakeMs": 300, "clockJumpMs": 1500, "beatMs": 2000,
  "eventsPerMission": { "min": 3, "max": 5 }, "eventWindow": { "from": 0.15, "to": 0.85 } }

src/data/realMissions.json — five real missions with id, name, agency, year, power, rocket and a
one-sentence fact: Chandrayaan-2 Orbiter (ISRO 2019, solar, medium), Lunar Reconnaissance Orbiter
(NASA 2009, solar, medium), Mangalyaan/MOM (ISRO 2013, solar, light — launched Nov 2013 on a PSLV,
reached Mars orbit Sept 2014 on a famously small budget), MAVEN (NASA 2013, solar, medium — reached
Mars orbit 21 Sept 2014, three days before Mangalyaan), Juno (NASA 2011, solar, heavy — launched Aug
2011, reached Jupiter July 2016, three giant panels because sunlight at Jupiter is so weak).

Write a test that loads all four files, checks every id is unique, and checks every scenario preset
and realMissionId points at something that exists.
```

---

## Step 3 — the physics

```
Write src/physics/ as pure TypeScript, no React imports, with a vitest file per module. Exact formulas:

rocketEquation.ts (G0 = 9.80665)
  deltaV(isp, fullMassKg, emptyMassKg) = isp*G0*ln(full/empty)/1000  → km/s, 0 if full <= empty
  fuelNeeded(isp, emptyMassKg, dvKmS)  = emptyMassKg*(exp(dv*1000/(isp*G0)) - 1)
  fuelBurned(isp, fullMassKg, dvKmS)   = fullMassKg*(1 - exp(-dv*1000/(isp*G0)))
  Test: Isp 320, 1000 kg wet, 500 kg dry → about 2.18 km/s.

power.ts
  solarPowerAt(powerAt1AU, distanceAU) = powerAt1AU / distanceAU²   (inverse square — real physics)
  powerMade(source, distanceAU) = type === "rtg" ? powerAt1AU : solarPowerAt(...)
  Test: the same panels give about 600 W at 1 AU and about 22 W at 5.2 AU; an RTG does not change.

comms.ts
  LIGHT_MINUTES_PER_AU = 8.317   (real)
  dataReturnedFraction(antennaRate, commsFactor, dataNeed) = min(1, antennaRate*commsFactor/dataNeed)
  signalDelayAt(distanceAU) = distanceAU * LIGHT_MINUTES_PER_AU
  formatSignalDelay(minutes) → "18 seconds" / "20 minutes" / "1 hour 4 minutes"
  Test: the small antenna returns 100% of the science at the Moon, about 10% at Mars.

windows.ts
  A window repeats every scenario.windowMonths months from windowOffset and lasts one month.
  windowMonths 0 = always open (the Moon).
  checkWindow(scenario, launchMonth) → { ok, nextOkMonth, message in plain English }
  ROUTE = { slow: {days: 1, dv: 1}, fast: {days: 0.75, dv: 1.2} }
  Test: Mars open at month 10, shut at 11; the Moon open every month.

checks.ts — the four launch checks:
  runChecks(design, scenario, launchMonth, route) → { budget, mass, power, dv } bars of
  { value, limit, ok, label }, plus comms { fraction, ok }, slots, tripDays, dryMassKg, dvNeededKmS,
  dvAvailableKmS, science, allOk, problems[] in plain English.
    budget = part costs + fuelKg*fuelPricePerKg      limit scenario.budget
    mass   = dryMass + fuelKg                        limit rocket.capacity
    power  = instruments + antenna + engine.powerNeed limit powerMade at scenario.distanceAU
    dv     = deltaV(isp, dry+fuel, dry)              limit scenario.deltaV * route.dv
  Export getBody/getInstrument/getPower/getAntenna/getEngine/getRocket/findScenario.

  designFlags(design, scenario) → string[] used later by challenges. It must include:
    "backup" (large bus), "rtg" (RTG power), "solar" (solar power), "antLarge" (large dish),
    "threeInstruments" (3 instruments), "large" (large bus), "hasInstruments",
    "dustRisk" (scenario.dustRisk > 0), the scenario id itself ("moon"/"mars"/"jupiter"),
    [fix] and "outerPlanet" when scenario.distanceAU > 2.0 — NOT 1.5, or Mars counts as an outer
    planet and gets Jupiter's events.

  Test: each preset passes all four checks; a fuel-less design fails dv only; the flags are right
  for each scenario.
```

---

## Step 4 — store and the first three screens

```
src/store/gameStore.ts (zustand): screen, scenarioId, design, launchMonth, route, sim, muted,
and actions go, pickScenario, setPart, toggleInstrument, setFuel, loadPreset, startMission, tick,
decide, toggleMute, reset. Design = { bodyId, instrumentIds[], powerId, antennaId, engineId,
rocketId, fuelKg }.

Home.tsx — title, one sentence on the game, a three-step "How to play" strip, and two buttons:
"Try the tutorial (Moon)" and "Start a mission".

ChooseMission.tsx — a card per scenario: name, level, goal, budget, description, "Design this mission".

DesignLab.tsx — six part groups as an accordion, one open at a time:
  1. Spacecraft body  2. Science instruments (multi-select, limited by body slots)
  3. Power  4. Antenna  5. Engine and fuel (slider)  6. Rocket
  Four live bars from runChecks (Budget, Mass, Power, Fuel Δv), green or red, each with its number
  and limit. Plain-English problems underneath. A "Load a design that works" button that fills in the
  preset. "Go to launch calendar" disabled until all four checks pass.

Keyboard: focus rings everywhere, arrow keys within a part group, aria-labels on the bars.
Dark space theme in src/styles.css with CSS variables.
```

---

## Step 5 — launch calendar

```
Launch.tsx — a 12-month grid for the launch year.
  - Months in the window are a green band; the rest are dimmed with the reason ("Mars is only in the
    right place every 26 months. The next window is month 10.").
  - Fast / Slow route choice showing the trade in both directions.
  - A one-line summary of the spacecraft with the live fuel figure.
  - "Launch! 🚀", disabled unless the window is open and every check still passes.
  - A "Learn more" fold: two sentences on what a launch window is and why it exists.
```

---

## Step 6 — the flight engine

```
src/sim/simulation.ts, pure, with tests in src/sim/__tests__/.

createSimulation(design, scenario, launchMonth, route, check, seed?, schedule?) → SimState
step(state, days) → SimState (never mutates; returns the same object when nothing can happen)
resolveEvent(state, optionId, auto?) → SimState
timeScale(totalDays) → { daysPerSecond, label }

SimState: config, missionDay, totalDays, phase ("cruise"|"insertion"|"orbit"|"failed"),
spacecraft {radiusAU, angleRad}, earthAngleRad, targetAngleRad, distanceFromEarthAU,
distanceFromSunAU, powerW, signalStrength, signalDelayMinutes, fuelKg, scienceCollected,
insertionRisk, riskTaken, log[], decisions[], upcoming[], pendingEvent.

The path is a real Hohmann half-ellipse solved with Kepler's equation:
  a = (r1+r2)/2, e = |r2-r1|/(r1+r2)
  M = (outward ? 0 : π) + π*fraction, solve M = E - e·sin E by bisection (60 iterations)
  radius = a(1 - e·cos E); true anomaly from the half-angle formula
Earth and the target ride circular orbits (EARTH_ORBIT_DAYS = 365.25, target from targetOrbitDays),
with the target placed so it is exactly where the transfer ends on arrival day.
planetAngle(planet, missionDay, launchMonth, orbit, totalDays) must be a pure exported function —
later steps need it for the map.

Every step recomputes power (inverse square at the live distance), signal strength and one-way delay
(8.317 light-minutes per AU), fuel burned, and science scaled by the fraction of data reaching Earth.

Time scale: every cruise takes 60–90 real seconds whatever the distance, so
daysPerSecond = totalDays / settings.cruiseSeconds. Label it: Moon "1 sec = 90 minutes",
Mars "1 sec = 5 days", Jupiter about "1 sec = 1 month".

Arrival: at totalDays the phase becomes "insertion"; the next step runs the braking burn. Not enough
fuel for scenario.insertionDeltaV, or a risk roll that fails → "failed" (flies past). Otherwise "orbit".

[fix] The phase may only become "insertion" when every scheduled event has fired AND nothing is
waiting for a decision:  phase = f1 >= 1 && upcoming.length === 0 && !pendingEvent ? "insertion" : "cruise"
Without this the braking burn starts with a challenge card still open.

Seeded randomness only — mulberry32, nextRandom(state) → { value, state }. Never Math.random in the
engine, or a mission cannot be replayed.

Tests: the transfer ends at the target radius; Moon 3 days, Jupiter 1900; power at Jupiter is a
fraction of power at Earth; a fuel-starved design flies past; step() with a pending event does not
move the clock; the same seed gives the same mission twice.
```

---

## Step 7 — Mission Control

```
MissionControl.tsx — the cockpit, one screen at 1366x650, no scrolling.
Map on the left, six gauges on the right, a three-line mission log below.

The map is an SVG with viewBox "0 0 640 400":
  - Sun-centred: the Sun in the middle, dashed orbit circles for Earth and the target, both as
    labelled dots moving along them. Moon missions: Earth in the middle, the Moon on its orbit.
  - The spacecraft as a triangle pointing along its heading, with the flown path as a solid trail.
  - A scale bar worked out from the map's own AU-to-pixel factor ("0.5 AU · 75 million km"), so it
    stays honest at any zoom.
  - Export mapGeometry(sim, path, viewW, viewH) as a pure function returning where everything is —
    later steps draw effects on top of it.

Six gauges, each a labelled bar with a number AND its unit: Fuel (kg left), Power (W made vs needed),
Signal strength (%), Signal delay ("Earth hears you after 20 minutes"), Distance from Earth (km then
million km), Science collected (points).

Clock: "Day 142 of 240 · 1 sec = 5 days". Speed buttons Pause / 1x / 4x.

The animation loop lives in this component: requestAnimationFrame, dt capped at 0.1 s after a tab
switch, calling the store's tick(days). The engine stays pure.

Arrival: a 3-2-1 countdown, the braking burn with an engine flame, then orbit (the spacecraft
circling the target) or a fly-past. Then a "See results →" button.
```

---

## Step 8 — challenges

```
Create src/data/events.json with all 18 events below, then wire them into the engine and the UI.
Fields per event: id, name, chance, explain, kind ("problem" | "opportunity", default problem),
phase ("early" | "mid" | "late" | "any"), onlyIf (design/scenario flag), protectedBy (flag),
protectedText, failText, follows ({eventId, optionId}), options[{ id, label, safe, effect }].

Effect keys the engine understands — and nothing else:
  fuelCost, fuelSaved, sciencePenalty, scienceBonus, powerPenalty, signalPenalty, daysLost,
  riskOfFailure, riskAtInsertion, clearInsertionRisk, none

THE EVENTS (chance | flags → options with effects):
solarStorm "Solar storm" 0.1, protectedBy backup — "The Sun has thrown out a burst of charged
  particles. They can damage the electronics on board."
  safe "Switch the instruments off until it passes" {sciencePenalty .1} | risky "Keep working" {riskOfFailure .25}
dust "Dust on the solar panels" 0.15, protectedBy rtg, onlyIf dustRisk
  shake "Shake the panels clean (burns 5 kg of fuel)" {fuelCost 5} | nothing "Do nothing (power drops by 30%)" {powerPenalty .3}
courseDrift "Course drift" 0.12
  correct "Correction burn (burns 8 kg of fuel)" {fuelCost 8} | ignore "Ignore it (3 in 10 chance of missing {target} on arrival)" {riskAtInsertion .3}
lostSignal "Lost signal" 0.08, protectedBy antLarge
  switch "Switch to the large dish antenna" {none} | wait "Wait for Earth to call again" {sciencePenalty .1, daysLost 7} | guess "Point the antenna by guesswork (signal drops by 20% for the rest of the trip)" {signalPenalty .2}
instrumentFault "Instrument fault" 0.08, protectedBy threeInstruments, onlyIf hasInstruments
  reboot "Reboot it (1 kg of fuel to turn the spacecraft, science drops by 10%)" {fuelCost 1, sciencePenalty .1} | accept "Leave it off (science drops by 20%)" {sciencePenalty .2}
debris "Debris warning" 0.12, protectedBy large
  move "Move out of the way (burns 12 kg of fuel)" {fuelCost 12} | wait "Wait one day for better tracking (the warning is usually a false alarm)" {daysLost 1, riskOfFailure .05} | hold "Hold course" {riskOfFailure .15}
micrometeoroid "Micrometeoroid strike" 0.08, phase mid, protectedBy threeInstruments
  turn(safe) "Turn the instruments away from the dust stream" {sciencePenalty .08, daysLost 5} | keep "Keep collecting data" {sciencePenalty .05, riskOfFailure .1}
sunPush "Sunlight is pushing the spacecraft" 0.1, phase mid, onlyIf solar
  tilt(safe) "Tilt the panels to balance the push (power drops 10%)" {powerPenalty .1} | thrusters(safe) "Correct with the thrusters (burns 6 kg of fuel)" {fuelCost 6} | drift "Let it drift" {riskAtInsertion .2}
planetaryProtection "Planetary protection rule" 0.07, phase late, onlyIf mars
  raise(safe) "Raise the flyby path (burns 10 kg of fuel)" {fuelCost 10} | pointAway(safe) "Point the instruments away and keep the path" {sciencePenalty .15} | ignore "Ignore the rule" {riskAtInsertion .25}
gravityAssist "Free push from a planet" 0.2, opportunity, phase early, onlyIf outerPlanet
  take "Take the flyby" {fuelSaved 60, daysLost 30, riskAtInsertion .1} | direct(safe) "Stay on the direct path" {none}
safeMode "The spacecraft switched itself off" 0.1, protectedBy backup
  checkout(safe) "Run the full check-out before waking it" {sciencePenalty .05, daysLost 10} | restart "Restart it immediately" {riskOfFailure .12}
groundStationBusy "No dish free on Earth" 0.09, protectedBy antLarge
  wait(safe) "Wait your turn for a dish" {daysLost 6} | slow(safe) "Send the data slowly on the small dish" {sciencePenalty .12} | store "Store everything on board and send it later" {riskOfFailure .08}
softwareBug "A bug in the flight software" 0.09, phase mid
  upload(safe) "Upload the fix and test it carefully" {daysLost 8} | live "Patch it live" {riskOfFailure .1} | around(safe) "Work around it" {sciencePenalty .1}
radiationBelt "Jupiter's radiation" 0.14, phase late, onlyIf jupiter, protectedBy large
  shorten(safe) "Shorten the time in the belts (burns 15 kg of fuel)" {fuelCost 15} | shield(safe) "Shield the computer by shutting instruments down" {sciencePenalty .18} | through "Fly straight through" {riskOfFailure .2}
bonusTarget "An asteroid is passing close" 0.12, opportunity, onlyIf hasInstruments
  turn "Turn and photograph it (burns 4 kg of fuel)" {scienceBonus .15, fuelCost 4, daysLost 3} | stay(safe) "Stay on plan" {none}
--- three follow-ups, chance 0, never drawn at the start, only caused by the choice named ---
debrisDamage "Damage found" follows debris/hold — "A panel is making less power than it should. A
  piece of debris hit it after all."
  less(safe) "Work with less power" {powerPenalty .15} | spin(safe) "Spin the spacecraft to face the Sun better (burns 5 kg of fuel)" {fuelCost 5}
assistCheck "Aim check after the flyby" follows gravityAssist/take
  burn(safe) "Clean-up burn (burns 7 kg of fuel)" {clearInsertionRisk true, fuelCost 7} | closeEnough "The aim looks close enough" {none}
extraData "The new instrument is working well" opportunity, follows bonusTarget/turn
  send "Send it all home" {scienceBonus .1, daysLost 4} | keep(safe) "Keep to the schedule" {none}

Give every event whatIsIt (one or two plain sentences), realExample (one real mission with a year)
and howCommon (a short phrase). Real examples to use: Opportunity's 2018 dust storm, Mars Odyssey
2003 for the solar storm, New Horizons 2015 for the safe mode, the 2021 Mars solar conjunction,
Hubble 2021 for the software bug, Juno's Earth flyby Oct 2013 → Jupiter July 2016 for the assist.

ENGINE:
  - At createSimulation draw 3–5 events (settings.eventsPerMission), weighted by chance, only those
    whose onlyIf flag the design or scenario has, respecting phase, scheduled at seeded random days
    between 15% and 85% of the trip. Follow-ups are never drawn — they are queued by a choice.
  - step() stops the clock on the day an event is due and sets state.pendingEvent.
  - resolveEvent applies the effect, queues any follow-up, and lets time move again.
  - A protecting flag softens the event and says so in the log in plain English.
  - riskOfFailure rolls at once; riskAtInsertion adds to insertionRisk and rolls at arrival;
    clearInsertionRisk wipes it. Track riskTaken and expose riskLabel() → Low / Medium / High / Very high.

  [fix] daysLost must be whole days and may never pass the end of the mission. Compute it as
    Math.max(0, Math.min(Math.floor(daysLost), Math.floor(totalDays - missionDay)))
    Without the floors, float error turns "+10 days" into "Lost 9 days" at day 121.44.
  [fix] The card must offer exactly what the engine will charge — clamp the days in buildEvent too,
    and never put a day count in an option label. Add a test forbidding /\d+ days/ in any label.
  [fix] A follow-up records causedOnDay from the day the choice was made, read BEFORE the daysLost
    jump is applied, or the card says the wrong day.
  [fix] Science may exceed the plan when an opportunity pays off. Do not cap it. Report it as a gain:
    "22 points · 4 more than planned", never "22 of 18". Check stars and score handle over 100%.

UI: when an event waits, pause and show a card over the map: name, the one-line explanation, and one
real labelled <button> per option. Each option carries small coloured chips generated FROM THE EFFECT
OBJECT saying exactly what it changes ("Fuel −8 kg", "Science −10%", "3 in 10 chance of missing Mars").
[fix] Generate the chips from the effect only — never store a parallel "affects" array in the JSON,
it goes stale. A 20-second countdown; at zero mission control takes the safest option and says so.
Opportunities get a green "★ Opportunity" tag instead of the amber "⚠ Challenge".
The card must be fully playable with Tab and Enter.
```

---

## Step 9 — results, score and the Flight Director

```
src/sim/score.ts (pure, tested) and Result.tsx.

Score: science collected out of science possible, money left, and three stars —
  ★ reached the target  ★ full success (science ≥ 90% of maximum)  ★ under budget

The Flight Director: at most five sentences in a chat bubble, in plain English, chosen from the real
numbers — the biggest thing that went right, the biggest that went wrong, a decision that cost them,
a decision that saved them, and one concrete suggestion ("A bigger dish would have brought back three
times the science from Mars").

[fix] EVERY sentence template lives in src/data/directorLines.json. Not one template string in a .ts
file. flightDirector.ts only picks a line and fills the blanks.
[fix] Two power lines need DIFFERENT numbers and it is easy to share one binding by mistake:
  "powerLow" uses the power actually made at the target when flown;
  "overSizedPanels" judges the panels bought, so it always uses the panels' own output.
  Give them separate placeholders and a test each.
[fix] The "you lost science" tip must only appear when science really is below the maximum.
[fix] When one choice is both the chance taken and the cause of a follow-up, say it once — do not
  print the same decision in the chain line and the praise line.
[fix] Fix the article when a sentence starts from an event name: "The the new instrument…" is wrong.

Below the bubble: every decision with ✅ or ⚠️ and its one-line outcome, and a comparison with the
real mission from realMissions.json — cost, trip time, whether it worked.

Optional: a tiny Node server in /server that rewrites the explanation with Claude or OpenAI when an
API key is in the environment. The game must work identically with the server off, slow (>6 s) or
erroring — fall back to the rule-based text silently. Never commit a key; read it from process.env.
```

---

## Step 10 — cause and effect

```
Every challenge must be visible three times: when it arrives, the moment it is decided, and for the
rest of the trip. Put it all in src/components/MapEffects.tsx, pure SVG from the sim state plus the
map geometry, with CSS doing the motion. Every effect carries a data-effect attribute for tests.

A) ARRIVES (while the card is open): storm particles flying from the Sun to the spacecraft; a dust
   haze around it; the sprite sliding a few pixels off its line for course drift; a broken signal
   line to Earth; a "!" badge for an instrument fault.
B) DECIDED (about two seconds): sparks, a shield, puffs, an engine flame for a correction burn,
   delta labels floating off the gauges ("−8 kg"), and the clock counting forward like a delay board
   when days are lost.
C) LASTS: a mark on each gauge the mission has lost, a dimmed signal line, and a marker on the trail
   where each challenge happened.

[fix] Draw ONE marker per DAY, not per decision. Two decisions on the same day sit at the same point
  on the trail and painted the same label twice, which reads as doubled digits. Group by rounded day,
  put every icon from that day on one marker, give it a dark pill and the text "🛰️🔭 Day 13".
[fix] Those icons are EVENT icons. Never let a gauge borrow one — see step 13.

Reduced motion: every animation off under prefers-reduced-motion, the information still on screen.
```

---

## Step 11 — fit a laptop, and real-world context

```
1. At 1366x650 no screen may need a vertical scrollbar except Results. Mission Control becomes a
   cockpit: map left, six compact gauges right, a three-line log strip below, the challenge card over
   the map and never leaving it. The Design Lab is an accordion. The calendar sits beside the route.
   Under 800px wide everything stacks into one column.

2. Every challenge card teaches: what the thing is, a real story with a year, how common it is, and
   the coloured chips. An ℹ button on every challenge line in the log reopens the story. The results
   screen repeats the chips and the story.

3. Write scripts/measure.mjs with Playwright: start Vite, play a demo mission headless at 1366x650,
   and record for every screen the scrollHeight, whether anything is clipped inside the cockpit, the
   smallest font size ON SCREEN, the challenge card height and whether it stays inside the map, plus
   the frame rate and SVG element count at 4x. Exit non-zero on a scroll, a clipped card, text under
   12px, under 55 fps or over 600 SVG elements.
   [fix] Text inside the map is in SVG units and scales with the picture — multiply the font size by
   the SVG's own scale factor or it reports 6px text that is really 13px.
```

---

## Step 12 — a UI that teaches

```
1. Every part card says what choosing it would DO to this mission, computed live from the physics:
   the same panels read "Makes about 600 W at the Moon" and "Makes about 22 W at Jupiter"; the small
   antenna goes from "100% of your science reaches Earth" to "10%".
   [fix] Use scenario.targetProse, so it reads "at the Moon", not "at Moon".
   [fix] On the Moon both antennas return 100% and the lines are identical — detect that and append a
   comparison computed from the hardest scenario ("…but only 10% at Jupiter"). Compute it, never
   hard-code it, and test the Moon case.

2. A "Where the numbers come from" footnote on the Design Lab, Launch and Results screens opening a
   list that marks every number as a real formula, a real measurement or a game value. Keep the text
   in src/data/provenance.json.

3. Three chips on each mission card saying how hard it is — sunlight at the target, signal delay,
   launch window — coloured by value and computed from the scenario.

4. A one-line summary of the spacecraft the player built, on Launch and Mission Control, with the
   live fuel figure.

5. A four-step strip, Launch → Cruise → Arrival burn → In orbit, showing where the mission is.

6. A "?" button opening a glossary in simple English (Δv, Isp, launch window, AU, RTG, transfer orbit,
   parking orbit…), text in src/data/glossary.json.
```

---

## Step 13 — make it look like space

```
1. A seeded starfield behind the mission: src/sim/sky.ts builds it from src/data/sky.json
   { seed 20260924, stars { count 260, minSize .4, maxSize 1.6, minOpacity .25, maxOpacity .9,
     shareInBand .45, tintChance .12 }, milkyWay { angleDeg -28, widthShare .34, opacity .2,
     color "#9fb0e8", edgeColor "#7e8fd0", peakAlpha .55 }, galaxies { count 2, minRadius 4,
     maxRadius 8, opacity .22 }, nebulae { count 1, minRadius 26, maxRadius 42, opacity .14 },
     edge { keepOutRadiusShare .38, marginShare .05, cornerShare .16 }, twinkle { on false, stars 20 },
     starColor "#eef2ff" }
   Same seed → same sky, every run. Memoise it; it must not rebuild every frame.
   [fix] Do NOT blend the Milky Way band with mix-blend-mode: screen and near-white stops — it washes
   the whole map out. Use the alpha values above.
   [fix] Place galaxies and nebulae ONE PER CORNER deterministically. Rejection sampling clusters them
   in one corner and then fails.

2. The mission always wins: every mission object keeps its own class and nothing decorative borrows
   one. Write a test that reads the real src/styles.css from disk with node:fs (Vite's ?raw returns
   empty under vitest) and computes WCAG contrast for the text over the sky. If contrast fails, raise
   the panel scrim — never dim the mission.

3. A space view: one button fills the screen with the map and floats the HUD over it.
   - Browser fullscreen is requested but never depended on; a refusal must not strip the mode, and
     Escape or leaving fullscreen by any means leaves space view.
   - The map box takes the shape of the window so the sky reaches every edge and nothing letterboxes;
     the orbit scale is a share of the shorter side.
   - HUD panels: mission log top right, a small strip top left (max 360px, max 2 rows), gauges in a
     bottom panel. Nothing spans the full width. About 0.55 opacity with a backdrop blur.
   - A panel the spacecraft is passing under steps aside.
   [fix] Give each gauge a label, a unit and ONE CONSTANT ICON defined next to it (⛽ Fuel, 🔋 Power,
   📶 Signal, ⏱️ Delay, 📏 Distance, 🔬 Science). Never pass event marks or instrument chips into the
   HUD, and never call the event-icon helper there. Add a test pinning icon to gauge.
   [fix] Hide the trail markers in space view so nothing rides bare over an orbit.

4. More truth on the map:
   - Draw only a short fading lead ahead of the spacecraft (the next ~10% of the trip), not the whole
     planned ellipse — a full rail promises an arrival the engine may not deliver. Put the full plan
     behind a "Show flight plan" toggle, OFF by default, labelled "Planned path — this is where the
     plan says you will be." The lead needs fill: none or it paints as a black blob.
   - [fix] The solar system must not stop when the mission does. Keep a clock running after arrival at
     the same scale shown on screen: the planets carry on round the Sun, the spacecraft rides a drawn
     parking orbit around the planet it reached, and the trail continues along that planet's orbit
     instead of stopping where the planet used to be. Skip it all under reduced motion. Put
     "In orbit for N days" by the scale bar — NOT in the top strip, where it squeezes the status line.
     Add a glossary entry admitting the parking orbit is drawn much wider and slower than a real one.
```

---

## Step 14 — the challenge happens to YOUR spacecraft

```
1. src/sim/shipLayout.ts (pure) turns a Design into shapes, sized from real numbers in parts.json:
   bus side = cbrt(mass) * scale; solar panel length = sqrt(powerAt1AU) * scale (area makes the
   power); dish width = 2*sqrt(dataRate) * scale (a dish gathers by area); one sensor box per
   instrument sized by its mass; a chemical nozzle or a longer ion grid. An RTG design has NO panels.
   All the scale factors go in src/data/ship.json, none in the component.
   src/components/Spacecraft.tsx draws it twice: <ShipSprite> replaces the white triangle on the map,
   <ShipSchematic> is a bigger portrait, nose up, for the challenge card. Every part carries
   data-part="body|power|antenna|instruments|engine".
   Keep the sprite under 28px at 1366x650 and the whole thing under 40 SVG elements. Use ONE scale for
   every design so a bigger spacecraft is a bigger dot, with a cap for the largest.
   Test: a large bus beats a small one, large panels beat small, an RTG has no panels, three
   instruments make three boxes.

2. Add "affectsPart" to every event in events.json — "body", "power", "antenna", "instruments",
   "engine", or null for whole-mission events (debris, planetaryProtection, gravityAssist). A data
   test must require it on every event and require a part the schematic can draw.
   Rebuild the challenge card in two columns: the schematic left with the affected part marked and
   visibly damaged, the words and the option buttons right. One look per event — dust dulls the
   panels, a strike punches one hole, a fault goes dark, lost signal turns the dish away.
   Hovering or focusing an option rings the part THAT option would change (power→powerPenalty,
   antenna→signalPenalty, instruments→science, engine→fuel, otherwise the event's own part).
   [fix] Keep the ringed part SEPARATE from the broken part. If focus simply moves the highlight, the
   card opens pointing at the first option's part instead of at what is actually going wrong.
   [fix] One rock makes one hole: a dent lands on a single piece, while dust covers the lot.
   Accessibility: the schematic is aria-hidden with nothing focusable inside, every option stays a
   real labelled button, and a test plays a challenge with the keyboard alone.

3. A two-second SVG beat over the map BEFORE the card opens, one per event id (dust rolling, a rock
   tumbling past, the dish swinging, the Sun flaring, a blink, light on the panels, a sparkle for an
   opportunity, a plain alert otherwise). It never blocks input: a click or Escape skips to the card,
   reduced motion skips it, and a "Skip animations" toggle turns it off. It costs no mission time —
   the engine already stopped the clock.
   [fix] The card takes focus when it OPENS, which is now after the beat, not when the event arrives.
   Get this wrong and keyboard play breaks silently.
   [fix] Escape while a beat is playing skips the beat; it must not also leave space view.
   [fix] In SVG, give anything that rotates or scales `transform-box: fill-box; transform-origin:
   center` or it turns about the middle of the map and flies off screen.
```

---

## Step 15 — demo mode, balance and polish

```
1. ?demo=1 puts one button on the home screen — "Start the demo mission (Mars) 🚀" — that picks Mars,
   loads the preset and launches straight into a flying mission. Script five cards in the first half
   minute: a debris warning, an opportunity, the follow-up that opportunity causes, sunlight pushing,
   and the spacecraft switching itself off.
   [fix] Mars, not the Moon. A Moon trip is 3 days, so a card costing 3 days throws the rest on top of
   each other. Add a test that no two demo cards land within 5% of the trip of each other AFTER the
   days lost are applied.

2. scripts/balance-sweep.ts (vite-node): fly a set of designs 200 times each with different seeds and
   print success rate, average score and the commonest failure reason into BALANCE_NOTES.md. Target:
   the tutorial Moon design wins ~100%, a tight Mars design ~70%, Jupiter is hard but fair.
   [fix] Read the failure reason from the failure, not from the last log line — milestones like
   "Mid-course correction" are not failures.

3. Sound with the Web Audio API, no files: a launch whoosh, an alert beep, a rumble for the storm.
   Off by default, with a mute button.

4. Accessibility pass: focus rings, aria-labels on every bar and gauge, a text mark beside every
   colour signal, the whole game playable from the keyboard, reduced motion respected everywhere.
```

---

## Step 16 — ship it

```
1. README.md: one sentence on what it is, a screenshot, how to run it, what is real physics and what
   is a game value, the folder map, and an MIT LICENSE file at the repo root.
2. Screenshots at 1366x768 into docs/screenshots/ — home, Design Lab, launch calendar, Mission
   Control, a challenge card, space view, orbit captured, results, and a phone — shown in the README
   as a two-column table.
3. .gitignore: node_modules, dist, .env (keeping .env.example), coverage, playwright-report, *.tgz,
   editor and OS files. [fix] Anchor the screenshots rule as /screenshots/ — a bare "screenshots"
   also matches docs/screenshots and silently drops your README images.
4. Build and deploy: npm run build, then drag dist/ onto netlify.com/drop. Two minutes, and judges
   get a link they can click.
```

---

## The submission pack — do not skip

- [ ] **30-second video.** Screen recording. Say the problem, what the game does, one sentence of real
      physics, and show a challenge being answered. Unlisted YouTube link.
- [ ] **Project page:** what it does, how it works, the real physics by name (rocket equation,
      inverse-square law, launch windows, Kepler's equation), who it is for, what is next.
- [ ] **Disclosure line** about any prior work, near the top.
- [ ] **Links:** live game, repo, video.

---

## Quick reference

```bash
npm run dev       # http://localhost:5173  (add ?demo=1 to jump into a flying mission)
npm test          # physics + simulation tests
npm run build     # tsc --noEmit + vite build — must pass before every commit
npm run measure   # Playwright layout and frame-rate check
npm run balance   # the balance sweep
```
