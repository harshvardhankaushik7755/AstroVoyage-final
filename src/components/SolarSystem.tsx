/**
 * The solar system that turns on the home page.
 *
 * The layout and the lap times come from `sim/homeSystem`, which is tested;
 * this file only draws them. The turning is a single CSS keyframe per ring,
 * with its duration set from the body's real orbit, so there is no animation
 * loop to run and the stylesheet's reduced-motion rule already stops it dead.
 */
import { useMemo } from "react";
import { homeSystem as config } from "../data/game";
import { buildHomeSystem } from "../sim/homeSystem";

interface Props {
  /** True when the player has asked for no movement: everything holds still. */
  still?: boolean;
  idPrefix?: string;
}

/** A point on a ring, at `angle` degrees round from three o'clock. */
function at(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

export default function SolarSystem({ still = false, idPrefix = "orrery" }: Props) {
  const system = useMemo(() => buildHomeSystem(config), []);
  const { cx, cy, sun } = system;

  const sunGlow = `${idPrefix}-sun`;
  const spin = (lapSeconds: number, origin: { x: number; y: number }) => ({
    animationDuration: `${lapSeconds}s`,
    transformOrigin: `${origin.x}px ${origin.y}px`,
  });

  const probeAt = at(cx, cy, system.probe.orbitRadius, system.probe.startAngle);

  return (
    <svg
      className={`orrery${still ? " orrery--still" : ""}`}
      viewBox={`0 0 ${system.width} ${system.height}`}
      role="img"
      aria-label={system.label}
    >
      <title>{system.label}</title>

      <defs>
        <radialGradient id={sunGlow}>
          <stop offset="0%" stopColor={sun.glowColor} stopOpacity={0.55} />
          <stop offset="45%" stopColor={sun.glowColor} stopOpacity={0.16} />
          <stop offset="100%" stopColor={sun.glowColor} stopOpacity={0} />
        </radialGradient>

        {system.bodies.map((body) => (
          <radialGradient id={`${idPrefix}-${body.id}`} key={body.id}>
            <stop offset="0%" stopColor={body.glowColor} />
            <stop offset="55%" stopColor={body.color} />
            <stop offset="100%" stopColor={body.color} stopOpacity={0.75} />
          </radialGradient>
        ))}
      </defs>

      {/* ---- the dashed rings */}
      <g
        fill="none"
        stroke={config.orbit.color}
        strokeWidth={config.orbit.width}
        strokeDasharray={config.orbit.dash}
        opacity={config.orbit.opacity}
      >
        {system.rings.map((radius) => (
          <circle key={radius} cx={cx} cy={cy} r={radius} />
        ))}
      </g>

      {/* ---- the Sun */}
      <circle cx={cx} cy={cy} r={sun.glowRadius} fill={`url(#${sunGlow})`} />
      <circle cx={cx} cy={cy} r={sun.radius} fill={sun.color} />
      <circle cx={cx} cy={cy} r={sun.radius * 0.62} fill={sun.coreColor} opacity={0.9} />

      {/* ---- the planets */}
      {system.bodies.map((body) => {
        const home = at(cx, cy, body.orbitRadius, body.startAngle);
        const moonAt = body.moon
          ? at(home.x, home.y, body.moon.distance, body.moon.startAngle)
          : null;

        return (
          <g className="orbiting" key={body.id} style={spin(body.lapSeconds, { x: cx, y: cy })}>
            {/* a soft halo, so a 6px dot still reads as a world */}
            <circle cx={home.x} cy={home.y} r={body.radius * 2.1} fill={body.glowColor} opacity={0.12} />
            <circle cx={home.x} cy={home.y} r={body.radius} fill={`url(#${idPrefix}-${body.id})`} />

            {body.bands && body.bandColor && (
              <g opacity={0.5}>
                <clipPath id={`${idPrefix}-clip-${body.id}`}>
                  <circle cx={home.x} cy={home.y} r={body.radius} />
                </clipPath>
                <g clipPath={`url(#${idPrefix}-clip-${body.id})`}>
                  {Array.from({ length: body.bands }, (_, index) => {
                    const step = (body.radius * 2) / (body.bands! + 1);
                    const y = home.y - body.radius + step * (index + 1);
                    return (
                      <rect
                        key={index}
                        x={home.x - body.radius}
                        y={y - step * 0.22}
                        width={body.radius * 2}
                        height={step * 0.44}
                        fill={body.bandColor}
                      />
                    );
                  })}
                </g>
              </g>
            )}

            {body.moon && moonAt && (
              <g className="orbiting" style={spin(body.moon.lapSeconds, home)}>
                <circle cx={moonAt.x} cy={moonAt.y} r={body.moon.radius} fill={body.moon.color} />
              </g>
            )}
          </g>
        );
      })}

      {/* ---- and a spacecraft of our own, pointed the way it is going */}
      <g className="orbiting" style={spin(system.probe.lapSeconds, { x: cx, y: cy })}>
        <g
          transform={`translate(${probeAt.x} ${probeAt.y}) rotate(${system.probe.startAngle + 90})`}
          fill={system.probe.color}
        >
          <circle r={system.probe.size * 2.6} fill={system.probe.color} opacity={0.1} />
          {/* the bus */}
          <rect
            x={-system.probe.size * 0.26}
            y={-system.probe.size * 0.5}
            width={system.probe.size * 0.52}
            height={system.probe.size}
            rx={1}
          />
          {/* two solar panels */}
          <rect
            x={-system.probe.size}
            y={-system.probe.size * 0.26}
            width={system.probe.size * 0.6}
            height={system.probe.size * 0.52}
            opacity={0.75}
          />
          <rect
            x={system.probe.size * 0.4}
            y={-system.probe.size * 0.26}
            width={system.probe.size * 0.6}
            height={system.probe.size * 0.52}
            opacity={0.75}
          />
          {/* the nose, showing which way it flies */}
          <path
            d={`M 0 ${-system.probe.size * 1.1} L ${system.probe.size * 0.3} ${-system.probe.size * 0.45} L ${-system.probe.size * 0.3} ${-system.probe.size * 0.45} Z`}
          />
        </g>
      </g>
    </svg>
  );
}
