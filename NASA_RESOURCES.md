# NASA resources used in Mission Architect

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

---

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
