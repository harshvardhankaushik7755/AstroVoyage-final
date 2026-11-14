/**
 * The front door.
 *
 * A split hero: what the game is on the left, a turning solar system on the
 * right. Three ways in, in the order a stranger needs them — the tutorial
 * first, then a free choice, then a jump straight to any of the three.
 */
import SolarSystem from "../components/SolarSystem";
import Starfield from "../components/Starfield";
import { scenarios } from "../data/game";
import { isDemo } from "../sim/demo";
import { useGame } from "../store/gameStore";

const STEPS = [
  {
    icon: "🎯",
    title: "Pick a mission",
    text: "Moon, Mars or Jupiter. Each one has a goal and a budget.",
  },
  {
    icon: "🛠️",
    title: "Build your spacecraft",
    text: "Choose the parts and watch the four bars: money, mass, power and fuel.",
  },
  {
    icon: "🚀",
    title: "Launch and keep it alive",
    text: "Pick a launch month, then handle the surprises on the way.",
  },
];

export default function Home() {
  const go = useGame((state) => state.go);
  const chooseScenario = useGame((state) => state.chooseScenario);
  const startDemo = useGame((state) => state.startDemo);
  const skipAnimations = useGame((state) => state.skipAnimations);
  const demo = isDemo();

  return (
    <div className="screen home">
      {/* The same seeded sky the flight map uses, stretched behind the page. */}
      <svg
        className="home-stars"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <Starfield width={1200} height={700} idPrefix="home-sky" />
      </svg>

      <div className="hero hero--split">
        <div className="hero-copy">
          <p className="eyebrow">Space Mission Design Game</p>

          <h1 className="wordmark">
            Astro<span>Voyage</span>
          </h1>

          <p className="hero-sub">
            You are the mission engineer. Pick a goal, build a spacecraft, launch it, and keep it
            alive.
          </p>

          <div className="row hero-actions">
            {demo ? (
              <button className="btn btn--primary btn--big" onClick={startDemo}>
                Start the demo mission (Mars) 🚀
              </button>
            ) : (
              <button className="btn btn--primary btn--big" onClick={() => chooseScenario("moon")}>
                Try the tutorial (Moon)
              </button>
            )}
            <button className="btn btn--big" onClick={() => go("choose")}>
              Start a mission
            </button>
          </div>

          <div className="row row--tight jump">
            <span className="tiny">Or jump in:</span>
            {scenarios.map((scenario) => (
              <button
                className="btn jump-pill"
                key={scenario.id}
                onClick={() => chooseScenario(scenario.id)}
              >
                <span className="jump-dot" style={{ background: scenario.color }} aria-hidden="true" />
                {scenario.target}
                <span className="jump-level">· {scenario.difficulty}</span>
              </button>
            ))}
          </div>

          {demo && (
            <p className="tiny demo-note">
              Demo mode. That button picks Mars, loads a tested design and launches, so you are
              watching a flying mission straight away. Four challenges arrive in the first minute,
              including a green opportunity and the follow-up it causes later.
            </p>
          )}
        </div>

        <div className="hero-art">
          <SolarSystem still={skipAnimations} />
        </div>
      </div>

      <div className="steps">
        {STEPS.map((step) => (
          <div className="panel step" key={step.title}>
            <span className="step-icon" aria-hidden="true">
              {step.icon}
            </span>
            <h3>{step.title}</h3>
            <p className="lead" style={{ margin: 0 }}>
              {step.text}
            </p>
          </div>
        ))}
      </div>

      <p className="lead home-foot">
        Every choice has a cost. More power means more mass. More mass means more fuel. More fuel
        means a bigger rocket.
      </p>
      <p className="tiny home-foot">
        Real formulas, real NASA numbers. Look for "Where the numbers come from" on the next three
        screens.
      </p>
    </div>
  );
}
