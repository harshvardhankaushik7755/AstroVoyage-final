import { describe, expect, it } from "vitest";
import {
  OWNABLE_PARTS,
  assignRoles,
  callSign,
  decisionsPerPlayer,
  isTeam,
  ownerOf,
  roleOf,
} from "./team";
import { roles as rolesConfig } from "../data/game";

describe("handing out the roles", () => {
  it("gives the first player the Flight Director's chair", () => {
    expect(roleOf(assignRoles(["Kunal"])[0]).id).toBe("director");
  });

  it("hands them out in the order the data lists them", () => {
    const team = assignRoles(["A", "B", "C", "D"]);
    expect(team.map((player) => player.roleId)).toEqual(
      rolesConfig.roles.map((role) => role.id),
    );
  });

  it("fills a blank name in rather than leaving a nameless seat", () => {
    const team = assignRoles(["Priya", "   ", ""]);
    expect(team[0].name).toBe("Priya");
    expect(team[1].name).toBe(rolesConfig.defaultNames[1]);
    expect(team[2].name).toBe(rolesConfig.defaultNames[2]);
  });

  it("never seats more than the data allows, whatever it is handed", () => {
    expect(assignRoles(["a", "b", "c", "d", "e", "f", "g"])).toHaveLength(
      rolesConfig.maxPlayers,
    );
  });

  it("never seats fewer than one, even from nothing", () => {
    expect(assignRoles([])).toHaveLength(rolesConfig.minPlayers);
  });

  it("numbers the seats from zero, in order", () => {
    expect(assignRoles(["a", "b", "c"]).map((p) => p.index)).toEqual([0, 1, 2]);
  });
});

describe("whose call is it", () => {
  it("gives every part an owner, for every size of team", () => {
    for (let size = 1; size <= rolesConfig.maxPlayers; size += 1) {
      const team = assignRoles(Array.from({ length: size }, (_, i) => `P${i}`));
      for (const part of OWNABLE_PARTS) {
        expect(ownerOf(team, part), `${size} players, ${part}`).not.toBeNull();
      }
    }
  });

  it("gives exactly one owner to each part: nobody can be overruled", () => {
    const team = assignRoles(["a", "b", "c", "d"]);
    for (const part of OWNABLE_PARTS) {
      const owners = team.filter((player) => roleOf(player).owns.includes(part));
      expect(owners.length, `${part} is owned by ${owners.length} players`).toBeLessThanOrEqual(1);
    }
  });

  it("gives a lone player everything", () => {
    const solo = assignRoles(["Kunal"]);
    for (const part of OWNABLE_PARTS) {
      expect(ownerOf(solo, part)!.index).toBe(0);
    }
  });

  it("hands the panels to the Power Engineer once there are two", () => {
    const pair = assignRoles(["Kunal", "Priya"]);
    expect(ownerOf(pair, "power")!.name).toBe("Priya");
    expect(ownerOf(pair, "antenna")!.name).toBe("Kunal");
  });

  it("moves the antenna and the instruments along as the team grows", () => {
    const four = assignRoles(["A", "B", "C", "D"]);
    expect(ownerOf(four, "power")!.name).toBe("B");
    expect(ownerOf(four, "antenna")!.name).toBe("C");
    expect(ownerOf(four, "instruments")!.name).toBe("D");
  });

  it("falls to the Flight Director for anything unclaimed, like the engine", () => {
    const four = assignRoles(["A", "B", "C", "D"]);
    expect(ownerOf(four, "engine")!.name).toBe("A");
  });

  it("falls to the Flight Director when a challenge names no part at all", () => {
    expect(ownerOf(assignRoles(["A", "B"]), null)!.name).toBe("A");
  });

  it("has nobody at all when nobody is playing", () => {
    expect(ownerOf([], "power")).toBeNull();
  });
});

describe("saying it out loud", () => {
  it("names the player and the job", () => {
    expect(callSign(assignRoles(["Priya", "Sam"])[1])).toBe("Sam, Power Engineer");
  });

  it("is only a team once there is more than one of them", () => {
    expect(isTeam(assignRoles(["Kunal"]))).toBe(false);
    expect(isTeam(assignRoles(["Kunal", "Priya"]))).toBe(true);
    expect(isTeam([])).toBe(false);
  });
});

describe("who did what, at the end", () => {
  it("counts every challenge against exactly one player", () => {
    const team = assignRoles(["A", "B", "C", "D"]);
    const parts = ["power", "antenna", "power", "instruments", "engine", null] as const;
    const tally = decisionsPerPlayer(team, [...parts]);
    expect(tally.reduce((sum, row) => sum + row.count, 0)).toBe(parts.length);
  });

  it("puts them against the right player", () => {
    const team = assignRoles(["A", "B", "C", "D"]);
    const tally = decisionsPerPlayer(team, ["power", "power", "antenna"]);
    expect(tally.find((row) => row.player.name === "B")!.count).toBe(2);
    expect(tally.find((row) => row.player.name === "C")!.count).toBe(1);
    expect(tally.find((row) => row.player.name === "D")!.count).toBe(0);
  });

  it("gives everyone a row, even the ones nothing happened to", () => {
    const team = assignRoles(["A", "B", "C"]);
    expect(decisionsPerPlayer(team, [])).toHaveLength(3);
  });
});

describe("the role data itself", () => {
  it("has a role for every seat the game offers", () => {
    expect(rolesConfig.roles.length).toBeGreaterThanOrEqual(rolesConfig.maxPlayers);
    expect(rolesConfig.defaultNames.length).toBeGreaterThanOrEqual(rolesConfig.maxPlayers);
  });

  it("gives every role an icon and a line a child can read", () => {
    for (const role of rolesConfig.roles) {
      expect(role.icon.length).toBeGreaterThan(0);
      expect(role.blurb.length).toBeGreaterThan(20);
      expect(role.name.length).toBeGreaterThan(3);
    }
  });

  it("only ever claims parts the spacecraft actually has", () => {
    for (const role of rolesConfig.roles) {
      for (const part of role.owns) expect(OWNABLE_PARTS).toContain(part);
    }
  });
});
