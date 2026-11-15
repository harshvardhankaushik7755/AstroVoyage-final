/**
 * The Mission Design Lab review, on screen.
 *
 * The launch checks beside this ask "does it fit?". This asks the harder
 * question NASA asks: does it still fit once every subsystem has added the
 * contingency it is required to add? A design can pass the checks and fail
 * here, and that design is the whole reason concept reviews exist.
 *
 * It lives behind a button rather than in a panel of its own, because the
 * Design Lab has to fit a 650px-tall window without scrolling and the checks
 * already there are what a player needs first. The verdict rides on the button
 * itself, so the news arrives without a click; the working is one click away.
 *
 * Dumb: the arithmetic is all in physics/margins.ts.
 */
import { useState } from "react";
import type { Design, Route, Scenario } from "../data/game";
import { mdlPolicy } from "../data/game";
import { asPercent, mdlReview } from "../physics/margins";
import Dialog from "./Dialog";

interface Props {
  design: Design;
  scenario: Scenario;
  route: Route;
}

/** A number as the panel shows it: decimals only when the number is small. */
function show(value: number, unit: string): string {
  const places = unit === "km/s" ? 2 : Math.abs(value) < 10 ? 1 : 0;
  return value.toFixed(places);
}

export default function MdlReview({ design, scenario, route }: Props) {
  const [open, setOpen] = useState(false);
  const [why, setWhy] = useState(false);
  const review = mdlReview(design, scenario, route);

  const tone = review.verdict === "closes" ? "ok" : review.verdict === "tight" ? "warn" : "bad";

  return (
    <>
      <button
        className="btn btn--ghost btn--small mdl-trigger"
        onClick={() => setOpen(true)}
        title="How NASA's Mission Design Lab would review this spacecraft"
      >
        <span aria-hidden="true">📋</span> NASA Design Review
        <span className={`chip mdl-verdict mdl-verdict--${tone}`}>{review.verdictText.label}</span>
      </button>

      {open && (
        <Dialog title="NASA Design Review" onClose={() => setOpen(false)}>
          <p className="lead">
            NASA's {mdlPolicy.lab} never signs off the first number an engineer writes down. Every
            number gets a safety margin added, and then the design has to <em>still</em> fit. Here
            is your spacecraft, reviewed that way.
          </p>

          <div className={`mdl-banner mdl-banner--${tone}`}>
            <strong>{review.verdictText.label}</strong>
            <span>
              {review.closesCount} of {review.rows.length} subsystems fit once NASA's margin is
              added.
            </span>
            <p>{review.verdictText.plain}</p>
          </div>

          <div className="mdl-legend tiny">
            <span>
              <strong>Today</strong> what you built
            </span>
            <span aria-hidden="true">→</span>
            <span>
              <strong>Grown</strong> with NASA's margin
            </span>
            <span aria-hidden="true">vs</span>
            <span>
              <strong>Limit</strong> what the hardware allows
            </span>
          </div>

          <div className="mdl-rows">
            {review.rows.map((row) => (
              <div className={`mdl-row mdl-row--${row.tone}`} key={row.id}>
                <div className="mdl-row-head">
                  <span className="mdl-mark" aria-hidden="true">
                    {row.closes ? "✓" : "✕"}
                  </span>
                  <span className="mdl-row-name">
                    {row.label}
                    <span className="tiny"> · {row.subsystem}</span>
                  </span>
                  <span className="mdl-row-margin">
                    {row.closes ? `${asPercent(row.margin)} spare` : "does not fit"}
                  </span>
                </div>

                <div className="mdl-nums">
                  <span className="mdl-num">
                    <span className="mdl-num-label">Today</span>
                    <span className="mdl-num-val">{show(row.cbe, row.unit)}</span>
                  </span>
                  <span className="mdl-arrow" aria-hidden="true">
                    +{Math.round(row.percent * 100)}% →
                  </span>
                  <span className="mdl-num">
                    <span className="mdl-num-label">Grown</span>
                    <span className="mdl-num-val mdl-num-val--mev">{show(row.mev, row.unit)}</span>
                  </span>
                  <span className="mdl-arrow" aria-hidden="true">
                    vs
                  </span>
                  <span className="mdl-num">
                    <span className="mdl-num-label">Limit</span>
                    <span className="mdl-num-val">{show(row.mpv, row.unit)}</span>
                  </span>
                  <span className="mdl-unit">{row.unit}</span>
                </div>

                <p className="mdl-msg">{row.message}</p>
              </div>
            ))}
          </div>

          {/* ---- the whole spacecraft, and the pile-up */}
          <div className={`mdl-total${review.pileUp ? " mdl-total--warn" : ""}`}>
            <div className="mdl-total-row">
              <span>Whole spacecraft, sized for this trip</span>
              <strong>
                {Math.round(review.cbeLaunchMass)} kg → {Math.round(review.mevLaunchMass)} kg
              </strong>
            </div>
            <div className="mdl-total-row">
              <span>Composite contingency</span>
              <strong>{asPercent(review.compositeContingency)}</strong>
            </div>
            <p className="tiny">
              {review.pileUp ? (
                <>
                  <strong>{mdlPolicy.pileUp.title}.</strong> {mdlPolicy.pileUp.plain}
                </>
              ) : (
                <>
                  Bigger than the{" "}
                  {Math.round(
                    (review.rows.find((row) => row.id === "mass")?.percent ?? 0.25) * 100,
                  )}
                  % added to the dry mass alone, because a heavier spacecraft needs more fuel — and
                  fuel is mass too.
                </>
              )}
            </p>
          </div>

          {/* ---- the receipts, in the same dialog: a second modal on top of
                 this one would trap a keyboard player behind two backdrops. */}
          <button
            className="btn btn--ghost btn--small mdl-why"
            aria-expanded={why}
            onClick={() => setWhy(!why)}
          >
            {why ? "▾" : "▸"} Where these percentages come from
          </button>

          {why && (
            <div className="mdl-why-body">
              <p className="tiny">
                Every percentage in this review is quoted from one NASA paper, which writes down the
                margins the {mdlPolicy.lab} adds, subsystem by subsystem.
              </p>

              {mdlPolicy.contingencies.map((entry) => (
                <div className="src" key={entry.id}>
                  <div className="src-what">
                    +{Math.round(entry.percent * 100)}% on {entry.label.toLowerCase()} ·{" "}
                    {entry.subsystem}
                  </div>
                  <div className="src-detail">
                    {entry.plain} Applies to: {entry.appliesTo}
                  </div>
                  <div className="src-detail res-quote">“{entry.quote}”</div>
                </div>
              ))}

              <div className="src">
                <div className="src-what">{mdlPolicy.pileUp.title}</div>
                <div className="src-detail">{mdlPolicy.pileUp.example}</div>
              </div>

              <div className="src">
                <div className="src-what">The four margin formulas</div>
                {mdlPolicy.formulas.map((formula) => (
                  <div className="src-detail" key={formula.id}>
                    <code className="mono">
                      {formula.label} = {formula.expression}
                    </code>
                    <br />
                    {formula.plain}
                  </div>
                ))}
              </div>

              <a
                className="src-link"
                href="https://ntrs.nasa.gov/citations/20120013284"
                target="_blank"
                rel="noreferrer"
              >
                Karpati, Hyde, Peabody &amp; Garrison, “Resource Management and Contingencies in
                Aerospace Concurrent Engineering”, NASA Goddard, 2012 ↗
              </a>
              <p className="tiny">{mdlPolicy.expectedMarginSource}</p>
            </div>
          )}

          <p className="tiny mdl-foot">
            {mdlPolicy.lab} · {mdlPolicy.phase}
          </p>
        </Dialog>
      )}
    </>
  );
}
