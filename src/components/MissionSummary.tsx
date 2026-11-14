/**
 * The spacecraft you built, as one line. It follows the player from the
 * Launch screen onto Mission Control so the machine on the map is never a
 * mystery.
 */
import { findAntenna, findBody, findEngine, findInstruments, findPower, findRocket } from "../data/game";
import type { Design } from "../data/game";
import { ShipSchematic } from "./Spacecraft";

interface Props {
  design: Design;
  /** The live fuel figure, when the mission is flying. Falls back to the loaded amount. */
  fuelKg?: number;
}

export default function MissionSummary({ design, fuelKg }: Props) {
  const body = findBody(design.bodyId);
  const power = findPower(design.powerId);
  const antenna = findAntenna(design.antennaId);
  const engine = findEngine(design.engineId);
  const rocket = findRocket(design.rocketId);
  const instruments = findInstruments(design.instrumentIds);

  const fuel = fuelKg ?? design.fuelKg;

  const bits = [
    body?.name,
    instruments.length > 0 ? instruments.map((i) => i.name).join(" + ") : "no instruments",
    power?.name,
    antenna?.name,
    engine?.name,
  ].filter(Boolean);

  return (
    <div className="summary">
      <span className="summary-ship">
        <ShipSchematic design={design} size={40} />
      </span>
      <span className="summary-parts">{bits.join(" · ")}</span>
      <span className="chip mono">{Math.round(fuel)} kg fuel</span>
      {rocket && <span className="chip">on a {rocket.name}</span>}
    </div>
  );
}
