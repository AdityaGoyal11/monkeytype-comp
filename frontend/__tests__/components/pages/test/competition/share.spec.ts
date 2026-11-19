import { describe, expect, it } from "vitest";

import {
  buildLinkedInShareUrl,
  buildShareBody,
  buildShareGrid,
  buildShareLink,
  buildShareText,
  buildXShareUrl,
  formatShareDate,
} from "../../../../../src/ts/components/pages/test/competition/share";
import {
  CompetitionAttempt,
  CompetitionChallenger,
} from "../../../../../src/ts/states/competition";
import { readUrlAction } from "../../../../../src/ts/url-actions/action";
import { competitionAction } from "../../../../../src/ts/url-actions/actions/competition";

const done = (wpm: number, acc: number): CompetitionAttempt => ({
  status: "done",
  wpm,
  acc,
});
const none: CompetitionAttempt = { status: "void", wpm: 0, acc: 0 };

const first = done(70.4, 99);
const second = done(86.6, 96.4);
const attempts = [first, none, second];
const date = new Date(2026, 10, 19);

function challengerOf(link: string): CompetitionChallenger | null {
  const value = decodeURIComponent(link.slice(link.indexOf("=") + 1));
  const read = readUrlAction(competitionAction, { comp: value });
  if (!read.success) throw new Error(read.error);
  return read.data;
}

describe("buildShareGrid", () => {
  it("marks the best green, another score yellow, no score black", () => {
    expect(buildShareGrid(attempts, second)).toBe("🟨⬛🟩");
  });

  it("shows attempts not played as black", () => {
    expect(buildShareGrid([second], second)).toBe("🟩");
    expect(buildShareGrid([second, none], second)).toBe("🟩⬛");
  });

  it("marks only one attempt as the best, even on equal scores", () => {
    const twin = done(86.6, 96.4);

    expect(buildShareGrid([second, twin], second)).toBe("🟩🟨");
  });
});

describe("buildShareBody", () => {
  it("has the day, the grid, the rounded best and the nominations", () => {
    expect(buildShareBody(attempts, second, date)).toBe(
      [
        "⌨️ Typing Comp · 19 Nov",
        "🟨⬛🟩 best 87 wpm · 96%",
        "",
        "I nominate @ @ @ to beat it 👇",
      ].join("\n"),
    );
  });
});

describe("formatShareDate", () => {
  it("is the day and short month", () => {
    expect(formatShareDate(new Date(2026, 0, 5))).toBe("5 Jan");
  });
});

describe("buildShareLink", () => {
  const best = { wpm: 86.6, acc: 96.4 };

  it("is under the player's name", () => {
    expect(challengerOf(buildShareLink(" Ada ", best))?.name).toBe("Ada");
  });

  it("is under a stand-in without a name", () => {
    expect(challengerOf(buildShareLink("  ", best))?.name).toBe("A friend");
  });
});

describe("share urls", () => {
  const link = "https://example.com?comp=Ada~87~96";
  const body = buildShareBody(attempts, second, date);

  it("puts the link under the body in the text", () => {
    expect(buildShareText(body, link)).toBe(`${body}\n${link}`);
  });

  it("prefills LinkedIn's composer with the whole text", () => {
    const url = new URL(buildLinkedInShareUrl(buildShareText(body, link)));

    expect(url.origin).toBe("https://www.linkedin.com");
    expect(url.searchParams.get("text")).toBe(buildShareText(body, link));
  });

  it("prefills X's composer with the body and the link apart", () => {
    const url = new URL(buildXShareUrl(body, link));

    expect(url.origin).toBe("https://x.com");
    expect(url.pathname).toBe("/intent/post");
    expect(url.searchParams.get("text")).toBe(body);
    expect(url.searchParams.get("url")).toBe(link);
  });

  it("fits a post on X, whose link counts as 23 characters", () => {
    // the longest a player's grid and score get
    const long = buildShareBody(
      [done(300, 100), done(299, 100), done(298, 100)],
      done(300, 100),
      date,
    );

    expect(long.length + 1 + 23).toBeLessThanOrEqual(280);
  });
});
