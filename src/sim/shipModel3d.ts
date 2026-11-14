/**
 * The spacecraft the player built, as a solid.
 *
 * Every size comes from `shipLayout`, the same function that draws the flat
 * sprite on the map, so the 3D view is never a different machine from the one
 * flying the mission: choose the big dish and the dish here grows too.
 *
 * The model points along +x, +y is up and +z is to the right, which is why the
 * solar wings reach out along z and the engine bell hangs off the back at -x.
 *
 * Pure geometry. It returns `Face`s and nothing else knows it exists.
 */
import type { Design } from "../data/game";
import { findPower, ship3d } from "../data/game";
import { shipLayout } from "./shipLayout";
import type { Face, Vec3 } from "./render3d";
import { boxFaces, coneFaces, length } from "./render3d";

/** How far the furthest corner sits from the middle. Used to frame the shot. */
export function modelExtent(faces: Face[]): number {
  let furthest = 0;
  for (const face of faces) {
    for (const point of face.points) furthest = Math.max(furthest, length(point));
  }
  return furthest;
}

/** The parts a 3D face can belong to, in the order they are built. */
export const MODEL_PARTS = ["body", "power", "antenna", "instruments", "engine"] as const;

export function shipFaces(design: Design): Face[] {
  const layout = shipLayout(design);
  const { colors, shape } = ship3d;
  const faces: Face[] = [];

  const busDepth = layout.bus.h * shape.busDepthShare;
  const halfLength = layout.bus.w / 2;

  /* ---- the bus: the box everything else is bolted to */
  faces.push(
    ...boxFaces(
      { x: 0, y: 0, z: 0 },
      { w: layout.bus.w, h: layout.bus.h, d: busDepth },
      colors.bus,
      "body",
    ),
  );

  /* A band of gold foil round the middle, the way real spacecraft are wrapped
     to keep the heat in. Slightly proud of the bus so it does not z-fight. */
  faces.push(
    ...boxFaces(
      { x: 0, y: -layout.bus.h * 0.18, z: 0 },
      {
        w: layout.bus.w * 1.012,
        h: layout.bus.h * 0.3,
        d: busDepth * 1.012,
      },
      colors.busGold,
      "body",
    ),
  );

  /* ---- power: two solar wings, or a nuclear battery on a boom */
  const power = findPower(design.powerId);
  if (layout.panel) {
    const { length: wing } = layout.panel;
    // Widened for 3D: the flat sprite is always seen face-on, so its narrow
    // chord reads fine there. Turned edge-on it would be a stick.
    const width = layout.panel.width * shape.panelChordShare;
    const cellWidth = wing / shape.panelCells;

    for (const side of [-1, 1]) {
      for (let cell = 0; cell < shape.panelCells; cell += 1) {
        const inner = busDepth / 2 + cell * cellWidth;
        const z = side * (inner + cellWidth / 2);
        faces.push(
          ...boxFaces(
            { x: 0, y: 0, z },
            { w: width, h: shape.panelThickness, d: cellWidth * 0.94 },
            // The cells face the Sun; the frame between them is paler.
            cell % 2 === 0 ? colors.panel : colors.panelCell,
            "power",
          ),
        );
      }
    }
  } else if (layout.rtg) {
    // A finned cylinder out to one side, held away from the instruments
    // because it is warm and radioactive — which is why real ones are on booms.
    const boomZ = busDepth / 2 + shape.rtgLength / 2;
    faces.push(
      ...coneFaces(
        {
          baseX: -shape.rtgLength / 2,
          baseRadius: shape.rtgRadius,
          tipX: shape.rtgLength / 2,
          tipRadius: shape.rtgRadius,
          sides: shape.rtgSides,
          centre: { x: 0, y: 0, z: boomZ },
        },
        colors.rtg,
        "power",
      ),
    );
    for (let fin = 0; fin < shape.rtgFins; fin += 1) {
      const angle = (fin / shape.rtgFins) * Math.PI;
      faces.push(
        ...boxFaces(
          { x: 0, y: Math.sin(angle) * shape.rtgRadius, z: boomZ + Math.cos(angle) * shape.rtgRadius },
          { w: shape.rtgLength * 0.8, h: shape.rtgRadius * 1.6, d: 0.35 },
          colors.fin,
          "power",
        ),
      );
    }
  }

  /* ---- the dish, on a short boom at the front */
  const dishDepth = layout.dish.r * shape.dishDepthShare;
  const dishBase = halfLength + dishDepth + 1;
  faces.push(
    ...coneFaces(
      {
        baseX: dishBase,
        baseRadius: layout.dish.r,
        tipX: halfLength + 1,
        tipRadius: layout.dish.r * shape.dishTipShare,
        sides: shape.dishSides,
      },
      colors.dish,
      "antenna",
    ),
  );
  // The feed horn on its strut, which is what the dish actually focuses onto.
  faces.push(
    ...boxFaces(
      { x: halfLength + 0.5, y: 0, z: 0 },
      { w: 1, h: layout.dish.r * 0.3, d: layout.dish.r * 0.3 },
      colors.boom,
      "antenna",
    ),
  );
  faces.push(
    ...boxFaces(
      { x: dishBase + 0.6, y: 0, z: 0 },
      { w: 1.2, h: 0.9, d: 0.9 },
      colors.boom,
      "antenna",
    ),
  );

  /* ---- one sensor box per instrument, along the top */
  const sensors = layout.sensors;
  if (sensors.length > 0) {
    const size = sensors[0].size;
    const spread = size * (1 + shape.sensorGap);
    const first = -((sensors.length - 1) / 2) * spread;
    sensors.forEach((sensor, index) => {
      faces.push(
        ...boxFaces(
          {
            x: first + index * spread,
            y: layout.bus.h / 2 + sensor.size / 2,
            z: 0,
          },
          { w: sensor.size, h: sensor.size, d: sensor.size * 0.8 },
          colors.sensor,
          "instruments",
        ),
      );
    });
  }

  /* ---- the engine bell at the back, flaring outwards */
  faces.push(
    ...coneFaces(
      {
        baseX: -(halfLength + layout.nozzle.h),
        baseRadius: (layout.nozzle.w / 2) * shape.nozzleFlare,
        tipX: -halfLength,
        tipRadius: layout.nozzle.w / 2,
        sides: shape.nozzleSides,
      },
      colors.nozzle,
      "engine",
    ),
  );

  // Nothing below depends on the power source other than this one guard, which
  // keeps an unknown part from silently drawing nothing at all.
  if (!power && !layout.rtg && !layout.panel) {
    faces.push(
      ...boxFaces({ x: 0, y: 0, z: 0 }, { w: 2, h: 2, d: 2 }, colors.bus, "power"),
    );
  }

  return faces;
}

/** Where the camera should sit so this model fills the frame. */
export function cameraFor(faces: Face[]): { distance: number; fov: number; near: number } {
  const extent = modelExtent(faces);
  return {
    distance: Math.max(extent * ship3d.camera.distanceFactor, ship3d.camera.near + 1),
    fov: ship3d.camera.fov,
    near: ship3d.camera.near,
  };
}

/** The light direction, as a vector in the model's own frame. */
export function modelLight(): Vec3 {
  return ship3d.light;
}
