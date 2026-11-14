/**
 * The launch calendar. The green months are the real launch windows, and for
 * Mars there is only one in two years — which is the lesson.
 *
 * The route choice underneath is the other real trade: arriving sooner costs
 * more Δv, and Δv costs fuel, and fuel costs money.
 */
import type { Route } from "../data/game";
import { missionGoal, settings } from "../data/game";
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
  const launch = useGame((state) => state.launch);
  const go = useGame((state) => state.go);
  const goalId = useGame((state) => state.goalId);

  if (!scenario) return null;

  const goal = missionGoal(scenario, goalId);
  const check = runChecks(design, scenario, route, goal);
  const windowOpen = isWindowOpen(scenario, launchMonth);
  const canLaunch = check.allOk && windowOpen;
  // The route only moves the fuel check; the other four were settled in the lab.
  const otherChecksOk = check.checks.every((item) => item.id === "fuel" || item.ok);

  /* Two years, shown a year at a time. */
  const years = [0, 1];

  return (
    <div className="screen">
      <div className="spread">
        <div>
          <h2>Launch</h2>
          <p className="lead" style={{ margin: 0 }}>
            Pick a month, then choose the route. {scenario.name} — {goal.icon} {goal.label}.
          </p>
        </div>
        <button className="btn btn--ghost btn--small" onClick={() => go("design")}>
          ← Back to the Design Lab
        </button>
      </div>

      <div style={{ margin: "8px 0" }}>
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
                      <span className="row row--tight">
                        <span className="chip mono">{tripDays(scenario, id)} days</span>
                        <span className="chip mono">
                          {requiredDeltaV(scenario, id).toFixed(2)} km/s
                        </span>
                      </span>
                    </div>
                    <div className="tiny">{spec.note}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">
              Fuel for this route
              {otherChecksOk ? (
                <span className="chip chip--good" style={{ marginLeft: "auto" }}>
                  the other {check.checks.length - 1} checks passed
                </span>
              ) : (
                <span className="chip chip--bad" style={{ marginLeft: "auto" }}>
                  something else needs fixing
                </span>
              )}
            </div>
            <Checks check={check} only={["fuel"]} />
            {!otherChecksOk && (
              <p className="tiny" style={{ margin: "8px 0 0" }}>
                Go back to the Design Lab to see what else is wrong.
              </p>
            )}
          </div>

          <div className="panel">
            <button
              className="btn btn--primary btn--big"
              style={{ width: "100%" }}
              disabled={!canLaunch}
              onClick={() => launch()}
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
