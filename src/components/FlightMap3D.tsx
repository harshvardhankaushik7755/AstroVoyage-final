/**
 * The mission, seen from a camera that can stand anywhere.
 *
 * Three ways to watch it:
 *
 *   Orbit   swing right round the whole mission, looking at the Sun
 *   Track   hang back, but keep the spacecraft in the middle of the frame
 *   Follow  ride astern of the spacecraft and look where it is going
 *
 * The camera turns by itself. Drag to take hold of it; let go and it carries
 * on. The arithmetic is all in `sim/flight3d` and `sim/render3d`, so this file
 * only turns points into SVG.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { flight3d, planets, worldLook } from "../data/game";
import {
  CAMERA_MODES,
  buildScene,
  cameraFor,
  starSphere,
  startingPitch,
} from "../sim/flight3d";
import type { CameraMode } from "../sim/flight3d";
import { projectPath, projectView, sizeAt, viewBasis } from "../sim/render3d";
import type { SimState } from "../sim/simulation";
import { ShipSprite } from "./Spacecraft";
import Planet from "./Planet";

interface Props {
  sim: SimState;
  coastDays: number;
  width: number;
  height: number;
  /** False holds the camera still: the player has asked for less movement. */
  spinning?: boolean;
  mode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
}

const STARS = starSphere();

export default function FlightMap3D({
  sim,
  coastDays,
  width,
  height,
  spinning = true,
  mode,
  onModeChange,
}: Props) {
  const { camera, motion, scene: sceneConfig, colors } = flight3d;

  const [spin, setSpin] = useState(0);
  const [pitch, setPitch] = useState(() => startingPitch(mode));
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number } | null>(null);

  /* Changing mode resets the height the camera sits at, because what reads
     well from behind a spacecraft is not what reads well from above a solar
     system. The swing carries on from wherever it had got to. */
  useEffect(() => {
    setPitch(startingPitch(mode));
  }, [mode]);

  useEffect(() => {
    if (!spinning || dragging) return;
    let frame = 0;
    let last = performance.now();
    const perSecond = (Math.PI * 2) / motion.secondsPerTurn;

    const tick = (now: number) => {
      const seconds = Math.min(0.05, (now - last) / 1000);
      last = now;
      setSpin((current) => current + perSecond * seconds);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [spinning, dragging, motion.secondsPerTurn]);

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      const dx = event.clientX - drag.current.x;
      const dy = event.clientY - drag.current.y;
      drag.current = { x: event.clientX, y: event.clientY };
      setSpin((current) => current - dx * camera.dragSensitivity);
      setPitch((current) =>
        Math.min(camera.maxPitch, Math.max(camera.minPitch, current + dy * camera.dragSensitivity)),
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
  }, [dragging, camera.dragSensitivity, camera.maxPitch, camera.minPitch]);

  /* ---- the whole picture, worked out once per frame */
  const drawn = useMemo(() => {
    const scene = buildScene(sim, coastDays);
    const view = cameraFor(scene, mode, { spin, pitch });
    const basis = viewBasis(view);
    const centre = { x: width / 2, y: height / 2 };

    const flat = (point: Parameters<typeof projectView>[0]) =>
      projectView(point, view, basis, centre);

    const body = (at: typeof scene.sun, radius: number) => {
      const point = flat(at);
      if (!point) return null;
      return {
        x: point.x,
        y: point.y,
        depth: point.depth,
        r: Math.min(
          sceneConfig.maxPixelRadius,
          Math.max(sceneConfig.minPixelRadius, sizeAt(radius, point.depth, view)),
        ),
      };
    };

    return {
      scene,
      view,
      centre,
      stars: STARS.map((star) => ({ at: flat(star.at), size: star.size })).filter(
        (star) => star.at !== null,
      ),
      grid: scene.grid.map((radius) =>
        projectPath(
          Array.from({ length: 73 }, (_, index) => {
            const angle = (index / 72) * Math.PI * 2;
            return { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius };
          }),
          view,
          basis,
          centre,
        ),
      ),
      startRing: projectPath(scene.startRing, view, basis, centre),
      targetRing: projectPath(scene.targetRing, view, basis, centre),
      flownPath: projectPath(scene.path.slice(0, scene.flown + 1), view, basis, centre),
      aheadPath: projectPath(scene.path.slice(scene.flown), view, basis, centre),
      sun: body(scene.sun, sceneConfig.sunRadius),
      earth: body(scene.earth, sceneConfig.earthRadius),
      target: body(scene.target, sceneConfig.targetRadius),
      ship: body(scene.ship, sceneConfig.shipSize),
    };
  }, [sim, coastDays, mode, spin, pitch, width, height, sceneConfig]);

  const line = (points: { x: number; y: number }[]) =>
    points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  /* Bodies are painted furthest first, so a near one covers a far one. */
  const bodies = (
    [
      ["sun", drawn.sun],
      ["earth", drawn.earth],
      ["target", drawn.target],
    ] as const
  )
    .filter(([, at]) => at !== null)
    .sort((a, b) => (b[1]!.depth ?? 0) - (a[1]!.depth ?? 0));

  const sunOnScreen = drawn.sun ?? { x: drawn.centre.x, y: drawn.centre.y };

  return (
    <div className="map3d">
      <svg
        className={`map3d-stage${dragging ? " map3d-stage--held" : ""}`}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`A 3D view of the mission. Camera mode: ${mode}. Drag to turn it.`}
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY };
          setDragging(true);
        }}
      >
        {/* ---- the sky, on a sphere far outside the mission */}
        <g aria-hidden="true">
          {drawn.stars.map((star, index) => (
            <circle
              key={index}
              cx={star.at!.x}
              cy={star.at!.y}
              r={star.size * 0.55}
              fill={colors.star}
              opacity={0.55}
            />
          ))}
        </g>

        {/* ---- a floor of faint circles, so the eye can read the tilt */}
        <g fill="none" stroke={colors.grid} strokeWidth={1} opacity={0.34}>
          {drawn.grid.map((points, index) =>
            points.length > 1 ? <polyline key={index} points={line(points)} /> : null,
          )}
        </g>

        {/* ---- the two orbits */}
        <g fill="none" strokeWidth={1.3}>
          {drawn.startRing.length > 1 && (
            <polyline points={line(drawn.startRing)} stroke={colors.startRing} opacity={0.75} />
          )}
          {drawn.targetRing.length > 1 && (
            <polyline
              points={line(drawn.targetRing)}
              stroke={colors.targetRing}
              opacity={0.6}
              strokeDasharray="4 6"
            />
          )}
        </g>

        {/* ---- the path: what is left ahead, then the part already flown */}
        <g fill="none">
          {drawn.aheadPath.length > 1 && (
            <polyline
              points={line(drawn.aheadPath)}
              stroke={colors.pathAhead}
              strokeWidth={1.4}
              strokeDasharray="3 7"
            />
          )}
          {drawn.flownPath.length > 1 && (
            <polyline
              points={line(drawn.flownPath)}
              stroke={colors.pathFlown}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
          )}
        </g>

        {/* ---- the worlds, furthest away painted first */}
        {bodies.map(([which, at]) => {
          if (!at) return null;
          if (which === "sun") {
            return (
              <g key="sun">
                <Planet
                  id="map3d-sun"
                  x={at.x}
                  y={at.y}
                  r={at.r}
                  color={planets.sun.color}
                  coreColor={planets.sun.coreColor}
                  glowRadius={at.r * 2.2}
                  lightX={at.x}
                  lightY={at.y}
                  emissive
                />
                <text x={at.x} y={at.y + at.r + 15} className="maplabel" textAnchor="middle">
                  Sun
                </text>
              </g>
            );
          }
          const isTarget = which === "target";
          return (
            <g key={which}>
              <Planet
                id={`map3d-${which}`}
                x={at.x}
                y={at.y}
                r={at.r}
                color={isTarget ? sim.config.color : planets.earth.color}
                lightX={sunOnScreen.x}
                lightY={sunOnScreen.y}
                {...(isTarget ? worldLook(sim.config.scenarioId) : { polarCap: true, capColor: planets.earth.capColor })}
              />
              <text
                x={at.x}
                y={at.y - at.r - 7}
                className={`maplabel${isTarget ? " maplabel--bright" : ""}`}
                textAnchor="middle"
              >
                {isTarget ? sim.config.target : "Earth"}
              </text>
            </g>
          );
        })}

        {/* ---- and the spacecraft, always on top: it is what you came for */}
        {drawn.ship && (
          <g transform={`translate(${drawn.ship.x} ${drawn.ship.y})`}>
            <circle r={drawn.ship.r * 2.6} fill={colors.trail} opacity={0.12} />
            <ShipSprite design={sim.design} size={Math.max(16, drawn.ship.r * 2.4)} />
          </g>
        )}
      </svg>

      <div className="map3d-controls" role="group" aria-label="Camera">
        {CAMERA_MODES.map((option) => (
          <button
            key={option.id}
            className={`btn btn--small map3d-mode${option.id === mode ? " map3d-mode--on" : ""}`}
            aria-pressed={option.id === mode}
            title={option.hint}
            onClick={() => onModeChange(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
