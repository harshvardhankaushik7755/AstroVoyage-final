/**
 * Pick a mission, and pick what you are going there to do.
 *
 * The goal is a real choice, not a label: each one names an instrument the
 * spacecraft cannot do the job without, and the Design Lab checks for it
 * before it will let you launch. The three facts under it — sunlight, signal
 * delay, launch window — are worked out from the physics rather than written
 * by hand, so a card can never promise something the engine does not do.
 */
import { useState } from "react";
import Starfield from "../components/Starfield";
import { missionGoal, scenarios } from "../data/game";
import { missionFacts, tripLength } from "../physics/missionFacts";
import { useGame } from "../store/gameStore";

export default function ChooseMission() {
  const chooseScenario = useGame((state) => state.chooseScenario);
  const chooseGoal = useGame((state) => state.chooseGoal);
  const scenarioId = useGame((state) => state.scenarioId);
  const goalId = useGame((state) => state.goalId);
  const go = useGame((state) => state.go);

  /**
   * The goal lit on each card, before any of it is committed. Held here rather
   * than in the store so that lighting up a goal on one card does not throw
   * away the design you already started on another. "Design this mission" is
   * what writes the choice down.
   */
  const [picks, setPicks] = useState<Record<string, string>>(() =>
    scenarioId && goalId ? { [scenarioId]: goalId } : {},
  );

  return (
    <div className="screen choose">
      <svg
        className="home-stars"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <Starfield width={1200} height={700} idPrefix="choose-sky" />
      </svg>

      <div className="spread choose-head">
        <div>
          <h1>Choose a mission</h1>
          <p className="lead" style={{ margin: 0 }}>
            Three places to go. They get harder the further away they are — and each card says why.
          </p>
        </div>
        <button className="btn btn--ghost btn--small" onClick={() => go("home")}>
          ← Back
        </button>
      </div>

      <div className="missions">
        {scenarios.map((scenario) => {
          const picked = missionGoal(scenario, picks[scenario.id]);

          return (
            <section
              key={scenario.id}
              className="panel mission"
              style={{ ["--mission-color" as string]: scenario.color }}
              aria-labelledby={`mission-${scenario.id}`}
            >
              <span className="mission-level">{scenario.level}</span>

              <h2 id={`mission-${scenario.id}`} className="mission-name">
                {scenario.name}
              </h2>

              <div className="mission-goals">
                <span className="mission-goals-label">Pick a goal</span>
                <div className="row row--tight">
                  {scenario.goals.map((goal) => (
                    <button
                      key={goal.id}
                      className={`btn goal-pill${goal.id === picked.id ? " goal-pill--on" : ""}`}
                      aria-pressed={goal.id === picked.id}
                      onClick={() => setPicks((all) => ({ ...all, [scenario.id]: goal.id }))}
                    >
                      <span aria-hidden="true">{goal.icon}</span>
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mission-desc">{scenario.description}</p>

              <p className="mission-numbers">
                <strong>Budget:</strong> ${scenario.budget}M <span className="dot">·</span>{" "}
                <strong>Trip:</strong> {tripLength(scenario)}
              </p>

              <div className="row row--tight mission-facts">
                {missionFacts(scenario).map((fact) => (
                  <span className={`chip chip--${fact.tone}`} key={fact.id} title={fact.why}>
                    {fact.label}: {fact.value}
                  </span>
                ))}
              </div>

              <button
                className="btn btn--primary mission-go"
                onClick={() => {
                  chooseScenario(scenario.id);
                  chooseGoal(picked.id);
                }}
              >
                Design this mission
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
