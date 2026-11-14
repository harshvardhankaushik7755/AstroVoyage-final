/**
 * The spacecraft you built, turning, in three dimensions.
 *
 * There is no 3D library behind this. `sim/render3d` rotates the corners,
 * throws away the faces pointing the wrong way, divides by distance to get
 * perspective and sorts the rest back to front; this file only turns the
 * polygons that come back into SVG and keeps the angle moving.
 *
 * Drag it to turn it. It spins on its own until you do, and holds still for
 * anyone who has asked for less movement.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Design, ShipPart } from "../data/game";
import { ship3d } from "../data/game";
import { render, shadeColor, svgPoints } from "../sim/render3d";
import { cameraFor, shipFaces } from "../sim/shipModel3d";
import { partName } from "../sim/shipLayout";

interface Props {
  design: Design;
  width: number;
  height: number;
  /** False holds it still: the player has asked for less movement. */
  spinning?: boolean;
}

const PART_LABELS: Record<string, string> = {
  body: "The bus",
  power: "Power",
  antenna: "Antenna",
  instruments: "Instruments",
  engine: "Engine",
};

export default function Ship3D({ design, width, height, spinning = true }: Props) {
  const { view } = ship3d;
  const [yaw, setYaw] = useState(view.startYaw);
  const [pitch, setPitch] = useState(view.startPitch);
  const [hovered, setHovered] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const drag = useRef<{ x: number; y: number } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  /* ---- the model, rebuilt only when the design changes */
  const faces = useMemo(() => shipFaces(design), [design]);
  const camera = useMemo(() => cameraFor(faces), [faces]);

  /* ---- turn it, a steady rate, until somebody takes hold of it */
  useEffect(() => {
    if (!spinning || dragging) return;
    let frame = 0;
    let last = performance.now();
    const perSecond = (Math.PI * 2) / view.secondsPerTurn;

    const step = (now: number) => {
      const seconds = Math.min(0.05, (now - last) / 1000);
      last = now;
      setYaw((current) => current + perSecond * seconds);
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [spinning, dragging, view.secondsPerTurn]);

  /* ---- drag to turn */
  useEffect(() => {
    if (!dragging) return;

    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      drag.current = { x: event.clientX, y: event.clientY };
      setYaw((current) => current + dx * view.dragSensitivity);
      setPitch((current) =>
        Math.min(view.maxPitch, Math.max(view.minPitch, current - dy * view.dragSensitivity)),
      );
    };
    const stop = () => {
      drag.current = null;
      setDragging(false);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging, view.dragSensitivity, view.maxPitch, view.minPitch]);

  const drawn = useMemo(
    () =>
      render(faces, {
        yaw,
        pitch,
        camera,
        light: ship3d.light,
        shading: ship3d.shading,
        centre: { x: width / 2, y: height / 2 },
      }),
    [faces, yaw, pitch, camera, width, height],
  );

  const named = hovered ? partName(design, hovered as ShipPart) : null;

  return (
    <div className="ship3d">
      <svg
        ref={svg}
        className={`ship3d-stage${dragging ? " ship3d-stage--held" : ""}`}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`A turning 3D view of the spacecraft you designed: ${Object.values(PART_LABELS).join(", ").toLowerCase()}. Drag it to turn it.`}
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY };
          setDragging(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") setYaw((current) => current - 0.2);
          if (event.key === "ArrowRight") setYaw((current) => current + 0.2);
          if (event.key === "ArrowUp") setPitch((c) => Math.max(view.minPitch, c - 0.12));
          if (event.key === "ArrowDown") setPitch((c) => Math.min(view.maxPitch, c + 0.12));
        }}
        tabIndex={0}
      >
        <defs>
          <radialGradient id="ship3d-floor">
            <stop offset="0%" stopColor="#4f6ab5" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#4f6ab5" stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* a pool of light under it, so it does not float in a void */}
        <ellipse
          cx={width / 2}
          cy={height * 0.62}
          rx={width * 0.42}
          ry={height * 0.3}
          fill="url(#ship3d-floor)"
        />

        {drawn.map((face, index) => (
          <polygon
            key={index}
            points={svgPoints(face.points)}
            fill={shadeColor(face.color, face.light)}
            stroke={shadeColor(face.color, face.light * 0.7)}
            strokeWidth={0.4}
            strokeLinejoin="round"
            opacity={hovered && hovered !== face.part ? 0.3 : 1}
            onPointerEnter={() => setHovered(face.part)}
            onPointerLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      <p className="ship3d-caption">
        {named ? (
          <>
            <strong>{PART_LABELS[hovered!] ?? hovered}</strong> — {named}
          </>
        ) : (
          <>Drag to turn it. Point at a part to name it.</>
        )}
      </p>
    </div>
  );
}
