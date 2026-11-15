# Status log

## 2026-11-14 — Built from scratch in one day

**What was built.** The whole game, written fresh in a new repository. No code was copied from
anywhere; the balanced game values come from the design document.

- `src/data/` — parts, scenarios, events (18 challenges), settings, realMissions, glossary,
  nasaSources, sky, directorLines, and `game.ts` as the one typed reader of all of it.
- `src/physics/` — rocketEquation, power, comms, windows, checks, partEffects, missionFacts.
- `src/sim/` — simulation (the cruise engine), score, shipLayout, mapScale, sky, context, demo.
- `src/screens/` — Home, ChooseMission, DesignLab, Launch, MissionControl, Result.
- `src/components/` — ResourceBars, Gauge, Spacecraft, Starfield, Beat, Timeline, MissionSummary,
  Dialog, Glossary, Provenance.
- `scripts/measure.mjs` — plays the whole game in a headless browser and gates on what it finds.

**Decisions made along the way.**

- *The rocket provides part of the mission Δv.* Making the spacecraft find all of it meant no
  preset could reach Mars. Each rocket now carries a `deltaVProvided`, which is both how real
  missions fly and the reason a bigger rocket is worth paying for.
- *Comms distance is measured from Earth for the Moon*, not from the Sun, or a Moon mission would
  appear to have an 8-minute signal delay instead of 1.3 seconds.
- *Losing days moves the clock and the arrival together*, so the days remaining never change and
  the spacecraft does not jump along its path.
- *The demo flies Mars, not the Moon.* A Moon trip is 3 days, so the 3 days a photograph costs
  would throw the later cards on top of each other.
- *The Design Lab's opening state is allowed to scroll.* All five checks fail at once there and each
  one needs a full sentence the player has to read. Every other state fits 1366×650.

**What `npm run measure` caught that the unit tests could not.** Three screens scrolling at
1366×650; 10px text on the launch calendar; the map's `svg { width: 100% }` rule leaking into the
challenge card and blowing the spacecraft drawing up to four times its size; and the software-bug
card hiding its third option. All fixed, and each one now has a check that fails if it comes back.

**Numbers.** 217 unit tests in 10 files, all passing. `npm run build` passes. `npm run measure`
passes clean at 1366×650 and at 390×844, five runs in a row across different random challenges.

**Not done yet.**
- Sound (the launch whoosh and alert beep).
- Lit spheres with real phases and per-body character — Jupiter's bands, a polar cap on Mars.
- The submission pack: the 30-second video, the project page and a deployed link.

**For Kunal.** The deployed link is the one thing judges always click. `npm run build` produces
`dist/`, which drops straight onto Netlify, Vercel or GitHub Pages.

## 2026-11-14 — Stage 13: renamed to AstroVoyage, and a home page worth landing on

**Built.** The game is now **AstroVoyage** everywhere: `index.html`, `package.json`, the top bar,
`README.md`, `CLAUDE.md`, `NASA_RESOURCES.md`, `scripts/measure.mjs`. New home page, rebuilt to
match the look Kunal asked for: a split hero with the wordmark and a turning solar system beside it,
quick-jump pills straight into any of the three missions, three icon cards, a full-window starfield,
and the NASA Space Apps badge where the brand used to sit.

Files: `src/data/homeSystem.json` (new — every number for the orrery), `src/sim/homeSystem.ts` (new
— the layout maths), `src/sim/homeSystem.test.ts` (new, 16 tests),
`src/components/SolarSystem.tsx` (new), `src/screens/Home.tsx` (rewritten), `src/App.tsx`,
`src/styles.css`, `src/data/scenarios.json` (+`difficulty`), `src/data/game.ts`.

**Decisions I made on my own.**
- *The orbits are honestly ordered but squashed.* Lap times come from each body's real orbit in
  days, so Earth really does outrun Mars and Mars outruns Jupiter — but the range is compressed
  (`time.compression`, 0.55) and the spacing goes by the square root of AU. At true scale Earth
  sits inside the Sun and Jupiter takes eleven minutes a lap. Said plainly in the JSON and the
  README; the honest version is a `<title>` the screen reader gets.
- *No "Play as a team" button and no sound toggle*, though the reference page has both. We have
  neither feature and a dead button on the front door is worse than a missing one.
- *The tutorial is now the primary button*, not "Start a mission" — a judge landing cold should
  have the shortest path pressed under their thumb.
- *One CSS keyframe per ring instead of a rAF loop.* No animation code to run, and the stylesheet's
  existing reduced-motion rule already freezes it — verified in a real browser, both states.

**Numbers.** 233 unit tests in 11 files, all passing. `npm run build` passes. `npm run measure`
passes clean at 1366×650 and 390×844. Home fits 603px in 603px — it has no headroom left, so
anything added to it has to take something else out.

**Still not done.** Sound; lit spheres with real phases; the submission pack (30-second video,
project page, deployed link).

**For Kunal.** The repo still has no git remote — creating it and pushing is the one thing I
cannot do. After that, the deployed link.

## 2026-11-14 — Stage 14: Choose a mission, rebuilt — and the goal became a real choice

**Built.** The Choose screen now matches the reference: a quiet difficulty pill, the mission name,
goal pills, the description, a Budget · Trip line, the three physics chips, and a full-width
"Design this mission" button. Equal-height cards, and the home page's starfield behind it so the
two screens read as one game.

The goals are not decoration. Each mission has two or three, and each names an instrument the
design cannot do the job without. It is a sixth launch check — **The job** — and it comes first,
because "can this spacecraft do what we sent it for" is the first question a real mission is asked.

Files: `src/physics/goals.ts` (new), `src/physics/goals.test.ts` (new, 25 tests),
`src/screens/ChooseMission.tsx` (rewritten), `src/physics/checks.ts` (optional 6th check),
`src/physics/missionFacts.ts` (+`tripLength`), `src/store/gameStore.ts` (+`goalId`, `chooseGoal`),
`src/data/scenarios.json` (`goal` → `goals[]`), `src/data/game.ts`, DesignLab/Launch/Result,
`src/styles.css`, `scripts/measure.mjs`.

**Decisions I made on my own.**
- *The goal check blocks the launch* rather than warning. It is the point of the challenge.
- *So `loadPreset` now adds the goal's instrument*, or "Load a design that works" could hand back a
  design failing the very first check. A test flies every mission × every goal from the preset to
  prove there is no dead end.
- *Mars's "look for buried water" uses the spectrometer, not a radar.* The radar's $35M and 60 kg
  does not fit beside Mangalyaan's $150M — and Mars Odyssey found the buried ice with a
  spectrometer in 2002, so the cheaper part is also the historically right one. The test caught
  this, not me.
- *The goal pick is local to the Choose screen until "Design this mission"*, so lighting up a goal
  on one card cannot throw away a design started on another.
- *Trip length says "about 5 years", not "about 62 months".* Same number, words a 12-year-old owns.

**Numbers.** 258 unit tests in 12 files, all passing. `npm run build` passes. `npm run measure`
passes clean at 1366×650 and 390×844. The sixth check cost 28px on the Design Lab, paid for by
tightening the check rows.

**Still not done.** Sound; lit spheres with real phases; the submission pack (30-second video,
project page, deployed link).

**For Kunal.** Still no git remote. That and the deployed link are the two things only you can do.

## 2026-11-14 — Stage 15: a UI pass, lit worlds, and sound

**Three real bugs found and fixed.**
- *Every primary button went dark navy under the pointer.* `.btn:hover:not(:disabled)` is a more
  specific selector than `.btn--primary`, so the gradient lost. It affected every main button in
  the game — including **Launch**, which looked disabled when it was not.
- *The launch calendar hid its own green.* The one open month is usually also the chosen one, and
  `.cal--chosen` painted over the green that says the window is open.
- *"the other 4 checks passed" on the Launch screen* had been wrong since the goal check made six.
  It counts now.

**Built.**
- `src/components/Planet.tsx` + `src/data/planets.json` — worlds are lit spheres, not flat discs.
  The bright side faces the Sun, worked out from where the Sun actually is on the map, so the
  target changes face as it comes round. Mars has its polar cap, Jupiter its bands and Red Spot,
  the Moon its craters.
- `src/audio.ts` + `src/data/sounds.json` — six sounds built from notes by the browser's own
  oscillator. No audio files, so the download does not grow. Off by default, with the toggle in
  the top bar. The store already had a `muted` flag that nothing used; it is wired now.
- The cockpit's right column no longer cuts off the spacecraft strip: a compact form for the
  268px column, measured at 22px over and trimmed by 24px.

**Numbers.** 272 unit tests in 14 files, all passing. `npm run build` passes. `npm run measure`
passes clean at 1366×650 and 390×844. Hover, the sound toggle and the goal mechanic each checked
in a real browser, not only in tests.

**Still not done.** The submission pack: the 30-second video, the project page, a deployed link.

**For Kunal.** NASA resources next, as agreed. Still no git remote.

## 2026-11-14 — Stage 16: a 3D spacecraft, and playing as a team

**The 3D view.** `CLAUDE.md` forbids new UI libraries, so rather than three.js this is a renderer
written here: rotate every corner, cull the faces pointing away from the eye, divide by distance
for perspective, sort far-to-near and paint. About two hundred lines, and because it returns flat
polygons for SVG rather than touching a canvas, all of it is unit-tested — 29 tests on the maths
alone, including that every box face is wound so its normal points outwards, since a face wound
backwards is culled exactly when it should be drawn and reads as a hole in the spacecraft.

The model is not a picture either: every size comes from `shipLayout`, the same function that draws
the flat sprite, so the 3D view is always the machine that is actually flying. Choose the nuclear
battery and the wings become a finned cylinder on a boom, which is where real ones go.

Files: `src/sim/render3d.ts`, `src/sim/shipModel3d.ts`, `src/components/Ship3D.tsx`,
`src/components/Ship3DView.tsx`, `src/data/ship3d.json`, + 46 tests. Reachable from the Design Lab
and Launch.

**Playing as a team, 2–4, one laptop.** Each player owns part of the spacecraft. A challenge that
hits the panels is the Power Engineer's call, and the card says so by name. Results counts the
calls each player took. Files: `src/data/roles.json`, `src/sim/team.ts` (22 tests),
`src/screens/TeamSetup.tsx`, plus the store, MissionControl and Result.

**Decisions I made on my own.**
- *Anything no role claims falls to the Flight Director*, which is why a team of two still has an
  owner for every challenge. A test checks every part has exactly one owner at every team size.
- *The wings are wider in 3D than the sprite's chord.* The sprite is always seen face-on; turned
  edge-on a narrow wing is a stick.
- *`measure` now opens the 3D view, counts the faces and checks it is turning.* With no library
  behind it, a mistake in the maths fails silently as an empty box rather than an error.

**Numbers.** 340 unit tests in 18 files, all passing. `npm run build` passes. `npm run measure`
passes clean at 1366×650 and 390×844, 26 checks. A full four-player game played end to end in a
real browser: roles assigned, the card naming the owner, the crew tally on the Results screen.

**Still open.** Music — Kunal said he would say more. The submission pack: video, project page,
deployed link. NASA resources next.

## 2026-11-15 — Stage 17: the whole mission in 3D, with three cameras

**Built.** The **3D** button in Mission Control turns the flat map into a solar system you can fly
round. Three cameras: **Orbit** swings right round the lot looking at the Sun, **Track** hangs back
but keeps the spacecraft centred so the system wheels behind it, **Follow** rides astern of the
spacecraft and looks where it is going. The camera turns on its own and drag takes hold of it.

Files: `src/sim/flight3d.ts` (new — the scene and the three cameras),
`src/sim/flight3d.test.ts` (new, 32 tests), `src/components/FlightMap3D.tsx` (new),
`src/data/flight3d.json` (new), `src/sim/render3d.ts` (+ a look-at camera), `MissionControl`,
`styles.css`, `scripts/measure.mjs`.

**How it stays honest.** The 3D scene asks the simulation the same questions the flat map asks —
`planetAngle`, `transferPath`, `progressOf` — so it cannot show the spacecraft anywhere the flat
map does not. A test checks both put it at the same angle. The orbits lie flat because the real
ones very nearly do; what makes the picture read as solid is the camera's tilt, not a tilt added
to the solar system.

**Decisions I made on my own.**
- *The camera distance is set by the HEIGHT of the cockpit map, not its width.* The map is wide and
  short and the system is round, so vertical is what runs out first. I measured it rather than
  guessed: at 2.0 system-widths the outer orbit uses about 84% of the height it has. At 1.85 it was
  96%, which is one label away from clipping.
- *Stars sit on a sphere of radius 9 system-widths*, far outside anything the mission reaches, so
  swinging the camera sweeps them past the way a real sky does rather than sliding them like a
  backdrop.
- *The spacecraft's heading is read off the path it is drawn on*, not worked out again, so the
  follow camera can never point somewhere the trail does not go.

**Numbers.** 372 unit tests in 19 files, all passing. `npm run build` passes. `npm run measure`
passes clean at 1366×650 and 390×844 — 30 checks, and it now opens the 3D view, tries all three
cameras and checks the camera is actually moving, because with no 3D library behind it a mistake
in the maths fails silently as an empty box.

**Still open.** Music — Kunal said he would say more. The submission pack: video, project page,
deployed link. NASA resources.

## 2026-11-15 — Stage 18: the 3D view actually looks like something

Kunal sent a screenshot of the 3D view and it looked bad. He was right. Three things were wrong.

- **A huge teal blob.** The spacecraft's halo was sized from the capped on-screen radius, so in
  Follow it became a 240px disc swallowing the middle of the picture. Gone.
- **A flat 2D sprite pasted onto a 3D scene.** The spacecraft was still the map sprite. It is now
  the real solid model — the same `shipFaces` the Design Lab's 3D view uses — placed where the
  mission has got to, turned so its nose agrees with the heading, and lit from the Sun. This took
  one new function, `renderWith`, which does the same cull-project-sort as the model viewer but
  through a camera that can stand anywhere.
- **Lines too faint to read.** The orbits and the flown path were washed out. Brighter and thicker.

Also: the follow camera sat dead astern, so you stared at the spacecraft's back. It is held off to
one side now, for a three-quarter view, and the spacecraft is drawn half again as large.

Files: `src/sim/render3d.ts` (+`renderWith`), `src/sim/flight3d.ts` (+`shipInScene`),
`src/components/FlightMap3D.tsx`, `src/data/flight3d.json`.

**Numbers.** 372 tests still passing, build passes, `measure` clean at 1366×650 and 390×844.

**For Kunal.** Four hours to submit. The deployed link is the thing judges click — `npm run build`
then drag `dist/` onto netlify.com/drop.

## 2026-11-15 — Stage 19: the 3D view was unplayable. Fixed.

**The serious one: 3D mode soft-locked the mission.** The two-second beat that plays before a
challenge card is drawn *inside the flat map's own `<svg>`*. In 3D that element is never mounted,
so its `onDone` never fired, `beat` stayed set forever, and `event` — which is
`beat === null ? pendingEvent : null` — stayed null. The card never opened and the mission could
not be finished. In 3D the beat is now skipped, and switching to 3D ends one already running.
`measure` now plays a challenge in 3D and fails if no card opens.

**The spacecraft sat on top of the planet it had reached.** Its arrival orbit was
`max(targetRadius * 0.05, 0.03)` world units, smaller than the planet's own radius plus the
spacecraft's, so the two overlapped and it read as having flown into Mars rather than captured
around it. The radius now clears both, from `arrivalOrbitRadius` in the data, and a lap takes 1.2
mission days instead of 57, so it visibly goes round.

**The model.** Sensor boxes were half the size of the bus, so the spacecraft read as a crate with
a lid; they are 62% now. The engine bell was muddy brown and over-flared — steel, and slimmer.
Deeper panels, lighter bus.

**And a real focus bug found by the above.** Switching between flat and 3D while a card is open
took the keyboard focus to the toggle button and left it there. The card takes focus back.

**Numbers.** 372 tests passing, build passes, `measure` clean at 1366×650 and 390×844 — 31 checks.

**For Kunal — the push.** The reason pushing fails is that the GitHub token on this machine has
expired: `gh auth status` reports "The token in default is invalid." Run `gh auth login`, then
`gh repo create astrovoyage --public --source=. --push`.
