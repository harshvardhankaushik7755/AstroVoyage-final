/**
 * The two-second beat that plays over the map just before a challenge card
 * opens, so the trouble is something you *see* happen to your spacecraft
 * rather than a notice that appears.
 *
 * It costs no mission time: the clock is already stopped. A click, Escape, the
 * animations toggle or the system's reduced-motion setting all skip it, and the
 * card is identical either way.
 *
 * Drawn with SVG's own animation elements rather than CSS, so each beat is
 * self-contained and nothing has to be added to the stylesheet to add one.
 */
import { useEffect } from "react";
import type { Beat as BeatKind } from "../sim/context";
import { beatLabel } from "../sim/context";

interface Props {
  beat: BeatKind;
  /** Where the spacecraft is on the map, in the SVG's own units. */
  shipX: number;
  shipY: number;
  /** Where the central body is, so a flare can stream outwards from it. */
  centreX: number;
  centreY: number;
  ms: number;
  onDone: () => void;
}

const ACCENT = "#5aa9ff";
const WARN = "#ffc857";
const GOOD = "#3ddc97";
const DUSTY = "#c6a07a";

export default function Beat({ beat, shipX, shipY, centreX, centreY, ms, onDone }: Props) {
  /* The beat always ends on its own, even if nothing is clicked. */
  useEffect(() => {
    const timer = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(timer);
  }, [ms, onDone]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") onDone();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onDone]);

  const seconds = `${ms / 1000}s`;

  return (
    <g role="img" aria-label={beatLabel(beat)}>
      {beat === "dust" && (
        <g>
          {[0, 1, 2].map((i) => (
            <ellipse
              key={i}
              cx={shipX - 60 - i * 26}
              cy={shipY + (i - 1) * 7}
              rx={30}
              ry={11}
              fill={DUSTY}
              opacity={0.3}
            >
              <animate
                attributeName="cx"
                from={shipX - 60 - i * 26}
                to={shipX + 70}
                dur={seconds}
                fill="freeze"
              />
              <animate attributeName="opacity" values="0;0.4;0.1" dur={seconds} fill="freeze" />
            </ellipse>
          ))}
        </g>
      )}

      {beat === "rock" && (
        <g>
          <g>
            {/* The rock spins about itself — without transform-box it would
                swing around the middle of the map instead. */}
            <polygon
              points="-5,-3 -1,-6 4,-4 6,1 2,5 -4,4"
              fill="#8d7f6e"
              stroke="#5c5146"
              strokeWidth={0.6}
              className="spin-self"
              transform={`translate(${shipX - 90} ${shipY - 50})`}
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                from={`${shipX - 90} ${shipY - 50}`}
                to={`${shipX + 80} ${shipY + 40}`}
                dur={seconds}
                fill="freeze"
                additive="replace"
              />
            </polygon>
          </g>
          <circle cx={shipX} cy={shipY} r={16} fill="none" stroke={WARN} strokeWidth={1} opacity={0}>
            <animate attributeName="opacity" values="0;0;0.9;0" dur={seconds} fill="freeze" />
            <animate attributeName="r" values="10;10;26;34" dur={seconds} fill="freeze" />
          </circle>
        </g>
      )}

      {beat === "dish" && (
        <g>
          <line
            x1={shipX}
            y1={shipY}
            x2={centreX}
            y2={centreY}
            stroke={ACCENT}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.8}
          >
            <animate attributeName="opacity" values="0.8;0.2;0.7;0.05" dur={seconds} fill="freeze" />
            <animate attributeName="stroke-dasharray" values="4 3;2 10;1 20" dur={seconds} fill="freeze" />
          </line>
          <text x={shipX + 14} y={shipY - 12} className="maplabel" fill={WARN} fontSize={11}>
            no signal
            <animate attributeName="opacity" values="0;0;1" dur={seconds} fill="freeze" />
          </text>
        </g>
      )}

      {beat === "flare" && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => {
            const t = (i - 2) * 0.16;
            const dx = shipX - centreX;
            const dy = shipY - centreY;
            const angle = Math.atan2(dy, dx) + t;
            const length = Math.hypot(dx, dy);
            return (
              <line
                key={i}
                x1={centreX}
                y1={centreY}
                x2={centreX + Math.cos(angle) * length}
                y2={centreY + Math.sin(angle) * length}
                stroke={WARN}
                strokeWidth={0.8}
                opacity={0}
              >
                <animate
                  attributeName="opacity"
                  values="0;0.75;0"
                  dur={seconds}
                  begin={`${i * 0.08}s`}
                  fill="freeze"
                />
              </line>
            );
          })}
        </g>
      )}

      {beat === "blink" && (
        <g>
          <circle cx={shipX} cy={shipY} r={5} fill={WARN}>
            <animate attributeName="opacity" values="1;0.1;1;0.1;0.6;0" dur={seconds} fill="freeze" />
          </circle>
          <circle cx={shipX} cy={shipY} r={14} fill="none" stroke={WARN} strokeWidth={0.8} opacity={0.5}>
            <animate attributeName="opacity" values="0.5;0;0.5;0" dur={seconds} fill="freeze" />
          </circle>
        </g>
      )}

      {beat === "light" && (
        <g>
          {[0, 1, 2].map((i) => {
            const dx = shipX - centreX;
            const dy = shipY - centreY;
            const angle = Math.atan2(dy, dx);
            const offset = (i - 1) * 13;
            const fromX = centreX + Math.cos(angle) * 30 - Math.sin(angle) * offset;
            const fromY = centreY + Math.sin(angle) * 30 + Math.cos(angle) * offset;
            return (
              <line
                key={i}
                x1={fromX}
                y1={fromY}
                x2={shipX - Math.sin(angle) * offset}
                y2={shipY + Math.cos(angle) * offset}
                stroke={WARN}
                strokeWidth={0.7}
                opacity={0}
              >
                <animate
                  attributeName="opacity"
                  values="0;0.6;0.2"
                  dur={seconds}
                  begin={`${i * 0.12}s`}
                  fill="freeze"
                />
              </line>
            );
          })}
          <path
            d={`M ${shipX + 18} ${shipY} q 10 0 16 7`}
            fill="none"
            stroke={WARN}
            strokeWidth={1}
            opacity={0}
          >
            <animate attributeName="opacity" values="0;0;0.9" dur={seconds} fill="freeze" />
          </path>
        </g>
      )}

      {beat === "chance" && (
        <g>
          <circle cx={shipX + 70} cy={shipY - 36} r={6} fill="#a89a86" stroke={GOOD} strokeWidth={0.7}>
            <animate attributeName="cx" from={shipX + 100} to={shipX + 40} dur={seconds} fill="freeze" />
            <animate attributeName="cy" from={shipY - 56} to={shipY - 24} dur={seconds} fill="freeze" />
          </circle>
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={shipX + 56 + i * 9}
              cy={shipY - 30 - i * 6}
              r={1.6}
              fill={GOOD}
              opacity={0}
            >
              <animate
                attributeName="opacity"
                values="0;1;0"
                dur={seconds}
                begin={`${0.3 + i * 0.18}s`}
                fill="freeze"
              />
            </circle>
          ))}
        </g>
      )}

      {beat === "alert" && (
        <g>
          <circle cx={shipX} cy={shipY} r={12} fill="none" stroke={WARN} strokeWidth={1.2}>
            <animate attributeName="r" values="8;30;8" dur={seconds} fill="freeze" />
            <animate attributeName="opacity" values="0.9;0.2;0.9" dur={seconds} fill="freeze" />
          </circle>
          <text
            x={shipX}
            y={shipY - 22}
            className="maplabel"
            fill={WARN}
            fontSize={13}
            textAnchor="middle"
          >
            !
          </text>
        </g>
      )}
    </g>
  );
}
