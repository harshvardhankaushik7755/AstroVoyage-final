/**
 * Seating the team.
 *
 * Pick how many of you there are, type the names, and the roles are handed out
 * in order. The cards are not decoration: the part each role owns is the part
 * whose challenges that player will be asked to decide, by name.
 */
import { useState } from "react";
import Starfield from "../components/Starfield";
import { roles as rolesConfig } from "../data/game";
import { assignRoles, roleOf } from "../sim/team";
import { useGame } from "../store/gameStore";

export default function TeamSetup() {
  const setTeam = useGame((state) => state.setTeam);
  const go = useGame((state) => state.go);
  const existing = useGame((state) => state.players);

  const [count, setCount] = useState(() => Math.max(2, existing.length || 2));
  const [names, setNames] = useState<string[]>(() =>
    rolesConfig.defaultNames.map((fallback, index) => existing[index]?.name ?? fallback),
  );

  // Previewed live, from the same function that will seat them for real, so
  // the cards can never promise a role the game then hands to somebody else.
  const team = assignRoles(names.slice(0, count));

  const sizes = Array.from(
    { length: rolesConfig.maxPlayers - 1 },
    (_, index) => index + 2,
  );

  return (
    <div className="screen choose">
      <svg
        className="home-stars"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <Starfield width={1200} height={700} idPrefix="team-sky" />
      </svg>

      <div className="spread choose-head">
        <div>
          <h1>Play as a team</h1>
          <p className="lead" style={{ margin: 0 }}>
            One laptop, one spacecraft. Each of you owns a part of it — and when something goes
            wrong with your part, the call is yours.
          </p>
        </div>
        <button className="btn btn--ghost btn--small" onClick={() => go("home")}>
          ← Back
        </button>
      </div>

      <div className="panel team-size">
        <span className="panel-title" style={{ marginBottom: 0 }}>
          How many of you?
        </span>
        <div className="row row--tight" role="group" aria-label="How many players">
          {sizes.map((size) => (
            <button
              key={size}
              className={`btn jump-pill${size === count ? " goal-pill--on" : ""}`}
              style={{ ["--mission-color" as string]: "var(--accent)" }}
              aria-pressed={size === count}
              onClick={() => setCount(size)}
            >
              {size} players
            </button>
          ))}
        </div>
      </div>

      <div className="team-grid">
        {team.map((player) => {
          const role = roleOf(player);
          return (
            <div className="panel team-card" key={player.index}>
              <span className="team-icon" aria-hidden="true">
                {role.icon}
              </span>
              <span className="team-role">{role.name}</span>

              <label className="team-name">
                <span className="sr-only">Name of player {player.index + 1}</span>
                <input
                  className="input"
                  value={names[player.index] ?? ""}
                  maxLength={14}
                  placeholder={rolesConfig.defaultNames[player.index]}
                  onChange={(event) =>
                    setNames((all) => {
                      const next = [...all];
                      next[player.index] = event.target.value;
                      return next;
                    })
                  }
                />
              </label>

              <p className="lead team-blurb">{role.blurb}</p>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ justifyContent: "center" }}>
        <button
          className="btn btn--primary btn--big"
          onClick={() => {
            setTeam(names.slice(0, count));
            go("choose");
          }}
        >
          Choose a mission →
        </button>
        <button
          className="btn"
          onClick={() => {
            setTeam([]);
            go("choose");
          }}
        >
          Play on my own instead
        </button>
      </div>
    </div>
  );
}
