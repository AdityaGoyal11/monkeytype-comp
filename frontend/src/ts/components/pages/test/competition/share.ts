// What a player shares once their competition is over: the text of the post
// nominating others, and LinkedIn's composer prefilled with it.

import {
  COMPETITION_MAX_ATTEMPTS,
  CompetitionChallenger,
} from "../../../../states/competition";
import { buildCompetitionLink } from "../../../../url-actions/actions/competition";

/** The name on a link shared without one. */
const ANONYMOUS_NAME = "A friend";

/** The link challenging to beat the player's `best`, under their `name`. */
export function buildShareLink(
  name: string,
  best: { wpm: number; acc: number },
): string {
  const player: CompetitionChallenger = {
    name: name.trim() === "" ? ANONYMOUS_NAME : name.trim(),
    wpm: best.wpm,
    acc: best.acc,
  };
  return buildCompetitionLink(player);
}

/** The post: the score, the nominations to fill in, and the `link`. */
export function buildShareText(
  best: { wpm: number; acc: number },
  link: string,
): string {
  return [
    `I typed ${Math.round(best.wpm)} wpm at ${Math.round(best.acc)}% accuracy in a 30 second typing test, my best of ${COMPETITION_MAX_ATTEMPTS} attempts.`,
    "",
    "I nominate 3 people to beat it: @ @ @",
    "",
    `You get ${COMPETITION_MAX_ATTEMPTS} attempts: ${link}`,
  ].join("\n");
}

/** LinkedIn's post composer, prefilled with `text`. */
export function buildLinkedInShareUrl(text: string): string {
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
}
