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
