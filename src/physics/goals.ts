/**
 * Goals and the designs that can carry them out.
 *
 * A mission's goal names one instrument it cannot be done without — you cannot
 * hunt for buried ice without a radar. That is the whole rule, and it is what
 * turns "pick a goal" into a real decision rather than a label.
 */
import type { Design, MissionGoal } from "../data/game";
import { findBody } from "../data/game";

/**
 * The same design, but certainly carrying the instrument this goal needs.
 *
 * If there is a free slot the instrument is added. If the spacecraft is full
 * it replaces the last one chosen, because a design that cannot do the job is
 * worse than one short of a spare instrument. Returns the design unchanged
 * when it already carries what it needs, so React sees no new object.
 */
export function withGoalInstrument(design: Design, goal: MissionGoal | undefined): Design {
  if (!goal) return design;
  if (design.instrumentIds.includes(goal.instrumentId)) return design;

  const slots = findBody(design.bodyId)?.slots ?? 0;
  if (slots <= 0) return design;

  const kept =
    design.instrumentIds.length < slots
      ? design.instrumentIds
      : design.instrumentIds.slice(0, slots - 1);

  return { ...design, instrumentIds: [...kept, goal.instrumentId] };
}
