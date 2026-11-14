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
