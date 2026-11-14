/**
 * Pick a mission. Each card carries the three facts that say how hard it is —
 * sunlight, signal delay and how often you can launch — worked out from the
 * physics rather than written by hand, so a card can never promise something
 * the engine does not do.
 */
import { scenarios } from "../data/game";
import { missionFacts } from "../physics/missionFacts";
import { useGame } from "../store/gameStore";

export default function ChooseMission() {
  const chooseScenario = useGame((state) => state.chooseScenario);
  const go = useGame((state) => state.go);

  return (
    <div className="screen">
      <div className="spread">
        <div>
          <h1>Choose your mission</h1>
          <p className="lead">
            Three places to go. They get harder as they get further away — and the reasons are shown
            on each card.
          </p>
        </div>
        <button className="btn btn--ghost btn--small" onClick={() => go("home")}>
          ← Back
        </button>
      </div>

      <div className="missions">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            className="panel mission"
            style={{ ["--mission-color" as string]: scenario.color }}
            onClick={() => chooseScenario(scenario.id)}
          >
            <span className="mission-level">{scenario.level}</span>
            <h2 style={{ margin: 0 }}>{scenario.name}</h2>
            <span className="mission-goal">{scenario.goal}</span>

            <span className="mission-facts">
              {missionFacts(scenario).map((fact) => (
                <span className={`chip chip--${fact.tone}`} key={fact.id} title={fact.why}>
                  {fact.label}: {fact.value}
                </span>
              ))}
            </span>

            <span className="tiny">{scenario.description}</span>

            <span className="spread" style={{ marginTop: 4 }}>
              <span className="mission-budget">${scenario.budget}M to spend</span>
              <span className="tiny">Design it →</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
