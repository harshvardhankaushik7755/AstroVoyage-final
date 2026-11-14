/**
 * Draws the spacecraft the player built.
 *
 * `ShipSprite` is the small one that flies across the map. `ShipSchematic` is
 * the bigger one on a challenge card, where a named part can be marked as
 * broken, visibly damaged, or ringed to show what an option would change.
 *
 * The ship is drawn pointing along +x and the caller rotates it.
 */
import type { Design, ShipPart } from "../data/game";
import { shipLayout, spriteHaloRadius, spriteScale } from "../sim/shipLayout";

/** How a part looks once something has happened to it. */
export type Damage = "dust" | "hole" | "dark" | "turned" | null;

interface ShipProps {
  design: Design;
  /** The longest side of the drawing, in pixels. */
  size: number;
  /** The part something has happened to. It is dimmed and marked. */
  hurtPart?: ShipPart | null;
  damage?: Damage;
  /** The part an option would change. It gets a ring, and it is NOT the same as hurtPart. */
  aimPart?: ShipPart | null;
  /** The map sprite glows; the schematic does not. */
  halo?: boolean;
}

const BUS = "#9fb0d0";
const BUS_DARK = "#59688a";
const PANEL = "#2f5db8";
const PANEL_DUSTY = "#6b6150";
const DISH = "#d7dEEB";
const METAL = "#7d8ba6";
const HOT = "#ffb257";

/**
 * One shape of the spacecraft, with the styling that says what has happened
 * to it. Keeping this in one place means a new kind of damage is one branch,
 * not a change in five shapes.
 */
function pieceStyle(part: ShipPart, hurtPart: ShipPart | null, damage: Damage) {
  const hurt = part === hurtPart;
  return {
    hurt,
    /* A fault goes dark; everything else keeps its colour but loses a little life. */
    opacity: hurt && damage === "dark" ? 0.3 : hurt ? 0.78 : 1,
  };
}

function ShipShapes({
  design,
  hurtPart = null,
  damage = null,
  aimPart = null,
}: Omit<ShipProps, "size" | "halo">) {
  const layout = shipLayout(design);
  const { bus, panel, dish, sensors, nozzle } = layout;

  const busStyle = pieceStyle("body", hurtPart, damage);
  const powerStyle = pieceStyle("power", hurtPart, damage);
  const dishStyle = pieceStyle("antenna", hurtPart, damage);
  const sensorStyle = pieceStyle("instruments", hurtPart, damage);
  const engineStyle = pieceStyle("engine", hurtPart, damage);

  /* Dust dulls the panels; that is the one damage that changes a colour. */
  const panelFill = powerStyle.hurt && damage === "dust" ? PANEL_DUSTY : PANEL;

  /* Lost signal turns the dish away from Earth, so it is drawn edge-on. */
  const dishTurned = dishStyle.hurt && damage === "turned";

  const dishX = bus.w / 2 + dish.r * 0.5;

  return (
    <g>
      {/* ---- solar wings, behind the bus */}
      {panel && (
        <g opacity={powerStyle.opacity}>
          {[-1, 1].map((side) => (
            <rect
              key={side}
              x={-panel.width / 2}
              y={side < 0 ? -(bus.h / 2 + panel.length) : bus.h / 2}
              width={panel.width}
              height={panel.length}
              fill={panelFill}
              stroke={BUS_DARK}
              strokeWidth={0.3}
              rx={0.4}
            />
          ))}
        </g>
      )}

      {/* ---- a nuclear battery instead: a finned cylinder on one side */}
      {layout.rtg && (
        <g opacity={powerStyle.opacity}>
          <rect
            x={-bus.w * 0.1}
            y={bus.h / 2}
            width={bus.w * 0.3}
            height={bus.h * 0.7}
            fill={METAL}
            stroke={BUS_DARK}
            strokeWidth={0.3}
            rx={0.6}
          />
          {[0.2, 0.45, 0.7].map((at) => (
            <rect
              key={at}
              x={-bus.w * 0.16}
              y={bus.h / 2 + bus.h * 0.7 * at}
              width={bus.w * 0.42}
              height={0.5}
              fill={BUS_DARK}
            />
          ))}
        </g>
      )}

      {/* ---- the engine bell */}
      <g opacity={engineStyle.opacity}>
        <path
          d={`M ${-bus.w / 2} ${-nozzle.w / 2}
              L ${-bus.w / 2 - nozzle.h} ${-nozzle.w}
              L ${-bus.w / 2 - nozzle.h} ${nozzle.w}
              L ${-bus.w / 2} ${nozzle.w / 2} Z`}
          fill={METAL}
          stroke={BUS_DARK}
          strokeWidth={0.3}
        />
      </g>

      {/* ---- the bus */}
      <g opacity={busStyle.opacity}>
        <rect
          x={-bus.w / 2}
          y={-bus.h / 2}
          width={bus.w}
          height={bus.h}
          fill={BUS}
          stroke={BUS_DARK}
          strokeWidth={0.4}
          rx={0.8}
        />
        {/* a seam, so the box reads as a machine */}
        <line
          x1={-bus.w / 2 + 0.6}
          y1={0}
          x2={bus.w / 2 - 0.6}
          y2={0}
          stroke={BUS_DARK}
          strokeWidth={0.25}
          opacity={0.7}
        />
      </g>

      {/* ---- instrument boxes along the underside */}
      <g opacity={sensorStyle.opacity}>
        {sensors.map((sensor, index) => (
          <rect
            key={index}
            x={-bus.w / 2 + 0.4 + index * (sensor.size + 0.35)}
            y={bus.h / 2}
            width={sensor.size}
            height={sensor.size * 0.7}
            fill={sensorStyle.hurt && damage === "dark" ? BUS_DARK : "#c8d4e8"}
            stroke={BUS_DARK}
            strokeWidth={0.25}
            rx={0.3}
          />
        ))}
      </g>

      {/* ---- the radio dish */}
      <g opacity={dishStyle.opacity}>
        <line
          x1={bus.w / 2}
          y1={0}
          x2={dishX}
          y2={0}
          stroke={METAL}
          strokeWidth={0.4}
        />
        <ellipse
          cx={dishX}
          cy={0}
          /* Turned away, the dish is seen edge-on, so it becomes a sliver. */
          rx={dishTurned ? dish.r * 0.22 : dish.r * 0.5}
          ry={dish.r}
          fill={DISH}
          stroke={BUS_DARK}
          strokeWidth={0.3}
          opacity={0.95}
          transform={dishTurned ? `rotate(38 ${dishX} 0)` : undefined}
        />
      </g>

      {/* ---- a punched hole, where something hit */}
      {hurtPart && damage === "hole" && (
        <g>
          <circle cx={bus.w * 0.18} cy={-bus.h * 0.16} r={bus.w * 0.1} fill="#1a1005" />
          <circle
            cx={bus.w * 0.18}
            cy={-bus.h * 0.16}
            r={bus.w * 0.14}
            fill="none"
            stroke={HOT}
            strokeWidth={0.3}
            opacity={0.8}
          />
        </g>
      )}

      {/* ---- the ring that says "this option changes this part" */}
      {aimPart && <AimRing part={aimPart} design={design} />}
    </g>
  );
}

/** Where on the ship a given part sits, so the aim ring knows where to go. */
function partCentre(design: Design, part: ShipPart): { x: number; y: number; r: number } {
  const layout = shipLayout(design);
  const { bus, panel, dish, nozzle } = layout;
  switch (part) {
    case "body":
      return { x: 0, y: 0, r: Math.max(bus.w, bus.h) * 0.62 };
    case "power":
      return panel
        ? { x: 0, y: -(bus.h / 2 + panel.length / 2), r: panel.length * 0.62 }
        : { x: bus.w * 0.05, y: bus.h * 0.8, r: bus.h * 0.55 };
    case "antenna":
      return { x: bus.w / 2 + dish.r * 0.5, y: 0, r: dish.r * 1.2 };
    case "instruments":
      return { x: -bus.w * 0.1, y: bus.h * 0.62, r: bus.w * 0.5 };
    case "engine":
      return { x: -(bus.w / 2 + nozzle.h * 0.6), y: 0, r: nozzle.w * 1.3 };
  }
}

function AimRing({ part, design }: { part: ShipPart; design: Design }) {
  const { x, y, r } = partCentre(design, part);
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill="none"
      stroke="#5aa9ff"
      strokeWidth={0.45}
      strokeDasharray="1.2 0.9"
      opacity={0.95}
      className="scale-self pulse"
    />
  );
}

/** The small spacecraft that flies across the map. */
export function ShipSprite({
  design,
  size,
  hurtPart = null,
  damage = null,
  halo = true,
}: ShipProps) {
  const layout = shipLayout(design);
  const scale = spriteScale(layout, size);

  return (
    <g aria-hidden="true">
      {halo && (
        <circle
          r={spriteHaloRadius(layout) * scale}
          fill="#5aa9ff"
          opacity={0.16}
        />
      )}
      <g transform={`scale(${scale})`}>
        <ShipShapes design={design} hurtPart={hurtPart} damage={damage} />
      </g>
    </g>
  );
}

/**
 * The bigger drawing on a challenge card. It fills its own box and is turned
 * nose-up, which reads better in a portrait space than nose-right.
 */
export function ShipSchematic({
  design,
  size,
  hurtPart = null,
  damage = null,
  aimPart = null,
}: ShipProps) {
  const layout = shipLayout(design);
  const pad = 2;
  const scale = (size - pad * 2) / Math.max(layout.width, layout.height);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <g transform={`translate(${size / 2} ${size / 2}) rotate(-90) scale(${scale})`}>
        <ShipShapes design={design} hurtPart={hurtPart} damage={damage} aimPart={aimPart} />
      </g>
    </svg>
  );
}
