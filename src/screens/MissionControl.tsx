/**
 * Mission Control: the flight map, six gauges, the mission clock and the
 * challenges as they arrive.
 *
 * A few decisions worth knowing about:
 *
 *  - The map shows a short fading lead ahead of the spacecraft, not a full rail
 *    out to the target. A rail promises an arrival the engine might not deliver.
 *    The whole plan is a toggle, off by default.
 *  - A challenge plays a two-second beat over the map before the card opens, so
 *    the trouble happens to the spacecraft rather than being announced. It costs
 *    no mission time, because the clock is already stopped.
 *  - After a successful arrival the planets keep going round and the spacecraft
 *    rides the orbit it reached. Nothing in space stops.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { settings } from "../data/game";
import type { Beat as BeatKind } from "../sim/context";
import { beatFor, damageFor, optionPart } from "../sim/context";
import { mapGeometry } from "../sim/mapScale";
import {
  isOver,
  powerNow,
  progressOf,
  remainingDeltaV,
  safestOption,
  scaleLabel,
} from "../sim/simulation";
import { findEventDef } from "../data/game";
import Beat from "../components/Beat";
import Dialog from "../components/Dialog";
import Gauge from "../components/Gauge";
import MissionSummary from "../components/MissionSummary";
import Starfield from "../components/Starfield";
import Timeline from "../components/Timeline";
import { ShipSchematic, ShipSprite } from "../components/Spacecraft";
import { reducedMotion } from "../App";
import { useGame } from "../store/gameStore";

/** Which gauge each of the engine's own words belongs to. */
const GAUGE_WORDS: { key: string; match: RegExp }[] = [
  { key: "fuel", match: /fuel/i },
  { key: "science", match: /science/i },
  { key: "power", match: /power/i },
  { key: "signal", match: /signal/i },
  { key: "days", match: /day/i },
  { key: "risk", match: /risk/i },
];

export default function MissionControl() {
  const sim = useGame((state) => state.sim);
  const setSpeed = useGame((state) => state.setSpeed);
  const answer = useGame((state) => state.answer);
  const doInsertion = useGame((state) => state.doInsertion);
  const go = useGame((state) => state.go);
  const skipAnimations = useGame((state) => state.skipAnimations);

  const mapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 860, h: 520 });
  const [coastDays, setCoastDays] = useState(0);

  const [beat, setBeat] = useState<BeatKind | null>(null);
  const beatShownFor = useRef<string | null>(null);

  const [countdown, setCountdown] = useState(settings.decisionSeconds);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [logWhy, setLogWhy] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, string>>({});

  const firstOption = useRef<HTMLButtonElement>(null);

  /* ------------------------------------------------- the map's real size */
  useEffect(() => {
    const element = mapRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const box = element.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) {
        setSize({ w: Math.round(box.width), h: Math.round(box.height) });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* ----------------------------------------------------- the clock, in one
     requestAnimationFrame loop. It reads the store directly so the loop is
     started once and never torn down and rebuilt mid-flight. */
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      // Cap the step so a backgrounded tab does not jump the mission forward.
      const seconds = Math.min(0.1, (now - last) / 1000);
      last = now;
      const state = useGame.getState();
      const current = state.sim;
      if (current) {
        if (current.phase === "cruise") {
          state.tick(seconds);
        } else if (current.phase === "orbit" && !reducedMotion()) {
          setCoastDays((days) => days + seconds * current.daysPerSecond);
        }
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  /* ------------------------------------------- the beat, before the card */
  const pendingKey = sim?.pendingEvent ? `${sim.pendingEvent.defId}@${sim.pendingEvent.day}` : null;

  useEffect(() => {
    if (!pendingKey || !sim?.pendingEvent) return;
    if (beatShownFor.current === pendingKey) return;
    beatShownFor.current = pendingKey;
    if (skipAnimations || reducedMotion()) return;
    setBeat(beatFor(sim.pendingEvent.defId));
  }, [pendingKey, sim?.pendingEvent, skipAnimations]);

  const endBeat = useCallback(() => setBeat(null), []);

  /* --------------------------------------- the 20-second decision clock.
     It only starts once the beat is over, so the beat never eats the time. */
  const cardKey = beat === null ? pendingKey : null;

  useEffect(() => {
    if (!cardKey) return;
    setCountdown(settings.decisionSeconds);
    const timer = window.setInterval(() => {
      setCountdown((left) => Math.max(0, left - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cardKey]);

  useEffect(() => {
    if (!cardKey || countdown > 0) return;
    const current = useGame.getState().sim;
    if (current?.pendingEvent) answer(safestOption(current.pendingEvent));
  }, [cardKey, countdown, answer]);

  /* The card takes focus when it opens — after the beat, not during it. */
  useEffect(() => {
    if (!cardKey) return;
    setShowWhy(false);
    setHovered(null);
    firstOption.current?.focus();
  }, [cardKey]);

  /* ------------------------------- deltas on the gauges, in the engine's
     own words: whatever the decision's chips said. */
  const decisionCount = sim?.decisions.length ?? 0;
  useEffect(() => {
    const current = useGame.getState().sim;
    const last = current?.decisions.at(-1);
    if (!last || decisionCount === 0) return;

    const next: Record<string, string> = {};
    for (const chip of last.chips) {
      const word = GAUGE_WORDS.find((candidate) => candidate.match.test(chip.text));
      if (word) next[word.key] = chip.text;
    }
    if (Object.keys(next).length === 0) return;
    setFlash(next);
    const timer = window.setTimeout(() => setFlash({}), settings.effectMs);
    return () => window.clearTimeout(timer);
  }, [decisionCount]);

  /* ----------------------------------------- the braking burn at arrival */
  useEffect(() => {
    if (sim?.phase !== "insertion") return;
    const timer = window.setTimeout(doInsertion, settings.burnHoldMs);
    return () => window.clearTimeout(timer);
  }, [sim?.phase, doInsertion]);

  const geometry = useMemo(
    () => (sim ? mapGeometry(sim, size.w, size.h, coastDays) : null),
    [sim, size.w, size.h, coastDays],
  );

  if (!sim || !geometry) return null;

  const progress = progressOf(sim);
  const over = isOver(sim);
  const event = beat === null ? sim.pendingEvent : null;
  const hurtPart = sim.pendingEvent?.affectsPart ?? null;
  const damage = sim.pendingEvent ? damageFor(sim.pendingEvent.defId) : null;
  const aimPart = hovered && sim.pendingEvent ? optionPart(sim.pendingEvent.defId, hovered) : null;

  /* ---- the trail: where it has been, where it is, and the arc it rides now */
  const trail = [
    ...geometry.pathPx.slice(0, geometry.flown + 1),
    geometry.ship,
    ...geometry.coastPath,
  ];
  const trailPoints = trail.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  /* ---- a short fading lead ahead, rather than a rail all the way there */
  const leadEnd = Math.min(geometry.pathPx.length - 1, geometry.flown + 9);
  const lead = geometry.pathPx.slice(geometry.flown, leadEnd + 1);
  const leadPoints = lead.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  const planPoints = geometry.pathPx
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(" ");

  const barY = size.h - 18;
  const signalLost = sim.startSignalFactor - sim.signalFactor;
  const whyDef = logWhy ? findEventDef(logWhy) : null;

  return (
    <>
      <div className="clockbar" style={{ marginBottom: 8 }}>
        <span className="clock">
          Day {Math.floor(sim.missionDay)} of {sim.totalDays}
        </span>
        <span className="scale">· {scaleLabel(sim.daysPerSecond)}</span>
        <Timeline phase={sim.phase} progress={progress} />
        <span className="speeds">
          {over ? (
            <button className="btn btn--primary btn--small" onClick={() => go("result")}>
              See the results →
            </button>
          ) : (
            [0, 1, 4].map((speed) => (
              <button
                key={speed}
                className="btn btn--small"
                aria-pressed={sim.speed === speed}
                disabled={sim.pendingEvent !== null || sim.phase !== "cruise"}
                onClick={() => setSpeed(speed)}
              >
                {speed === 0 ? "Pause" : `${speed}x`}
              </button>
            ))
          )}
        </span>
      </div>

      <div className="control">
        {/* ================================================= the flight map */}
        <div className="mapwrap" ref={mapRef}>
          <svg viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="xMidYMid slice">
            <Starfield width={size.w} height={size.h} />

            {/* ---- the orbits */}
            <circle
              cx={geometry.cx}
              cy={geometry.cy}
              r={geometry.startRadiusPx}
              fill="none"
              stroke="#2b3a5c"
              strokeWidth={0.8}
            />
            <circle
              cx={geometry.cx}
              cy={geometry.cy}
              r={geometry.targetRadiusPx}
              fill="none"
              stroke="#3a4a72"
              strokeWidth={0.8}
              strokeDasharray="3 4"
              opacity={0.8}
            />

            {/* ---- the whole plan, only if asked for */}
            {showPlan && (
              <polyline
                points={planPoints}
                fill="none"
                stroke="#5aa9ff"
                strokeWidth={0.8}
                strokeDasharray="2 5"
                opacity={0.35}
              />
            )}

            {/* ---- the central body */}
            {sim.config.centralBody === "sun" ? (
              <g>
                <circle cx={geometry.cx} cy={geometry.cy} r={13} fill="#ffd27d" />
                <circle cx={geometry.cx} cy={geometry.cy} r={22} fill="#ffd27d" opacity={0.18} />
                <text
                  x={geometry.cx}
                  y={geometry.cy + 34}
                  className="maplabel"
                  textAnchor="middle"
                >
                  Sun
                </text>
              </g>
            ) : (
              <g>
                <circle cx={geometry.cx} cy={geometry.cy} r={11} fill="#4b86d8" />
                <circle cx={geometry.cx} cy={geometry.cy} r={11} fill="#2f6bbd" opacity={0.5} />
                <text
                  x={geometry.cx}
                  y={geometry.cy + 30}
                  className="maplabel"
                  textAnchor="middle"
                >
                  Earth
                </text>
              </g>
            )}

            {/* ---- the departure body, when it is not the centre */}
            {sim.config.centralBody === "sun" && (
              <g>
                <circle cx={geometry.earth.x} cy={geometry.earth.y} r={6} fill="#4b86d8" />
                <text
                  x={geometry.earth.x}
                  y={geometry.earth.y - 11}
                  className="maplabel"
                  textAnchor="middle"
                >
                  Earth
                </text>
              </g>
            )}

            {/* ---- the target */}
            <g>
              <circle
                cx={geometry.target.x}
                cy={geometry.target.y}
                r={9}
                fill={sim.config.color}
              />
              <circle
                cx={geometry.target.x}
                cy={geometry.target.y}
                r={15}
                fill={sim.config.color}
                opacity={0.16}
              />
              <text
                x={geometry.target.x}
                y={geometry.target.y - 15}
                className="maplabel maplabel--bright"
                textAnchor="middle"
              >
                {sim.config.target}
              </text>
            </g>

            {/* ---- the trail, and the short lead ahead of it */}
            <polyline points={trailPoints} fill="none" stroke="#7ee8c8" strokeWidth={1.4} opacity={0.85} />
            {!over && (
              <polyline
                points={leadPoints}
                fill="none"
                stroke="#7ee8c8"
                strokeWidth={1.2}
                strokeDasharray="2 3"
                opacity={0.32}
              />
            )}

            {/* ---- one marker per mission day flown, so the pace is visible */}
            {geometry.pathPx
              .filter((_, index) => index % 15 === 0 && index <= geometry.flown)
              .map((point, index) => (
                <circle key={index} cx={point.x} cy={point.y} r={1.1} fill="#7ee8c8" opacity={0.5} />
              ))}

            {/* ---- the spacecraft you built */}
            <g transform={`translate(${geometry.ship.x} ${geometry.ship.y})`}>
              <ShipSprite design={sim.design} size={26} hurtPart={hurtPart} damage={damage} />
            </g>

            {/* ---- the braking burn */}
            {sim.phase === "insertion" && (
              <g>
                <circle
                  cx={geometry.ship.x}
                  cy={geometry.ship.y}
                  r={20}
                  fill="none"
                  stroke="#ffb257"
                  strokeWidth={1.5}
                  className="pulse"
                />
                <text
                  x={geometry.ship.x}
                  y={geometry.ship.y + 34}
                  className="maplabel maplabel--bright"
                  textAnchor="middle"
                >
                  Braking burn
                </text>
              </g>
            )}

            {/* ---- the beat, over everything on the map */}
            {beat && (
              <Beat
                beat={beat}
                shipX={geometry.ship.x}
                shipY={geometry.ship.y}
                centreX={geometry.cx}
                centreY={geometry.cy}
                ms={settings.beatMs}
                onDone={endBeat}
              />
            )}

            {/* ---- the scale bar, measured from the map's own AU-to-pixel factor */}
            <g>
              <line
                x1={22}
                y1={barY}
                x2={22 + geometry.scaleBar.px}
                y2={barY}
                stroke="#9aa8c7"
                strokeWidth={1.2}
              />
              <line x1={22} y1={barY - 3} x2={22} y2={barY + 3} stroke="#9aa8c7" strokeWidth={1.2} />
              <line
                x1={22 + geometry.scaleBar.px}
                y1={barY - 3}
                x2={22 + geometry.scaleBar.px}
                y2={barY + 3}
                stroke="#9aa8c7"
                strokeWidth={1.2}
              />
              <text x={22} y={barY - 7} className="maplabel">
                {geometry.scaleBar.label}
              </text>
              {/* How long it has been in orbit. On the map, so the status line
                  below is never squeezed. */}
              {sim.phase === "orbit" && coastDays > 1 && (
                <text x={22} y={barY - 25} className="maplabel maplabel--bright">
                  In orbit for {Math.floor(coastDays)} days
                </text>
              )}
            </g>
          </svg>

          {/* ---- a click anywhere skips the beat */}
          {beat && (
            <button
              onClick={endBeat}
              aria-label="Skip"
              style={{
                position: "absolute",
                inset: 0,
                background: "transparent",
                border: 0,
                cursor: "pointer",
              }}
            />
          )}

          {/* ================================================ the challenge */}
          {event && (
            <div className="eventwrap">
              <div
                className={`event fade-up ${event.kind === "opportunity" ? "event--opportunity" : ""}`}
                role="alertdialog"
                aria-label={event.name}
              >
                <div className="event-head">
                  <span className={`event-kind event-kind--${event.kind}`}>
                    {event.kind === "opportunity" ? "Opportunity" : "Problem"}
                  </span>
                  <strong>{event.name}</strong>
                  <span
                    className={`event-countdown ${countdown <= 5 ? "event-countdown--urgent" : ""}`}
                    role="timer"
                  >
                    {countdown}s
                  </span>
                </div>

                {/* The spacecraft sits beside the text, not under it, so three
                    options still fit on the card without scrolling. */}
                <div className="event-body">
                  <div>
                    <p className="event-explain">{event.explain}</p>
                    {event.isProtected && event.protectedText && (
                      <span className="chip chip--good">{event.protectedText}</span>
                    )}
                    <button className="event-why" onClick={() => setShowWhy((open) => !open)}>
                      {showWhy ? "▾" : "▸"} Why does this happen?
                    </button>
                  </div>

                  <div className="event-ship">
                    <ShipSchematic
                      design={sim.design}
                      size={92}
                      hurtPart={hurtPart}
                      damage={damage}
                      aimPart={aimPart}
                    />
                    {hurtPart && (
                      <span className="tiny" style={{ textAlign: "center" }}>
                        your {hurtPart === "body" ? "spacecraft body" : hurtPart}
                      </span>
                    )}
                  </div>
                </div>

                {showWhy && (
                  <div className="event-teach">
                    <p className="lead" style={{ margin: 0 }}>
                      {event.whatIsIt}
                    </p>
                    <p className="tiny" style={{ margin: 0 }}>
                      <strong>Real story:</strong> {event.realExample}
                    </p>
                    <span className="chip">How common: {event.howCommon}</span>
                  </div>
                )}

                <div className="event-options">
                  {event.options.map((option, index) => (
                    <button
                      key={option.id}
                      ref={index === 0 ? firstOption : undefined}
                      className="option"
                      onClick={() => answer(option.id)}
                      onMouseEnter={() => setHovered(option.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(option.id)}
                      onBlur={() => setHovered(null)}
                    >
                      <span className="option-label">{option.label}</span>
                      <span className="option-chips">
                        {option.chips.map((chip) => (
                          <span
                            key={chip.text}
                            className={`chip ${chip.tone === "good" ? "chip--good" : chip.tone === "bad" ? "chip--bad" : ""}`}
                          >
                            {chip.text}
                          </span>
                        ))}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="tiny" style={{ margin: "6px 0 0" }}>
                  The clock is stopped. If it runs out we take the safest option.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* =================================================== the gauges */}
        <div className="col" style={{ minHeight: 0 }}>
          <div className="gauges">
            <Gauge
              icon="⛽"
              name="Fuel"
              value={`${Math.round(sim.fuelKg)} kg`}
              fraction={sim.startFuelKg > 0 ? sim.fuelKg / sim.startFuelKg : 0}
              delta={flash.fuel ?? null}
            />
            <Gauge
              icon="⚡"
              name="Power"
              value={`${Math.round(powerNow(sim))} W`}
              fraction={sim.powerFactor}
              delta={flash.power ?? null}
              mark={
                sim.powerFactor < 0.999
                  ? `${Math.round((1 - sim.powerFactor) * 100)}% of the power is gone`
                  : null
              }
              tone={sim.powerFactor < 0.999 ? "warn" : undefined}
            />
            <Gauge
              icon="📡"
              name="Signal"
              value={`${Math.round(sim.signalFactor * 100)}%`}
              fraction={sim.signalFactor}
              delta={flash.signal ?? null}
              mark={
                signalLost > 0.001
                  ? `${Math.round(signalLost * 100)}% of the signal is gone`
                  : null
              }
              tone={signalLost > 0.001 ? "warn" : undefined}
            />
            <Gauge
              icon="🔬"
              name="Science"
              value={`${sim.scienceCollected} / ${sim.scienceMax}`}
              fraction={sim.scienceMax > 0 ? sim.scienceCollected / sim.scienceMax : 0}
              delta={flash.science ?? null}
              deltaTone={flash.science?.startsWith("+") ? "up" : "down"}
            />
            <Gauge
              icon="📅"
              name="Days"
              value={`${Math.floor(sim.missionDay)} / ${sim.totalDays}`}
              fraction={progress}
              delta={flash.days ?? null}
            />
            <Gauge
              icon="🎯"
              name="Risk at arrival"
              value={`${Math.round(sim.insertionRisk * 100)}%`}
              fraction={sim.insertionRisk}
              delta={flash.risk ?? null}
              tone={sim.insertionRisk > 0 ? "bad" : "good"}
              mark={
                remainingDeltaV(sim) < sim.config.insertionDeltaV
                  ? "Not enough fuel left to brake"
                  : null
              }
            />
          </div>

          <button className="btn btn--small" onClick={() => setShowPlan((open) => !open)}>
            {showPlan ? "Hide the planned path" : "Show the planned path"}
          </button>

          <MissionSummary design={sim.design} fuelKg={sim.fuelKg} />
        </div>
      </div>

      {/* ===================================================== the log */}
      <div className="log" style={{ marginTop: 8 }}>
        {sim.log.slice(-3).map((line, index) => (
          <div className={`log-line log-line--${line.tone}`} key={`${line.day}-${index}`}>
            <span className="log-day">Day {Math.floor(line.day)}</span>
            <span>{line.text}</span>
            {line.defId && (
              <button
                className="log-why"
                onClick={() => setLogWhy(line.defId!)}
                aria-label={`Why did ${line.text} happen?`}
              >
                ℹ
              </button>
            )}
          </div>
        ))}
      </div>

      {whyDef && (
        <Dialog title={whyDef.name} onClose={() => setLogWhy(null)}>
          <p>{whyDef.whatIsIt}</p>
          <p className="lead">
            <strong>Real story:</strong> {whyDef.realExample}
          </p>
          <span className="chip">How common: {whyDef.howCommon}</span>
        </Dialog>
      )}
    </>
  );
}
