/**
 * The launch calendar. The green months are the real launch windows, and for
 * Mars there is only one in two years — which is the lesson.
 *
 * The route choice underneath is the other real trade: arriving sooner costs
 * more Δv, and Δv costs fuel, and fuel costs money.
 */
import type { Route } from "../data/game";
import { settings } from "../data/game";
import { runChecks } from "../physics/checks";
import {
  CALENDAR_MONTHS,
  START_YEAR,
  isWindowOpen,
  monthLabel,
  monthShortLabel,
  requiredDeltaV,
  tripDays,
  windowMessage,
} from "../physics/windows";
import { Checks } from "../components/ResourceBars";
import MissionSummary from "../components/MissionSummary";
import Provenance from "../components/Provenance";
import { useGame, useScenario } from "../store/gameStore";

const ROUTES: Route[] = ["slow", "fast"];

export default function Launch() {
  const scenario = useScenario();
  const design = useGame((state) => state.design);
  const launchMonth = useGame((state) => state.launchMonth);
  const route = useGame((state) => state.route);
  const setLaunchMonth = useGame((state) => state.setLaunchMonth);
  const setRoute = useGame((state) => state.setRoute);
  const go = useGame((state) => state.go);

  if (!scenario) return null;

  const check = runChecks(design, scenario, route);
  const windowOpen = isWindowOpen(scenario, launchMonth);
  const canLaunch = check.allOk && windowOpen;

  /* Two years, shown a year at a time. */
  const years = [0, 1];

  return (
    <div className="screen">
      <div className="spread">
        <div>
          <h1>Launch</h1>
          <p className="lead">
            Pick a month, then choose the route. {scenario.name} — {scenario.goal}.
          </p>
        </div>
        <button className="btn btn--ghost btn--small" onClick={() => go("design")}>
          ← Back to the Design Lab
        </button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <MissionSummary design={design} />
      </div>

      <div className="launch">
        {/* ------------------------------------------- the calendar */}
        <div className="panel">
          <div className="panel-title">
            When do you launch?
            <span className="chip chip--easy" style={{ marginLeft: "auto" }}>
              green = window open
            </span>
          </div>

          {years.map((year) => (
            <div key={year}>
              <div className="cal-year">{START_YEAR + year}</div>
              <div className="calendar" style={{ marginBottom: 8 }}>
                {Array.from({ length: 12 }, (_, index) => {
                  const month = year * 12 + index;
                  if (month >= CALENDAR_MONTHS) return null;
                  const open = isWindowOpen(scenario, month);
                  const chosen = month === launchMonth;
                  return (
                    <button
                      key={month}
                      className={`cal ${open ? "cal--open" : ""} ${chosen ? "cal--chosen" : ""}`}
                      onClick={() => setLaunchMonth(month)}
                      aria-pressed={chosen}
                      aria-label={`${monthLabel(month)}${open ? ", launch window open" : ", no launch window"}`}
                    >
                      {monthShortLabel(month)}
                      {open && (
                        <span aria-hidden="true" style={{ display: "block", fontSize: 10 }}>
                          ●
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <p className={windowOpen ? "lead" : "lead"} style={{ margin: "6px 0 0" }}>
            {windowOpen ? "✅ " : "⚠️ "}
            {windowMessage(scenario, launchMonth)}
          </p>
        </div>

        {/* ------------------------------------------- route and go */}
        <div className="col">
          <div className="panel">
            <div className="panel-title">Which route?</div>
            <div className="routes">
              {ROUTES.map((id) => {
                const spec = settings.routes[id];
                return (
                  <button
                    key={id}
                    className="route"
                    aria-pressed={route === id}
                    onClick={() => setRoute(id)}
                  >
                    <div className="spread">
                      <strong>{spec.label}</strong>
                      <span className="chip mono">{tripDays(scenario, id)} days</span>
                    </div>
                    <div className="tiny">{spec.note}</div>
                    <div className="tiny mono">
                      Needs {requiredDeltaV(scenario, id).toFixed(2)} km/s in total
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Launch checks</div>
            <Checks check={check} />
          </div>

          <div className="panel">
            <button
              className="btn btn--primary btn--big"
              style={{ width: "100%" }}
              disabled={!canLaunch}
              onClick={() => go("control")}
            >
              {canLaunch
                ? "Launch 🚀"
                : !check.allOk
                  ? "Fix the design first"
                  : "Pick a green month"}
            </button>
            <p className="tiny" style={{ margin: "8px 0 0" }}>
              Launching {monthLabel(launchMonth)} · {tripDays(scenario, route)} days to{" "}
              {scenario.targetProse}.
            </p>
          </div>
        </div>
      </div>

      <Provenance />
    </div>
  );
}
