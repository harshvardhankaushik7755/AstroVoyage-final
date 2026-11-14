/**
 * The sky behind the mission.
 *
 * Returns a bare <g>, so the caller drops it in as the first child of the map's
 * own SVG and everything else is drawn on top. Deliberately no blend modes:
 * `mix-blend-mode: screen` on the Milky Way band looks lovely on its own and
 * washes out the whole map once the planets are over it.
 */
import { useMemo } from "react";
import { sky as skyConfig } from "../data/game";
import { buildSky } from "../sim/sky";

interface Props {
  width: number;
  height: number;
  /** A suffix for the gradient ids, so two maps on one page never collide. */
  idPrefix?: string;
}

export default function Starfield({ width, height, idPrefix = "sky" }: Props) {
  // Seeded and pure, so this only recomputes when the map is resized.
  const sky = useMemo(() => buildSky(width, height, skyConfig), [width, height]);

  const bandId = `${idPrefix}-band`;
  const glowId = `${idPrefix}-glow`;

  return (
    <g aria-hidden="true">
      <defs>
        <linearGradient id={bandId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky.band.edgeColor} stopOpacity={0} />
          <stop offset="50%" stopColor={sky.band.color} stopOpacity={skyConfig.milkyWay.peakAlpha} />
          <stop offset="100%" stopColor={sky.band.edgeColor} stopOpacity={0} />
        </linearGradient>
        <radialGradient id={glowId}>
          <stop offset="0%" stopColor="#9fb0e8" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#9fb0e8" stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* ---- the Milky Way, a soft band across the picture */}
      <g
        opacity={sky.band.opacity}
        transform={`rotate(${sky.band.angleDeg} ${width / 2} ${height / 2})`}
      >
        <rect
          x={-width}
          y={height / 2 - sky.band.width / 2}
          width={width * 3}
          height={sky.band.width}
          fill={`url(#${bandId})`}
        />
      </g>

      {/* ---- far nebulae, along the edges */}
      {sky.nebulae.map((blob, index) => (
        <circle
          key={`neb-${index}`}
          cx={blob.x}
          cy={blob.y}
          r={blob.r}
          fill={`url(#${glowId})`}
          opacity={blob.opacity}
        />
      ))}

      {/* ---- far galaxies, in the corners */}
      {sky.galaxies.map((blob, index) => (
        <g key={`gal-${index}`} opacity={blob.opacity}>
          <ellipse
            cx={blob.x}
            cy={blob.y}
            rx={blob.r}
            ry={blob.r * 0.42}
            fill={`url(#${glowId})`}
            transform={`rotate(${index % 2 === 0 ? 28 : -34} ${blob.x} ${blob.y})`}
          />
          <circle cx={blob.x} cy={blob.y} r={blob.r * 0.18} fill="#cfd8f5" opacity={0.6} />
        </g>
      ))}

      {/* ---- the stars */}
      {sky.stars.map((star, index) => (
        <circle
          key={`star-${index}`}
          cx={star.x}
          cy={star.y}
          r={star.size}
          fill={star.tinted ? "#bcd0ff" : skyConfig.starColor}
          opacity={star.opacity}
        />
      ))}
    </g>
  );
}
