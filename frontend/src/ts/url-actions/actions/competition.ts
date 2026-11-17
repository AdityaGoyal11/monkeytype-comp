// Competition links (?comp, or ?comp=<name>~<wpm>~<acc> shared by a player
// with their best score): built by the competition panel, a url action
// (../action.ts)

import { z } from "zod";

import {
  COMPETITION_NAME_MAX_LENGTH,
  CompetitionChallenger,
} from "../../states/competition";
import { enterCompetition } from "../../test/competition";
import { restartTest } from "../../test/test-logic";
import { buildUrlActionLink, defineSearchAction } from "../action";

const SEPARATOR = "~";

export const competitionAction = defineSearchAction({
  in: "search",
  param: "comp",
  encoding: "plain",
  failure: "Failed to start the competition",
  // a link without a readable challenger still starts the game
  schema: z.string().transform(toChallenger),
  apply: applyCompetition,
});

function toChallenger(value: string): CompetitionChallenger | null {
  const parts = value.split(SEPARATOR);
  if (parts.length !== 3) return null;
  const [name, wpm, acc] = parts as [string, string, string];
  const challenger = {
    // the router rewrites a space in the url to "+"
    name: name
      .replaceAll("+", " ")
      .trim()
      .slice(0, COMPETITION_NAME_MAX_LENGTH),
    wpm: Number(wpm),
    acc: Number(acc),
  };
  if (challenger.name === "") return null;
  if (!Number.isFinite(challenger.wpm) || challenger.wpm < 0) return null;
  if (!(challenger.acc >= 0 && challenger.acc <= 100)) return null;
  return challenger;
}

/** The link challenging to beat `player`'s score. */
export function buildCompetitionLink(player: CompetitionChallenger): string {
  // a "+" reads back as a space
  const name = player.name
    .replace(/[~+]/g, (it) => (it === "+" ? " " : "-"))
    .trim();
  return buildUrlActionLink({
    action: competitionAction,
    value: [
      encodeURIComponent(name),
      Math.round(player.wpm),
      Math.round(player.acc),
    ].join(SEPARATOR),
  });
}

/** The link starting a game without a challenger. */
export function buildCompetitionStartLink(): string {
  return `${location.origin}?${competitionAction.param}`;
}

async function applyCompetition(
  challenger: CompetitionChallenger | null,
): Promise<void> {
  enterCompetition(challenger);
  await restartTest({ nosave: true });
}
