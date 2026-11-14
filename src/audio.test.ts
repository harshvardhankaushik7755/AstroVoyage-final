import { describe, expect, it } from "vitest";
import { isSoundMuted, notesFor, playSound, setMutedForSound, soundConfig, soundLength } from "./audio";

describe("the sounds the game makes", () => {
  it("has one for every moment that needs it", () => {
    for (const name of ["click", "launch", "alert", "good", "bad", "arrive"]) {
      expect(notesFor(name).length).toBeGreaterThan(0);
    }
  });

  it("keeps every one short enough not to get in the way", () => {
    for (const name of Object.keys(soundConfig.sounds)) {
      expect(soundLength(name)).toBeGreaterThan(0);
      expect(soundLength(name)).toBeLessThan(1.2);
    }
  });

  it("keeps every note audible and quiet", () => {
    for (const notes of Object.values(soundConfig.sounds)) {
      for (const note of notes) {
        // Inside what a laptop speaker and a human ear both manage.
        expect(note.freq).toBeGreaterThan(60);
        expect(note.freq).toBeLessThan(5000);
        expect(note.gain).toBeGreaterThan(0);
        expect(note.gain).toBeLessThanOrEqual(1);
        expect(note.length).toBeGreaterThan(0.02);
        if (note.sweepTo !== undefined) expect(note.sweepTo).toBeGreaterThan(0);
      }
    }
  });

  it("never goes louder than the master level allows", () => {
    expect(soundConfig.masterGain).toBeGreaterThan(0);
    expect(soundConfig.masterGain).toBeLessThan(0.4);
  });

  it("starts muted, and remembers being switched", () => {
    expect(isSoundMuted()).toBe(true);
    setMutedForSound(false);
    expect(isSoundMuted()).toBe(false);
    setMutedForSound(true);
    expect(isSoundMuted()).toBe(true);
  });

  it("is safe to call with no audio at all, muted or not", () => {
    expect(() => playSound("launch")).not.toThrow();
    setMutedForSound(false);
    expect(() => playSound("launch")).not.toThrow();
    expect(() => playSound("no-such-sound")).not.toThrow();
    setMutedForSound(true);
  });

  it("reports nothing for a sound that does not exist", () => {
    expect(notesFor("no-such-sound")).toEqual([]);
    expect(soundLength("no-such-sound")).toBe(0);
  });
});
