/**
 * "Open this mission in NASA's own software."
 *
 * Builds the player's design into a real GMAT script and hands it over as a
 * file. The preview matters as much as the download: it lets you see that the
 * numbers in the file are the numbers you chose, which is the claim the whole
 * feature rests on.
 *
 * The script itself is built by sim/gmatExport.ts, which is pure and tested.
 * The only thing here that is not is the Blob the browser needs to save a file.
 */
import { useState } from "react";
import type { Design, MissionGoal, Route, Scenario } from "../data/game";
import { gmat } from "../data/game";
import { gmatFilename, gmatScript } from "../sim/gmatExport";
import Dialog from "./Dialog";

interface Props {
  design: Design;
  scenario: Scenario;
  route: Route;
  goal?: MissionGoal;
  /** Small and quiet, for a crowded screen. */
  small?: boolean;
}

export default function GmatExport({ design, scenario, route, goal, small }: Props) {
  const [preview, setPreview] = useState(false);

  /* The date is read once, here, and not inside the pure builder — so the same
     design always makes the same file apart from this one line. */
  const script = gmatScript(
    design,
    scenario,
    route,
    goal,
    new Date().toISOString().slice(0, 10),
  );
  const filename = gmatFilename(scenario);

  function save() {
    const blob = new Blob([script], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Freed on the next tick: revoking it immediately can cancel the download
    // in some browsers before they have read the blob.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const lines = script.split("\n").length;

  return (
    <>
      <div className="gmat">
        <div className="gmat-copy">
          <strong>Fly this in NASA's own software</strong>
          <p className="tiny">
            GMAT is the mission design program NASA built at Goddard, and it is free. This saves
            your spacecraft — its real dry mass, fuel load, engine and departure burn — as a GMAT
            script you can open and run.
          </p>
        </div>
        <div className="row row--tight gmat-actions">
          <button
            className={`btn btn--primary${small ? " btn--small" : ""}`}
            onClick={save}
            title={`Saves ${filename}`}
          >
            <span aria-hidden="true">⬇</span> Download GMAT script
          </button>
          <button
            className={`btn btn--ghost${small ? " btn--small" : ""}`}
            onClick={() => setPreview(true)}
          >
            Look at it first
          </button>
        </div>
      </div>

      {preview && (
        <Dialog title="Your mission, as a NASA GMAT script" onClose={() => setPreview(false)}>
          <p className="lead">
            This is the whole file — {lines} lines, written for GMAT {gmat.targetVersion}. The
            numbers in it are the ones you chose, not examples. Download it, open GMAT, and press
            Run.
          </p>
          <pre className="gmat-pre mono">{script}</pre>
          <div className="row row--tight">
            <button className="btn btn--primary btn--small" onClick={save}>
              <span aria-hidden="true">⬇</span> Download {filename}
            </button>
            <a
              className="btn btn--small"
              href="https://software.nasa.gov/software/GSC-18094-1"
              target="_blank"
              rel="noreferrer"
            >
              Get GMAT from NASA ↗
            </a>
          </div>
        </Dialog>
      )}
    </>
  );
}
