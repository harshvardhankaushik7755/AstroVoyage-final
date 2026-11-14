/**
 * The Design Lab. Six groups of parts as an accordion — one open at a time,
 * so the screen fits a laptop — and four bars that move as you choose.
 *
 * Every part card says what choosing it would do to *this* mission, worked out
 * live from the physics. The same solar panels read "makes about 600 W at the
 * Moon" and "makes about 22 W at Jupiter".
 */
import { useRef, useState } from "react";
import type { PartGroup } from "../data/game";
import { findBody, parts, settings } from "../data/game";
import { runChecks } from "../physics/checks";
import { maxFuelKg, partEffect, recommendedFuelKg } from "../physics/partEffects";
import { Checks, ResourceBars } from "../components/ResourceBars";
import Glossary from "../components/Glossary";
import Provenance from "../components/Provenance";
import { useGame, useScenario } from "../store/gameStore";

interface GroupSpec {
  group: PartGroup;
  title: string;
  /** How many may be chosen: one of them, or several. */
  pick: "one" | "many";
  items: { id: string; name: string }[];
}

const GROUPS: GroupSpec[] = [
  { group: "body", title: "Body (the bus)", pick: "one", items: parts.bodies },
  { group: "instruments", title: "Instruments", pick: "many", items: parts.instruments },
  { group: "power", title: "Power", pick: "one", items: parts.powerSources },
  { group: "antenna", title: "Antenna", pick: "one", items: parts.antennas },
  { group: "engine", title: "Engine", pick: "one", items: parts.engines },
  { group: "rocket", title: "Rocket", pick: "one", items: parts.rockets },
];

export default function DesignLab() {
  const scenario = useScenario();
  const design = useGame((state) => state.design);
  const route = useGame((state) => state.route);
  const setPart = useGame((state) => state.setPart);
  const toggleInstrument = useGame((state) => state.toggleInstrument);
  const setFuel = useGame((state) => state.setFuel);
  const loadPreset = useGame((state) => state.loadPreset);
  const go = useGame((state) => state.go);

  /** Which group is open. Fuel is the seventh, so only one thing is ever open. */
  const [open, setOpen] = useState<PartGroup | "fuel" | null>("body");
  const bodyRef = useRef<HTMLDivElement>(null);

  if (!scenario) return null;

  const check = runChecks(design, scenario, route);
  const slots = findBody(design.bodyId)?.slots ?? 0;
  const fuelMax = maxFuelKg(design);

  /** What the accordion head shows on the right when the group is shut. */
  function chosenLabel(spec: GroupSpec): string {
    switch (spec.group) {
      case "body":
        return findBody(design.bodyId)?.name ?? "—";
      case "instruments": {
        const count = design.instrumentIds.length;
        if (count === 0) return "none yet";
        return `${count} of ${slots}`;
      }
      case "power":
        return parts.powerSources.find((p) => p.id === design.powerId)?.name ?? "—";
      case "antenna":
        return parts.antennas.find((a) => a.id === design.antennaId)?.name ?? "—";
      case "engine":
        return parts.engines.find((e) => e.id === design.engineId)?.name ?? "—";
      case "rocket":
        return parts.rockets.find((r) => r.id === design.rocketId)?.name ?? "—";
    }
  }

  function isChosen(spec: GroupSpec, id: string): boolean {
    switch (spec.group) {
      case "body":
        return design.bodyId === id;
      case "instruments":
        return design.instrumentIds.includes(id);
      case "power":
        return design.powerId === id;
      case "antenna":
        return design.antennaId === id;
      case "engine":
        return design.engineId === id;
      case "rocket":
        return design.rocketId === id;
    }
  }

  function choose(spec: GroupSpec, id: string) {
    if (spec.group === "instruments") toggleInstrument(id);
    else setPart(spec.group, id);
  }

  /** Arrow keys walk through the choices in an open group. */
  function onGroupKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button.part:not(:disabled)"),
    );
    const here = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (here === -1) return;
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    buttons[(here + step + buttons.length) % buttons.length]?.focus();
  }

  const instrumentsFull = design.instrumentIds.length >= slots;

  return (
    <div className="screen">
      <div className="spread">
        <div>
          <h2>Design Lab</h2>
          <p className="lead" style={{ margin: 0 }}>
            {scenario.name} — {scenario.goal}. You have <strong>${scenario.budget}M</strong>.
          </p>
        </div>
        <div className="row row--tight">
          <Glossary />
          <button className="btn btn--ghost btn--small" onClick={() => go("choose")}>
            ← Change mission
          </button>
        </div>
      </div>

      <div className="lab">
        {/* ---------------------------------------------- the parts */}
        <div className="accordion">
          {GROUPS.map((spec) => {
            const isOpen = open === spec.group;
            return (
              <div className="acc" key={spec.group}>
                <button
                  className="acc-head"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : spec.group)}
                >
                  <span className="acc-caret" aria-hidden="true">
                    ▶
                  </span>
                  <span>{spec.title}</span>
                  <span className="acc-chosen">{chosenLabel(spec)}</span>
                </button>

                {isOpen && (
                  <div className="acc-body" ref={bodyRef} onKeyDown={onGroupKeyDown}>
                    {spec.group === "instruments" && (
                      <p className="tiny" style={{ margin: 0 }}>
                        This bus has room for {slots}. {instrumentsFull && "It is full — take one off to swap."}
                      </p>
                    )}

                    {spec.items.map((item) => {
                      const chosen = isChosen(spec, item.id);
                      const effect = partEffect(spec.group, item.id, design, scenario, route);
                      const blocked = spec.group === "instruments" && !chosen && instrumentsFull;
                      return (
                        <button
                          key={item.id}
                          className="part"
                          aria-pressed={chosen}
                          disabled={blocked}
                          onClick={() => choose(spec, item.id)}
                        >
                          <span className="part-tick" aria-hidden="true">
                            {chosen ? "◉" : "○"}
                          </span>
                          <span>
                            <span className="part-name">{item.name}</span>
                            {effect && <span className="part-effect">{effect.effect}</span>}
                            {effect?.compare && <span className="part-compare">{effect.compare}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* ---------------------------------------------- fuel */}
          <div className="acc">
            <button
              className="acc-head"
              aria-expanded={open === "fuel"}
              onClick={() => setOpen(open === "fuel" ? null : "fuel")}
            >
              <span className="acc-caret" aria-hidden="true">
                ▶
              </span>
              <span>Fuel</span>
              <span className="acc-chosen mono">{design.fuelKg} kg</span>
            </button>
            {open === "fuel" && (
            <div className="acc-body fuel">
              <input
                className="slider"
                type="range"
                min={0}
                max={Math.max(fuelMax, 1)}
                step={10}
                value={Math.min(design.fuelKg, fuelMax)}
                onChange={(event) => setFuel(Number(event.target.value))}
                aria-label={`Fuel: ${design.fuelKg} kg of a possible ${fuelMax} kg`}
              />
              <div className="spread">
                <span className="tiny">
                  The rocket can lift {fuelMax} kg of fuel on top of this spacecraft.
                </span>
                <button
                  className="btn btn--small"
                  onClick={() => setFuel(recommendedFuelKg(design, scenario, route))}
                >
                  Fill it up
                </button>
              </div>
              <p className="tiny" style={{ margin: 0 }}>
                Fuel costs ${parts.fuelPricePerKg}M per kg, so every extra kilogram is money. The
                checks ask for {Math.round((settings.fuelMargin - 1) * 100)}% more Δv than the bare
                minimum, as a safety margin.
              </p>
            </div>
            )}
          </div>
        </div>

        {/* ---------------------------------------------- the verdict */}
        <div className="col">
          <div className="panel">
            <div className="panel-title">Your spacecraft</div>
            <ResourceBars check={check} />
            <p className="tiny" style={{ margin: "6px 0 8px" }}>
              Science: <strong>{check.science}</strong> points, of which{" "}
              <strong>{check.scienceHome}</strong> reach Earth.
            </p>
            <Checks check={check} />
          </div>

          <div className="panel">
            <button
              className="btn btn--primary"
              style={{ width: "100%", fontSize: 16, padding: "10px 14px" }}
              disabled={!check.allOk}
              onClick={() => go("launch")}
            >
              {check.allOk ? "Go to launch →" : "Fix the problems first"}
            </button>
            <button
              className="btn btn--small"
              style={{ width: "100%", marginTop: 6 }}
              onClick={loadPreset}
              title="Fills in a design we have tested for this mission"
            >
              Load a design that works
            </button>
          </div>
        </div>
      </div>

      <Provenance />
    </div>
  );
}
