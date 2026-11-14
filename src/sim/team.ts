/**
 * Playing as a team, around one laptop.
 *
 * There is no network here and no second screen. What makes it a team game is
 * that each player owns part of the spacecraft: when a solar storm hits the
 * panels, the game says whose call it is by name, and that player decides.
 *
 * Everything in this file is pure, so who owns what can be tested without
 * running the game.
 */
import type { ShipPart } from "../data/game";
import { roles as rolesConfig } from "../data/game";
import type { TeamRole } from "../data/game";

export interface Player {
  /** Where they sit in the team, from 0. Player 0 is always the Director. */
  index: number;
  name: string;
  roleId: string;
}

/** Every part a challenge can happen to, which is every part a player can own. */
export const OWNABLE_PARTS: ShipPart[] = [
  "body",
  "instruments",
  "power",
  "antenna",
  "engine",
];

export const roleById = (id: string): TeamRole | undefined =>
  rolesConfig.roles.find((role) => role.id === id);

/** The role a player holds. Falls back to the Director, who owns the rest. */
export function roleOf(player: Player): TeamRole {
  return roleById(player.roleId) ?? rolesConfig.roles[0];
}

/**
 * Hand out the roles, in the order the data lists them. Blank names become
 * "Player 2" and so on, and the team is clamped to what the data allows, so a
 * stray number from a URL or an old save can never make a team of nine.
 */
export function assignRoles(names: string[]): Player[] {
  const { minPlayers, maxPlayers, defaultNames, roles } = rolesConfig;
  const count = Math.min(maxPlayers, Math.max(minPlayers, names.length));

  return Array.from({ length: count }, (_, index) => ({
    index,
    name: names[index]?.trim() || defaultNames[index] || `Player ${index + 1}`,
    roleId: roles[Math.min(index, roles.length - 1)].id,
  }));
}

/**
 * Who answers for this part.
 *
 * A part nobody's role claims belongs to the Flight Director, which is why a
 * team of two still has an answer for every challenge that can arrive.
 */
export function ownerOf(players: Player[], part: ShipPart | null): Player | null {
  if (players.length === 0) return null;
  if (!part) return players[0];

  const owner = players.find((player) => roleOf(player).owns.includes(part));
  return owner ?? players[0];
}

/** "Priya, Power Engineer" — for the line that says whose call it is. */
export function callSign(player: Player): string {
  return `${player.name}, ${roleOf(player).name}`;
}

/** True when more than one person is playing, which is what turns the naming on. */
export const isTeam = (players: Player[]): boolean => players.length > 1;

/** How many challenges each player was handed, for the scoreboard at the end. */
export function decisionsPerPlayer(
  players: Player[],
  parts: (ShipPart | null)[],
): { player: Player; count: number }[] {
  return players.map((player) => ({
    player,
    count: parts.filter((part) => ownerOf(players, part)?.index === player.index).length,
  }));
}
