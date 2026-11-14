/**
 * Results: the score, three stars, the Flight Director's explanation, every
 * decision with a verdict, and how the mission compares with the real ones.
 *
 * The comparison is the part that lands: a player who brought a Mars orbiter
 * in for $118M is standing next to Mangalyaan, and that is a true thing to
 * have noticed.
 */
import { findRealMission, missionGoal, settings } from "../data/game";
import { runChecks } from "../physics/checks";
import { explainMission } from "../ai/flightDirector";
import { scoreHeadline, scoreMission } from "../sim/score";
import { findEventDef } from "../data/game";
import MissionSummary from "../components/MissionSummary";
import Provenance from "../components/Provenance";
import { useGame, useScenario } from "../store/gameStore";

export default function Result() {
  const scenario = useScenario();
  const sim = useGame((state) => state.sim);
  const design = useGame((state) => state.design);
  const route = useGame((state) => state.route);
  const go = useGame((state) => state.go);
  const startOver = useGame((state) => state.startOver);
  const goalId = useGame((state) => state.goalId);

  if (!scenario) return null;

  const goal = missionGoal(scenario, goalId);
  const check = runChecks(design, scenario, route, goal);
  const score = scoreMission(sim, check);
  const director = explainMission(sim, check, score, scenario);

  const realMissions = scenario.realMissionIds
    .map(findRealMission)
    .filter((mission): mission is NonNullable<typeof mission> => mission !== undefined);

  return (
    <div className="screen">
      <div className="spread">
        <div>
          <h1>{scoreHeadline(score, sim)}</h1>
          <p className="lead">
            {scenario.name} — {goal.icon} {goal.label}
          </p>
        </div>
        <div className="row row--tight">
          <button className="btn btn--small" onClick={() => go("design")}>
            Change the design
          </button>
          <button className="btn btn--primary btn--small" onClick={startOver}>
            New mission
          </button>
        </div>
      </div>

      <div className="lab" style={{ marginTop: 4 }}>
        <div className="col">
          {/* ------------------------------------------------ the Director */}
          <div className="panel">
            <div className="panel-title">Flight Director</div>
            <div className="director">
              <div className="director-face" aria-hidden="true">
                🧑‍🚀
              </div>
              <div className="bubble">
                {director.map((paragraph, index) => (
                  <p key={index} style={{ margin: index === director.length - 1 ? 0 : undefined }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ decisions */}
          {sim && sim.decisions.length > 0 && (
            <div className="panel">
              <div className="panel-title">
                What you decided
                <span className="chip" style={{ marginLeft: "auto" }}>
                  {sim.decisions.length} of {settings.eventsPerMission.max} challenges
                </span>
              </div>
              <div className="decisions">
                {sim.decisions.map((decision, index) => {
                  const def = findEventDef(decision.defId);
                  return (
                    <div className="decision" key={`${decision.defId}-${index}`}>
                      <span aria-hidden="true">{decision.hurt ? "⚠️" : "✅"}</span>
                      <div>
                        <div>
                          <strong>Day {decision.day}: {decision.eventName}</strong>
                        </div>
                        <div className="lead" style={{ margin: "2px 0" }}>
                          You chose: {decision.optionLabel}
                        </div>
                        <div className="option-chips">
                          {decision.chips.map((chip) => (
                            <span
                              key={chip.text}
                              className={`chip ${chip.tone === "good" ? "chip--good" : chip.tone === "bad" ? "chip--bad" : ""}`}
                            >
                              {chip.text}
                            </span>
                          ))}
                        </div>
                        {def && (
                          <div className="tiny" style={{ marginTop: 4 }}>
                            <strong>Real story:</strong> {def.realExample}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---------------------------------------- the mission log, in full */}
          {sim && (
            <div className="panel">
              <div className="panel-title">The whole flight</div>
              <div className="log" style={{ maxHeight: "none" }}>
                {sim.log.map((line, index) => (
                  <div className={`log-line log-line--${line.tone}`} key={index}>
                    <span className="log-day">Day {Math.floor(line.day)}</span>
                    <span>{line.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------ score and stars */}
        <div className="col">
          <div className="panel" style={{ textAlign: "center" }}>
            <div className="score-big">{score.score}</div>
            <div className="tiny" style={{ marginBottom: 8 }}>
              points
            </div>
            <div className="stars" style={{ justifyContent: "center" }} role="img"
                 aria-label={`${score.starCount} of 3 stars`}>
              {[0, 1, 2].map((index) => (
                <span key={index} className={`star ${index < score.starCount ? "star--on" : ""}`}>
                  ★
                </span>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">How the score is worked out</div>
            <div className="checks">
              <div className={`check ${score.stars.reached ? "check--ok" : "check--bad"}`}>
                <span className="check-mark" aria-hidden="true">
                  {score.stars.reached ? "✅" : "⚠️"}
                </span>
                <div>
                  <div className="check-name">Reached {scenario.targetProse}</div>
                  <div className="check-msg">
                    {score.stars.reached
                      ? "In orbit, so the science counts."
                      : "Science only counts if the spacecraft arrives."}
                  </div>
                </div>
              </div>

              <div className={`check ${score.stars.fullSuccess ? "check--ok" : "check--bad"}`}>
                <span className="check-mark" aria-hidden="true">
                  {score.stars.fullSuccess ? "✅" : "⚠️"}
                </span>
                <div>
                  <div className="check-name">Nearly all the science</div>
                  <div className="check-msg">
                    {score.science} of {score.scienceMax} points
                    {score.scienceMax > 0 &&
                      ` (${Math.round((score.science / score.scienceMax) * 100)}%)`}
                    . You need 90% for the star.
                  </div>
                </div>
              </div>

              <div className={`check ${score.stars.underBudget ? "check--ok" : "check--bad"}`}>
                <span className="check-mark" aria-hidden="true">
                  {score.stars.underBudget ? "✅" : "⚠️"}
                </span>
                <div>
                  <div className="check-name">Money left over</div>
                  <div className="check-msg">
                    ${score.moneyLeft.toFixed(1)}M of ${scenario.budget}M unspent, and every
                    million is a point.
                  </div>
                </div>
              </div>
            </div>
            <p className="tiny" style={{ margin: "10px 0 0" }}>
              Score = science that got home × did it arrive + money left over.
            </p>
          </div>

          {/* ------------------------------------- the real missions */}
          <div className="panel">
            <div className="panel-title">The real thing</div>
            <div className="compare">
              <div className="compare-row">
                <span className="compare-name">Your mission</span>
                <span className="compare-agency">You</span>
                <span className="tiny" style={{ marginLeft: "auto" }}>
                  ${check.budget.value.toFixed(1)}M
                </span>
              </div>
              {realMissions.map((mission) => (
                <div className="compare-row" key={mission.id}>
                  <div style={{ flex: 1 }}>
                    <div>
                      <span className="compare-name">{mission.name}</span>{" "}
                      <span className="compare-agency">{mission.agency}</span>{" "}
                      <span className="tiny">{mission.year}</span>
                    </div>
                    <div className="tiny">{mission.fact}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">What you flew</div>
            <MissionSummary design={design} fuelKg={sim?.fuelKg} />
          </div>
        </div>
      </div>

      <Provenance />
    </div>
  );
}
