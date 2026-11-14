/**
 * The "?" button. A word list in simple English, because the Design Lab has
 * to use words like Δv and Isp and a 12-year-old has met neither.
 */
import { useState } from "react";
import { glossary } from "../data/game";
import Dialog from "./Dialog";

export default function Glossary() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="btn btn--small btn--icon"
        onClick={() => setOpen(true)}
        aria-label="What do these words mean?"
        title="What do these words mean?"
      >
        ?
      </button>

      {open && (
        <Dialog title="What do these words mean?" onClose={() => setOpen(false)}>
          <div className="deflist">
            {glossary.map((entry) => (
              <div className="def" key={entry.term}>
                <div className="def-term">{entry.term}</div>
                <div className="def-meaning">{entry.meaning}</div>
              </div>
            ))}
          </div>
        </Dialog>
      )}
    </>
  );
}
