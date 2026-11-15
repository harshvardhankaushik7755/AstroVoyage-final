# AstroVoyage

A browser game for the **NASA Space Apps Challenge 2026**, challenge *"Space Mission Design Game"*.

You pick a mission, build a spacecraft under a budget, pass five launch checks, fly it, and answer
whatever goes wrong on the way. The physics is real. The costs and the luck are tuned to be fair.

![Mission Control: the flight map, the gauges and the mission log](docs/screenshots/05-mission-control.png)

Built for students aged 12 and up. Every message on screen is written in short, plain English.

## Play it

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install     # one time, about a minute
npm run dev     # opens at http://localhost:5173
```

**For judges and testers:** open <http://localhost:5173/?demo=1> and press
**"Start the demo mission (Mars)"**. That one button picks Mars, loads a tested design and launches,
so you are watching a flying mission straight away. Four challenges arrive in the first minute —
including a green *opportunity* and the follow-up that choosing it causes later.

## The screens

| | |
|---|---|
| ![Home](docs/screenshots/01-home.png)<br>**Home** — and the solar system really is turning | ![Choose a mission](docs/screenshots/02-choose.png)<br>**Choose** — and pick what you are going there to do |
| ![Design Lab](docs/screenshots/03b-design-lab-ready.png)<br>**Design Lab** — six part groups, four live bars | ![Launch calendar](docs/screenshots/04-launch.png)<br>**Launch** — the green months are real launch windows |
| ![The spacecraft in 3D](docs/screenshots/03c-ship-3d.png)<br>**In 3D** — and the renderer is ours | ![The mission in 3D](docs/screenshots/05b-flight-3d.png)<br>**3D** — orbit, track or follow |
| ![Results](docs/screenshots/08-results.png)<br>**Results** — score, stars and the Flight Director | ![Where the numbers come from](docs/screenshots/09-nasa-sources.png)<br>**Every number, sourced** — to NASA, or marked as ours |

It works on a phone, where every screen stacks into one column:

| | |
|---|---|
| ![Mission Control on a phone](docs/screenshots/10-mobile.png) | ![A challenge on a phone](docs/screenshots/11-mobile-challenge.png) |

## The physics is real

Nothing in the flight is faked. Open **"Where the numbers come from"** on the Design Lab, Launch or
Results screen and every number is marked as a **real formula**, a **real NASA measurement**, or a
**game value we chose** — with a link to the NASA page for the first two.

- **Fuel and speed** — the Tsiolkovsky rocket equation, Δv = Isp × g₀ × ln(m₀ / mf), with
  g₀ = 9.80665 m/s². The rocket provides part of the mission Δv and the spacecraft's own engine
  finds the rest, which is how missions are really flown.
- **Power** — the inverse-square law. Mars gets about 43% of Earth's sunlight and Jupiter about
  3.7%, so the same solar panels read *600 W at the Moon* and *22 W at Jupiter*. That is why the
  nuclear battery is worth its price.
- **Signal** — light crosses one AU in 8.317 minutes, so Mars is about 12.6 minutes away each way
  and Jupiter about 43. A Moon mission is 1.3 seconds.
- **The flight path** — a Hohmann transfer, half an ellipse, with the spacecraft's position along it
  found by solving **Kepler's equation**. It really does move fast near the body it left and slowly
  at the far end. The target is placed at the true **lead angle**: it sits where it needs to be *now*
  to arrive at the meeting point at the same moment the spacecraft does.
- **Launch windows** — Mars lines up with Earth about every 26 months, Jupiter about every 13, the
  Moon needs no window at all. On the two-year calendar Mars gets one green month and Jupiter two.

See [NASA_RESOURCES.md](NASA_RESOURCES.md) for every NASA resource used and what it feeds.

## What the game does

- **A home page that is already the physics.** The solar system beside the title turns at the
  bodies' real orbital periods — 365.25 days for Earth, 687 for Mars, 4333 for Jupiter — pulled
  from the same `scenarios.json` the missions fly. The *order* of the speeds and the distances is
  real; the *range* of both is squashed, by a square root on the spacing and a power on the lap
  times, because at true scale Earth would sit inside the Sun and Jupiter would take eleven minutes
  to go round. One CSS keyframe per ring, so there is no animation loop, and
  `prefers-reduced-motion` stops it dead.
- **The whole mission in 3D, with three cameras.** Press **3D** in Mission Control and the flat map
  becomes a solar system you can fly round. **Orbit** swings right round the lot. **Track** hangs
  back but keeps the spacecraft centred, so the system wheels behind it. **Follow** rides astern of
  the spacecraft and looks where it is going. The camera turns on its own; drag to take hold of it.
  The stars sit on a sphere far outside the mission, so swinging the camera sweeps them past the
  way a real sky moves. The orbits lie flat because the real ones very nearly do — what makes the
  picture read as solid is the camera's tilt, not a tilt in the solar system.
- **A 3D view of the spacecraft you built**, with the renderer written here rather than imported.
  Rotate the corners, cull the faces pointing away, divide by distance for perspective, sort
  far-to-near and paint — the painter's algorithm, about two hundred lines, no 3D library. Every
  size comes from the same `shipLayout` that draws the flat sprite, so it is never a different
  machine from the one flying the mission. Drag to turn it; point at a part to name it.
- **Play as a team, 2 to 4, on one laptop.** Each player owns part of the spacecraft — Flight
  Director, Power Engineer, Comms Officer, Science Lead. When a solar storm hits the panels the
  card says *"Priya, Power Engineer — this one is yours"*, and the Results screen counts how many
  calls each of you took. Anything nobody owns falls to the Flight Director, so a team of two still
  has an answer for every challenge.
- **Three missions** — Moon (tutorial), Mars on a Budget (Mangalyaan-style, $150M), Jupiter Explorer.
- **Six part groups** and a fuel slider, with four live bars: money, mass, power and fuel Δv.
- **Part cards that know the mission.** Each one says what choosing it would do *here*, worked out
  live from the physics — the small antenna gets 100% of your science home from the Moon and 10%
  from Mars.
- **Pick a goal, and it changes the spacecraft.** Each mission offers two or three real goals —
  map the Moon, hunt for water ice, watch the dust storms, explore the icy moons — and every goal
  names one instrument it cannot be done without. Choose "look for buried water" and the Design Lab
  will not let you launch without a spectrometer, which is the instrument Mars Odyssey actually
  found buried ice with in 2002.
- **Six launch checks** in plain English, each with a sentence saying exactly what is wrong. The
  first one asks whether the spacecraft can do the job at all.
- **A real launch calendar** with the window band, and a fast/slow route trade.
- **A live flight map** — seeded starfield with a Milky Way band, the orbits, the transfer, and a
  trail behind the spacecraft. A scale bar measured from the map's own AU-to-pixel factor.
- **Worlds drawn as lit spheres, not discs.** The bright side always faces the Sun, worked out from
  where the Sun actually is on the map — the same reason the Moon has phases. Mars carries its
  polar cap, Jupiter its cloud bands and the Great Red Spot, the Moon its craters.
- **Sound, built from numbers rather than files.** Six short sounds — launch, alert, answer,
  arrival — are played by the browser's own oscillator from notes in `sounds.json`, so the game is
  still one small download. It starts **off**: a page that makes a noise before you ask is rude,
  and a judge may be in a quiet room.
- **18 challenges**, 3 to 5 per mission, drawn by chance and filtered by your design: solar storms,
  dust on the panels, course drift, lost signal, instrument faults, debris, micrometeoroids,
  sunlight pressure, planetary protection, safe mode, a busy Deep Space Network, a software bug,
  Jupiter's radiation and more.
- **Opportunities, not just problems** — a free gravity assist, an asteroid worth photographing, an
  instrument doing better than planned. Some choices cause a **follow-up later that names the day
  you made them**.
- **It happens to your spacecraft.** The sprite on the map and the drawing on the card are assembled
  from your design and sized by real numbers: the bus by mass, the panels by √watts, the dish by
  √data-rate, one box per instrument. A challenge happens to a *named part*, which is marked and
  visibly damaged — dust dulls the panels, a strike punches a hole, a fault goes dark, a lost signal
  turns the dish away. Hovering an option rings the part that option would change.
- **A two-second beat** plays over the map before each card, so the trouble is something you see
  happen. A click, Escape, a toggle or reduced motion skips it, and it costs no mission time.
- **Every challenge teaches something** — what the thing is, a real story with a year (Opportunity
  2018, Mars Odyssey 2003, New Horizons 2015, the 2021 Mars solar conjunction, Hubble 2021), how
  common it is, and coloured chips on every option saying exactly what it changes.
- **Results** — score, three stars, every decision with a ✅ or ⚠️, the whole flight log, and a
  comparison with the real missions that flew it.
- **A Flight Director** who explains what happened and the one thing most worth changing. Rule-based,
  so it works with no API key and no backend.
- **After you arrive, the planets keep moving** and the spacecraft rides the orbit it reached.
  Nothing in space stops.

## Commands

```bash
npm run dev       # dev server
npm test          # 372 tests
npm run build     # type-check + production build
npm run measure   # plays the whole game in a headless browser and checks it
```

`npm run measure` is the one worth knowing about. It plays a real mission at 1366×650 and fails if
a screen scrolls, text drops under 11px, anything hangs off the side, a challenge card hides an
option or loses keyboard focus, the mission never finishes, or the console logs an error. Run it at
another size with `npm run measure -- 390 844`. First run needs the browser: `npm run measure:setup`.

## How it is put together

```
src/data/       parts, scenarios, events, settings, realMissions, glossary, nasaSources, sky,
                homeSystem, planets, sounds, ship3d, flight3d, roles
                game.ts — the one place the JSON is read and typed
src/physics/    rocketEquation, power, comms, windows, checks, goals, partEffects, missionFacts
src/sim/        simulation — the cruise engine; score; shipLayout; mapScale; sky; homeSystem;
                render3d + shipModel3d + flight3d — the 3D renderer; team; context; demo
src/store/      gameStore.ts — the only place game state lives
src/screens/    Home, TeamSetup, ChooseMission, DesignLab, Launch, MissionControl, Result
src/components/ ResourceBars, Gauge, Spacecraft, Ship3D, FlightMap3D, Planet, Starfield,
                SolarSystem, Beat, Timeline, Glossary, Provenance
src/audio.ts    every sound, built from notes by the browser's own oscillator
src/styles.css  one stylesheet, plain CSS, all colour in variables on :root
```

Four rules the code sticks to:

1. **Every number lives in `src/data/*.json`**, never in a screen. Rebalancing the game is a JSON edit.
2. **Physics is pure TypeScript with no React imports**, so all of it is unit-tested.
3. **Screens are dumb** — they read the store and call its actions. Logic lives in `physics/` or `sim/`.
4. **Plain English on screen.** Short sentences. A 12-year-old should understand every message.

React 19 · TypeScript · Vite · zustand · vitest. No UI library, no backend. Animation is SVG and
`requestAnimationFrame`, and all of it is switched off by `prefers-reduced-motion`.

## Accessibility

Keyboard focus rings on every control, arrow keys through the part choices, the challenge card takes
focus when it opens, `aria-label`s on every bar and gauge, a word next to every red or green signal
so nothing depends on colour alone, and reduced motion respected throughout.

## Licence

MIT — see [LICENSE](LICENSE). Use it, change it, teach with it. The real missions, agencies and
spacecraft named in the game belong to the people who flew them; they are named here only to tell
their story.
