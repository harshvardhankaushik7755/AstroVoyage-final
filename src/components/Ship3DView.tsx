/**
 * The button that opens the 3D view, and the panel it opens.
 *
 * Kept together so a screen only has to drop in one line, the same way the
 * glossary works.
 */
import { useState } from "react";
import type { Design } from "../data/game";
import { findAntenna, findBody, findEngine, findInstruments, findPower } from "../data/game";
import { useGame } from "../store/gameStore";
import Dialog from "./Dialog";
import Ship3D from "./Ship3D";

interface Props {
  design: Design;
  /** A quieter button where the screen is already busy. */
  small?: boolean;
}

export default function Ship3DView({ design, small = false }: Props) {
  const [open, setOpen] = useState(false);
  const skipAnimations = useGame((state) => state.skipAnimations);

  const body = findBody(design.bodyId);
  const power = findPower(design.powerId);
  const antenna = findAntenna(design.antennaId);
  const engine = findEngine(design.engineId);
  const instruments = findInstruments(design.instrumentIds);

  return (
    <>
      <button
        className={`btn${small ? " btn--small" : ""}`}
        onClick={() => setOpen(true)}
        title="See the spacecraft you built, in 3D"
      >
        <span aria-hidden="true">🛰️</span> See it in 3D
      </button>

      {open && (
        <Dialog title="Your spacecraft, in 3D" onClose={() => setOpen(false)}>
          <Ship3D design={design} width={560} height={248} spinning={!skipAnimations} />

          <div className="ship3d-parts">
            {[
              ["The bus", body?.name],
              ["Power", power?.name],
              ["Antenna", antenna?.name],
              [
                "Instruments",
                instruments.length > 0
                  ? instruments.map((instrument) => instrument.name).join(", ")
                  : "none carried",
              ],
              ["Engine", engine?.name],
            ].map(([label, value]) => (
              <div className="ship3d-part" key={label}>
                <span className="ship3d-part-label">{label}</span>
                <span className="ship3d-part-value">{value ?? "—"}</span>
              </div>
            ))}
          </div>

          <p className="tiny" style={{ margin: "10px 0 0" }}>
            Every size is a real number from your design — the bus from its mass, the wings from the
            watts they make, the dish from how much data it can send. No 3D library:{" "}
            <span className="mono">render3d.ts</span> turns it, lights it and flattens it onto the
            screen.
          </p>
        </Dialog>
      )}
    </>
  );
}
