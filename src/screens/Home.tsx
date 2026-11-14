/**
 * The front door. Two ways in: pick a mission, or go straight to the Moon
 * tutorial for anyone who would rather be shown than told.
 */
import { useGame } from "../store/gameStore";

const STEPS = [
  {
    title: "Design it",
    text: "Choose a body, instruments, power, an antenna, an engine and a rocket. Watch the four bars.",
  },
  {
    title: "Launch it",
    text: "Pick a month when the planet lines up with Earth, and choose a fast or a slow route.",
  },
  {
    title: "Fly it",
    text: "Things go wrong on the way. You decide what to do, and find out how your mission scored.",
  },
];

export default function Home() {
  const go = useGame((state) => state.go);
  const chooseScenario = useGame((state) => state.chooseScenario);

  return (
    <div className="screen">
      <div className="hero">
        <h1>Mission Architect</h1>
        <p className="hero-sub">
          Build a real spacecraft, launch it to the Moon, Mars or Jupiter, and keep it alive all the
          way there. The physics is real — the rocket equation, sunlight, signal delay and launch
          windows all work the way they do in space.
        </p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn btn--primary btn--big" onClick={() => go("choose")}>
            Start a mission 🚀
          </button>
          <button className="btn btn--big" onClick={() => chooseScenario("moon")}>
            Try the tutorial (Moon)
          </button>
        </div>
      </div>

      <div className="steps">
        {STEPS.map((step, index) => (
          <div className="panel step" key={step.title}>
            <span className="step-n">{index + 1}</span>
            <h3>{step.title}</h3>
            <p className="lead" style={{ margin: 0 }}>
              {step.text}
            </p>
          </div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-title">Built for the NASA Space Apps Challenge 2026</div>
        <p className="lead" style={{ margin: 0 }}>
          Challenge: <strong>Space Mission Design Game</strong>. Every formula in this game is the one
          real engineers use, and every planet number comes from NASA. You can check any of them — look
          for "Where the numbers come from" at the bottom of the next three screens.
        </p>
      </div>
    </div>
  );
}
