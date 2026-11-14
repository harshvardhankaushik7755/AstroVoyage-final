import { describe, expect, it } from "vitest";
import { buildSky } from "./sky";
import { sky as skyConfig } from "../data/game";

const W = 800;
const H = 500;

describe("the sky", () => {
  it("is the same every time for the same seed", () => {
    expect(buildSky(W, H, skyConfig)).toEqual(buildSky(W, H, skyConfig));
  });

  it("is different for a different seed", () => {
    const a = buildSky(W, H, skyConfig);
    const b = buildSky(W, H, { ...skyConfig, seed: skyConfig.seed + 1 });
    expect(a.stars[0]).not.toEqual(b.stars[0]);
  });

  it("makes plenty of stars, and keeps every one inside the picture", () => {
    const result = buildSky(W, H, skyConfig);
    expect(result.stars.length).toBeGreaterThan(skyConfig.stars.count * 0.6);
    for (const star of result.stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(W);
      expect(star.y).toBeGreaterThanOrEqual(0);
      expect(star.y).toBeLessThanOrEqual(H);
    }
  });

  it("keeps every star's size and brightness inside the configured range", () => {
    const { stars } = buildSky(W, H, skyConfig);
    for (const star of stars) {
      expect(star.size).toBeGreaterThanOrEqual(skyConfig.stars.minSize);
      expect(star.size).toBeLessThanOrEqual(skyConfig.stars.maxSize);
      expect(star.opacity).toBeGreaterThanOrEqual(skyConfig.stars.minOpacity);
      expect(star.opacity).toBeLessThanOrEqual(skyConfig.stars.maxOpacity);
    }
  });

  it("tints only a few stars", () => {
    const { stars } = buildSky(W, H, skyConfig);
    const tinted = stars.filter((star) => star.tinted).length;
    expect(tinted).toBeGreaterThan(0);
    expect(tinted / stars.length).toBeLessThan(0.3);
  });

  it("keeps galaxies and nebulae out of the middle, where the mission is drawn", () => {
    const result = buildSky(W, H, skyConfig);
    const keepOut = Math.min(W, H) * skyConfig.edge.keepOutRadiusShare;
    for (const blob of [...result.galaxies, ...result.nebulae]) {
      const distance = Math.hypot(blob.x - W / 2, blob.y - H / 2);
      expect(distance).toBeGreaterThanOrEqual(keepOut);
    }
  });

  it("spreads the galaxies out instead of clustering them in one corner", () => {
    // Two galaxies picked by rejection sampling land together; picking the
    // corner first keeps them apart.
    const { galaxies } = buildSky(W, H, skyConfig);
    expect(galaxies.length).toBeGreaterThanOrEqual(2);
    const apart = Math.hypot(
      galaxies[0].x - galaxies[1].x,
      galaxies[0].y - galaxies[1].y,
    );
    expect(apart).toBeGreaterThan(Math.min(W, H) * 0.4);
  });

  it("puts a band across the picture at the configured angle", () => {
    const result = buildSky(W, H, skyConfig);
    expect(result.band.angleDeg).toBe(skyConfig.milkyWay.angleDeg);
    expect(result.band.width).toBeGreaterThan(0);
    // Faint enough to stay behind the mission.
    expect(result.band.opacity).toBeLessThan(0.4);
  });

  it("gathers some of the stars into the band", () => {
    const { stars, band } = buildSky(W, H, skyConfig);
    const radians = (band.angleDeg * Math.PI) / 180;
    // Distance of each star from the band's centre line.
    const near = stars.filter((star) => {
      const dx = star.x - W / 2;
      const dy = star.y - H / 2;
      const across = Math.abs(-Math.sin(radians) * dx + Math.cos(radians) * dy);
      return across < band.width / 2;
    }).length;
    expect(near / stars.length).toBeGreaterThan(0.3);
  });

  it("copes with a tiny picture without crashing or going out of bounds", () => {
    const small = buildSky(60, 40, skyConfig);
    for (const star of small.stars) {
      expect(star.x).toBeGreaterThanOrEqual(0);
      expect(star.x).toBeLessThanOrEqual(60);
    }
    expect(Number.isFinite(small.band.width)).toBe(true);
  });

  it("remembers the size it was built for", () => {
    const result = buildSky(W, H, skyConfig);
    expect(result.width).toBe(W);
    expect(result.height).toBe(H);
  });
});
