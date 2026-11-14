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
