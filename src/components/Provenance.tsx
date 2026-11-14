/**
 * "Where the numbers come from" — the footnote that makes the game checkable.
 *
 * Every number is marked as a real formula, a real NASA measurement, or a
 * value we chose to make the game fair, and the first two carry a link to the
 * NASA resource they came from. This is the honest answer to "did you just
 * make this up?", and it takes one click to find.
 */
import { useState } from "react";
import type { NasaSource } from "../data/game";
import { nasaSources } from "../data/game";
import Dialog from "./Dialog";

const GROUPS: { kind: NasaSource["kind"]; heading: string; blurb: string }[] = [
  {
    kind: "formula",
    heading: "Real formula",
    blurb: "Worked out in the game exactly as it is written in a textbook.",
  },
  {
    kind: "real",
    heading: "Real NASA measurement",
    blurb: "A number measured by a real mission or published by NASA.",
  },
  {
    kind: "game",
    heading: "Game value we chose",
    blurb: "Made up by us to keep the game fair and the choices interesting.",
  },
];

export default function Provenance() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="footnote">
        <button className="btn btn--ghost btn--small" onClick={() => setOpen(true)}>
          Where the numbers come from
        </button>
      </div>

      {open && (
        <Dialog title="Where the numbers come from" onClose={() => setOpen(false)}>
          <p className="lead">
            The physics in this game is real. Some of the numbers are measurements from NASA, and some
            we chose ourselves to make the game fair. Here is which is which.
          </p>

          {GROUPS.map((group) => {
            const entries = nasaSources.filter((source) => source.kind === group.kind);
            if (entries.length === 0) return null;
            return (
              <div className="src-group" key={group.kind}>
                <div className="src-kind">{group.heading}</div>
                <p className="tiny">{group.blurb}</p>
                {entries.map((entry) => (
                  <div className="src" key={entry.id}>
                    <div className="src-what">{entry.what}</div>
                    <div className="src-detail">{entry.detail}</div>
                    {entry.url ? (
                      <a className="src-link" href={entry.url} target="_blank" rel="noreferrer">
                        {entry.source} ↗
                      </a>
                    ) : (
                      <span className="src-link tiny">{entry.source}</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </Dialog>
      )}
    </>
  );
}
