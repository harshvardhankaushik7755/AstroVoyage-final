# NASA resources used in AstroVoyage

**NASA Space Apps Challenge 2026 — "Space Mission Design Game"**

This file exists so nothing in the game has to be taken on trust. For every NASA
resource we used, it says what we took from it, where that lives in the code,
and how to check it. In-game, the same information is on the **NASA resources**
screen (the 📐 button in the top bar, reachable from every screen).

Where a number is ours rather than NASA's, the game says so — see
[`src/data/nasaSources.json`](src/data/nasaSources.json), which marks every
number as a real formula, a real NASA measurement, or a game value we chose.

---

## The four doing real work

### 1. GMAT — General Mission Analysis Tool
**NASA Goddard Space Flight Center** · <https://software.nasa.gov/software/GSC-18094-1>

GMAT is NASA's open-source mission design program, used on real flight projects.

**What we did with it:** the game exports your finished mission as a real GMAT
script. The **Download GMAT script** button on the Result screen produces a
`.script` file carrying your spacecraft's actual dry mass, propellant load,
engine Isp, parking orbit and departure burn, written in GMAT's own script
language. Open it in GMAT and press Run.

This is the part we are proudest of. The game does not imitate mission design
software — it hands your mission to the real thing.

- Built by [`src/sim/gmatExport.ts`](src/sim/gmatExport.ts) (pure, no DOM)
- Configured in [`src/data/gmat.json`](src/data/gmat.json)
- 51 tests in [`src/sim/gmatExport.test.ts`](src/sim/gmatExport.test.ts) check the
  structural rules GMAT enforces: exactly one `BeginMissionSequence;`, every
  `Create` before it, every command after it, no reference to a resource that was
  never created, and no body listed as both a primary body and a point mass.

To verify: play a mission, press **Look at it first** to read the script on
screen, download it, and open it in GMAT.

### 2. Mission Design Lab, Integrated Design Center
**NASA Goddard Space Flight Center** · <https://idc.gsfc.nasa.gov/>

The MDL is a room at Goddard where engineers from every subsystem size a whole
mission concept together in about a week — concurrent engineering. At the end
they say whether the design *closes*.

**What we did with it:** the **NASA Design Review** in the Design Lab reviews
your spacecraft the way the MDL reviews one. It does not ask "does it fit?" —
the launch checks already do that. It asks the harder question: *does it still
fit once every subsystem adds the contingency it is required to add?* Each of
five subsystems reports three numbers:

| | meaning |
|---|---|
| **CBE** | Current Best Estimate — the honest number today |
| **MEV** | Maximum Expected Value — CBE plus contingency, what you design to |
| **MPV** | Maximum Possible Value — the hard limit the hardware sets |

A design closes when MEV ≤ MPV. The team roles in 2–4 player mode are the MDL's
subsystem leads.

- [`src/physics/margins.ts`](src/physics/margins.ts) — 40 tests in
  [`src/physics/margins.test.ts`](src/physics/margins.test.ts)
- [`src/data/mdlPolicy.json`](src/data/mdlPolicy.json) — every percentage carries
  the sentence of the NASA paper it came from

### 3. "Resource Management and Contingencies in Aerospace Concurrent Engineering"
**Karpati, Hyde, Peabody & Garrison — NASA Goddard, 2012** · NTRS 20120013284
<https://ntrs.nasa.gov/citations/20120013284>

The paper that writes down, discipline by discipline, the contingency and margin
policies in use at Goddard's Integrated Design Center.

**What we did with it:** every percentage in the Design Review is quoted from
this paper — not estimated from it.

| Subsystem | Added | The sentence it comes from |
|---|---|---|
| Mechanical — dry mass | **+25%** | "25% contingency is carried over the CBE mass of an avionics box." |
| Electrical Power | **+30%** | "the power delivered have a minimum of 30% contingency over the total CBE loads" |
| RF Communications | **+30%** | "The RF Comm subsystem gets the CBE data rate from Science, and adds 30% contingency to it." |
| GN&C — Δv | **+5%** | "Add 5 % ACS Tax on all delta-v numbers." |
| Propulsion — propellant | **+5%** | "Add 3% to 5% for ullage and residuals on total propellant" |

The four margin formulas are the paper's own, and the paper argues the bare words
"margin" and "contingency" should always be qualified:

```
Growth contingency   = (MEV - CBE) / CBE
Resource contingency = (MEV - CBE) / MEV
Growth margin        = (MPV - MEV) / MEV
Resource margin      = (MPV - MEV) / MPV
```

We also took the paper's sharpest warning and made it a game mechanic:
**contingency pile-up** — "concurrent design products are vulnerable to
contingency pile-ups, especially so to hidden contingency pile-ups". Every team
adds its own margin on top of a number that already had one added. The game
reports it as your **composite contingency**, and it is always larger than the
25% added to dry mass alone, because a heavier spacecraft needs more fuel and
fuel is itself mass.

The 25% margin a project manager is expected to still hold at the start of
Phase B comes from a separate Goddard source (Di Pietro), cited in the same file.

### 4. JPL Horizons & Solar System Dynamics
**NASA Jet Propulsion Laboratory** · <https://ssd.jpl.nasa.gov/horizons/>

**What we did with it:** the measured constants the whole simulation turns on,
in [`src/data/jplConstants.json`](src/data/jplConstants.json) — each with its
source. Mars at 1.52371034 AU in 686.98 days, Jupiter at 5.202887 AU in 4332.589
days, the Moon round Earth in 27.321661 days, GM for every body, and the AU and
speed of light as the exactly-defined values they are.

Launch windows are *derived* from those real periods rather than picked:
`1/synodic = |1/earth − 1/planet|` gives 779.94 days for Mars (the game's "about
every 26 months") and 398.88 days for Jupiter. Sunlight shares are
`1/distance²` — 43.1% at Mars, 3.69% at Jupiter.

---

## Everything else

| Resource | Organisation | What we used it for |
|---|---|---|
| [JPL open-source repositories](https://github.com/nasa-jpl) | NASA JPL | SPICE's conventions — J2000 ecliptic frame, bodies as point masses, angles from a fixed epoch. The exported GMAT script names bodies as SPICE does, including `Luna`. |
| [NSSDCA Planetary Fact Sheets](https://nssdc.gsfc.nasa.gov/planetary/factsheet/index.html) & [Master Catalog](https://nssdc.gsfc.nasa.gov/nmc/) | NASA Goddard | Planet radii and gravity; the real launch years, agencies and power systems of the five missions the game compares your design against. |
| [State-of-the-Art of Small Spacecraft Technology](https://www.nasa.gov/smallsat-institute/sst-soa) | NASA Ames | The parts catalogue: bus masses, instrument power draws, antenna data rates, and engine Isp — 320 s chemical, 3,000 s ion. |
| [Deep Space Network](https://eyes.nasa.gov/apps/dsn-now/) | NASA JPL | Signal delay at the real speed of light: 8.317 light-minutes per AU, each way. It is why the Jupiter mission cannot be flown by reacting. |
| [Radioisotope Power Systems](https://rps.nasa.gov/) | NASA | The RTG: its mass, its cost, and that its output does not fall with distance — the one property that makes Jupiter solvable. |
| [Beginner's Guide to Rockets](https://www.grc.nasa.gov/WWW/K-12/rocket/) | NASA Glenn | The rocket equation in the form NASA teaches it: Δv = Isp × g₀ × ln(m₀/m_f), g₀ = 9.80665 m/s². No simplification. |
| AIAA S-120 | AIAA (not NASA) | Cited for honesty: the mass-properties standard the Goddard paper names as the one the MDL works to. |

---

## What the review finds, and why that is the point

Run the Design Review on each mission's own shipped design and it reports:

| Mission | Verdict | What fails | Composite contingency |
|---|---|---|---|
| Moon Orbiter | **Closes, but tight** | nothing — 2% spare on data rate | 28% |
| Mars on a Budget | **Does not close** | dry mass: 462 kg expected, 400 kg available | 37% — pile-up |
| Jupiter Explorer | **Does not close** | power: 124 W needed, 104 W from panels at 5.2 AU | 40% — pile-up |

These designs all pass the launch checks. They fail the review. That is not a
bug — it is the entire reason concept reviews exist, and both failures are real
engineering history: Mangalyaan flew on famously thin margins, and solar power at
Jupiter is exactly why outer-planet missions carry RTGs. Both are fixable in one
move, so the review teaches without blocking: load slightly less fuel for Mars,
and for Jupiter drop to the instrument the goal actually needs so an RTG can
carry the load.

---

## Verifying all of this

```bash
npm install
npm test          # 485 tests, including 110 for the GMAT export, the margin review
                  # and the new data files
npm run build     # type-check + production build
npm run measure   # 41 headless browser checks at 1366x650 and 390x844
```

`npm run measure` is the gate that matters: it plays a whole mission in a real
browser and fails if the GMAT script is malformed, if the Design Review does not
report all five subsystems or cite its paper, or if the NASA resources screen
loses its links.

---

## Appendix A — the original resource map

Kept verbatim from the first version of this file. Its links were checked by hand on the day,
and it names three resources the sections above do not call out separately — the JPL DSN Now
page, NASA Science missions, and the NASA Open Data Portal.

Space Apps judges score "use of NASA resources". Every link below was checked on 14 Nov 2026.
Each row says which NASA resource a game number comes from, so the claim is checkable.

| Game number | NASA resource | Link |
|---|---|---|
| Planet distances, orbit periods, gravity, sunlight at each body | NSSDCA Planetary Fact Sheets (NASA Goddard, curated by Dr David R. Williams) | https://nssdc.gsfc.nasa.gov/planetary/planetfact.html |
| Moon / Mars / Jupiter individual tables | NSSDCA fact sheet index | https://nssdc.gsfc.nasa.gov/planetary/factsheet/index.html |
| Where each planet actually is on a given date; transfer timing | JPL Horizons, Solar System Dynamics Group (DE440/441 ephemeris) | https://ssd.jpl.nasa.gov/horizons/ |
| Spacecraft bus mass, power, propulsion and comms figures behind the part cards | NASA State-of-the-Art of Small Spacecraft Technology, 2026 edition (NASA Ames / S3VI) | https://www.nasa.gov/smallsat-institute/sst-soa |
| Signal delay, antenna data rates, the "busy network" challenge | NASA Deep Space Network Now (live, 5-second updates, Goldstone / Madrid / Canberra) | https://eyes.nasa.gov/apps/dsn-now/ |
| DSN background for the card text | JPL Deep Space Network Now | https://www.jpl.nasa.gov/deep-space-network-now/ |
| RTG mass, power and the "same power anywhere" rule | NASA Radioisotope Power Systems | https://rps.nasa.gov/ |
| Rocket equation teaching text | NASA Glenn Beginner's Guide to Rockets | https://www.grc.nasa.gov/WWW/K-12/rocket/ |
| Real missions compared on the results screen | NSSDCA Master Catalog spacecraft records | https://nssdc.gsfc.nasa.gov/nmc/ |
| Mission facts and the real stories on challenge cards | NASA Science missions | https://science.nasa.gov/ |
| Anything else needing a dataset | NASA Open Data Portal | https://data.nasa.gov/ |

**One caveat to check before you submit:** DSN Now has carried a maintenance notice. Open it once
and, if it is down, cite the JPL page instead and say the figures are from the DSN's published
station list rather than the live feed.

## Appendix B — how the provenance panel was specified

The build instruction that produced `src/data/nasaSources.json` and
`src/components/Provenance.tsx`, kept for the record.

## Prompt P-NASA — wire the resources into the game (run it after P1)

```
Create src/data/nasaSources.json: an array of objects
{ id, what, kind, detail, source, url }
where kind is "formula" | "real" | "game", `what` is a plain-English label a 12-year-old
understands, `detail` is one sentence, `source` is the NASA resource name and `url` its link.
Use exactly the rows in NASA_RESOURCES.md, one object per row, plus one row per game value
(part costs, mission budgets, science points, event chances) with source "Game value" and url null.

Then build src/components/Provenance.tsx: a button labelled "Where the numbers come from" that
opens a panel listing every row grouped by kind, with headings
"Real formula", "Real NASA measurement" and "Game value we chose".
Each row with a url renders the source as a real link (target="_blank", rel="noreferrer").
Put the button as a footnote on the Design Lab, Launch and Results screens.

Write a vitest test that every entry has a non-empty what/detail/source, that every
kind is one of the three, that every "real" and "formula" entry has an https NASA url,
and that ids are unique.
```

Run that and the entry has a visible, checkable NASA trail on three screens — which is the
thing that actually earns the "use of NASA resources" marks.
