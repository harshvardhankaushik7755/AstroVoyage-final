/**
 * Which screen is showing. The store holds the answer; this just picks.
 */
import { useEffect } from "react";
import Home from "./screens/Home";
import ChooseMission from "./screens/ChooseMission";
import DesignLab from "./screens/DesignLab";
import Launch from "./screens/Launch";
import MissionControl from "./screens/MissionControl";
import Result from "./screens/Result";
import { useGame } from "./store/gameStore";

/** True when the player's system asks for less movement. */
export function reducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function App() {
  const screen = useGame((state) => state.screen);
  const scenarioId = useGame((state) => state.scenarioId);
  const startOver = useGame((state) => state.startOver);
  const setSkipAnimations = useGame((state) => state.setSkipAnimations);

  /* Respect the system's reduced-motion setting from the first frame. */
  useEffect(() => {
    if (reducedMotion()) setSkipAnimations(true);
  }, [setSkipAnimations]);

  /* Mission Control is a cockpit and takes the whole window. */
  const wide = screen === "control";

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">
          <span className="brand-dot" aria-hidden="true" />
          Mission Architect
        </span>
        <span className="topbar-spacer" />
        {scenarioId && screen !== "home" && (
          <button className="btn btn--ghost btn--small" onClick={startOver}>
            Start over
          </button>
        )}
      </header>

      <main className={wide ? "screen screen--wide" : undefined} style={wide ? undefined : { display: "contents" }}>
        {screen === "home" && <Home />}
        {screen === "choose" && <ChooseMission />}
        {screen === "design" && <DesignLab />}
        {screen === "launch" && <Launch />}
        {screen === "control" && <MissionControl />}
        {screen === "result" && <Result />}
      </main>
    </div>
  );
}
