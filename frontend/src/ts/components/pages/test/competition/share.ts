// What a player shares once their competition is over, Wordle style: a grid
// of their attempts and their best score, with the link to play. The text
// goes to X, LinkedIn or the clipboard; share-image.ts draws the card for
// Instagram.

import {
  CompetitionAttempt,
  CompetitionChallenger,
} from "../../../../states/competition";
import { buildCompetitionLink } from "../../../../url-actions/actions/competition";

/** The name on a link shared without one. */
const ANONYMOUS_NAME = "A friend";

const SQUARE_BEST = "🟩";
const SQUARE_SCORED = "🟨";
const SQUARE_NONE = "⬛";

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

/** "19 Nov": the day of the game. */
export function formatShareDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * A square per attempt: green the best, yellow another score, black one
 * without a score or not played.
 */
export function buildShareGrid(
  attempts: CompetitionAttempt[],
  best: CompetitionAttempt,
): string {
  return attempts
    .map((attempt) =>
      attempt === best
        ? SQUARE_BEST
        : attempt.status === "done"
          ? SQUARE_SCORED
          : SQUARE_NONE,
    )
    .join("");
}

/** The post without its link: the grid, the best score, the nominations. */
export function buildShareBody(
  attempts: CompetitionAttempt[],
  best: CompetitionAttempt,
  date: Date,
): string {
  return [
    `⌨️ Typing Comp · ${formatShareDate(date)}`,
    `${buildShareGrid(attempts, best)} best ${Math.round(best.wpm)} wpm · ${Math.round(best.acc)}%`,
    "",
    "I nominate @ @ @ to beat it 👇",
  ].join("\n");
}

/** The post as the clipboard and LinkedIn get it. */
export function buildShareText(body: string, link: string): string {
  return `${body}\n${link}`;
}

/** LinkedIn's post composer, prefilled with `text`. */
export function buildLinkedInShareUrl(text: string): string {
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
}

/** X's post composer: the link apart from the text, X counts it as short. */
export function buildXShareUrl(body: string, link: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(body)}&url=${encodeURIComponent(link)}`;
}
