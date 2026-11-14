/**
 * A world drawn as a lit sphere rather than a flat disc.
 *
 * The bright side always faces the light, which on the flight map is the Sun.
 * That is not decoration: it is why the target shows a different face as it
 * comes round its orbit, the same reason the Moon has phases.
 *
 * Everything it draws — the colours, the bands, the polar cap, how far the
 * highlight sits off centre — comes from `planets.json`.
 */
import { planets } from "../data/game";

interface Props {
  x: number;
  y: number;
  r: number;
  color: string;
  /** Where the light is. The lit side faces this point. */
  lightX: number;
  lightY: number;
  /** A unique suffix for the gradient ids, so two worlds never collide. */
  id: string;
  /** Jupiter's cloud bands. */
  bands?: number;
  bandColor?: string;
  /** Mars's and Earth's ice. */
  polarCap?: boolean;
  capColor?: string;
  /** The Moon's. */
  craters?: number;
  craterColor?: string;
  /** Jupiter's Great Red Spot. */
  spot?: boolean;
  spotColor?: string;
  /** A sun makes its own light: no shadow, and a hot core instead. */
  emissive?: boolean;
  coreColor?: string;
  glowRadius?: number;
}

/** A point on the unit circle, pointing from the world towards the light. */
function towardsLight(x: number, y: number, lightX: number, lightY: number) {
  const dx = lightX - x;
  const dy = lightY - y;
  const length = Math.hypot(dx, dy);
  // A world sitting exactly on the light: light it from the upper left, which
  // is where a reader expects light to come from.
  if (length < 1e-6) return { x: -0.7, y: -0.7 };
  return { x: dx / length, y: dy / length };
}

export default function Planet({
  x,
  y,
  r,
  color,
  lightX,
  lightY,
  id,
  bands = 0,
  bandColor,
  polarCap = false,
  capColor,
  craters = 0,
  craterColor,
  spot = false,
  spotColor,
  emissive = false,
  coreColor,
  glowRadius,
}: Props) {
  const look = planets.light;
  const towards = towardsLight(x, y, lightX, lightY);

  // The highlight sits off centre, on the side facing the light.
  const offset = emissive ? 0 : look.offsetShare;
  const fx = 50 + offset * towards.x * 100;
  const fy = 50 + offset * towards.y * 100;

  const faceId = `${id}-face`;
  const clipId = `${id}-clip`;
  const glowId = `${id}-glow`;

  const lighter = `color-mix(in srgb, ${color} ${Math.round((1 - look.highlight) * 100)}%, white)`;
  const darker = `color-mix(in srgb, ${color} ${Math.round((1 - look.shadow) * 100)}%, black)`;
  const halo = glowRadius ?? r * look.glowShare;

  /* Where the pole is: away from the light's side, so a cap reads as the top. */
  const capY = y - r * 0.72;

  return (
    <g>
      <defs>
        <radialGradient id={faceId} cx="50%" cy="50%" r="50%" fx={`${fx}%`} fy={`${fy}%`}>
          <stop offset="0%" stopColor={emissive ? (coreColor ?? lighter) : lighter} />
          <stop offset={emissive ? "55%" : "48%"} stopColor={color} />
          <stop offset="100%" stopColor={emissive ? color : darker} />
        </radialGradient>

        <radialGradient id={glowId}>
          <stop offset="0%" stopColor={color} stopOpacity={emissive ? 0.5 : 0.32} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>

        <clipPath id={clipId}>
          <circle cx={x} cy={y} r={r} />
        </clipPath>
      </defs>

      {/* ---- the halo, so a small world still reads against the stars */}
      <circle cx={x} cy={y} r={halo} fill={`url(#${glowId})`} />

      {/* ---- the world itself */}
      <circle cx={x} cy={y} r={r} fill={`url(#${faceId})`} />

      <g clipPath={`url(#${clipId})`}>
        {/* ---- banded clouds */}
        {bands > 0 &&
          bandColor &&
          Array.from({ length: bands }, (_, index) => {
            const step = (r * 2) / (bands + 1);
            const bandY = y - r + step * (index + 1);
            return (
              <rect
                key={`band-${index}`}
                x={x - r}
                y={bandY - step * 0.2}
                width={r * 2}
                height={step * 0.4}
                fill={bandColor}
                opacity={0.45}
              />
            );
          })}

        {/* ---- the Great Red Spot, below the middle on the lit side */}
        {spot && spotColor && (
          <ellipse
            cx={x + r * 0.3}
            cy={y + r * 0.22}
            rx={r * 0.26}
            ry={r * 0.15}
            fill={spotColor}
            opacity={0.75}
          />
        )}

        {/* ---- a polar cap */}
        {polarCap && capColor && (
          <ellipse cx={x} cy={capY} rx={r * 0.52} ry={r * 0.3} fill={capColor} opacity={0.8} />
        )}

        {/* ---- craters, placed by a fixed pattern so they never dance about */}
        {craters > 0 &&
          craterColor &&
          Array.from({ length: craters }, (_, index) => {
            const angle = (index / craters) * Math.PI * 2 + 0.7;
            const distance = r * (0.28 + 0.2 * (index % 2));
            return (
              <circle
                key={`crater-${index}`}
                cx={x + Math.cos(angle) * distance}
                cy={y + Math.sin(angle) * distance}
                r={r * (index % 2 === 0 ? 0.17 : 0.11)}
                fill={craterColor}
                opacity={0.45}
              />
            );
          })}

        {/* ---- the terminator: the night side, away from the light */}
        {!emissive && (
          <circle
            cx={x - towards.x * r * 0.55}
            cy={y - towards.y * r * 0.55}
            r={r}
            fill="#02040c"
            opacity={0.42}
          />
        )}
      </g>

      {/* ---- a thin rim, so the edge stays crisp over a bright starfield */}
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke={lighter}
        strokeOpacity={0.3}
        strokeWidth={0.6}
      />
    </g>
  );
}
