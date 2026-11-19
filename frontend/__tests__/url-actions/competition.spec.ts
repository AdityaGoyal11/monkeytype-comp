import { describe, expect, it } from "vitest";

import { CompetitionChallenger } from "../../src/ts/states/competition";
import { readUrlAction } from "../../src/ts/url-actions/action";
import {
  buildCompetitionLink,
  buildCompetitionStartLink,
  competitionAction,
} from "../../src/ts/url-actions/actions/competition";

/** The challenger a link's `comp` value reads as, as the browser decodes it. */
function decodeChallenger(link: string): CompetitionChallenger | null {
  const separator = link.indexOf("=");
  const value =
    separator === -1 ? "" : decodeURIComponent(link.slice(separator + 1));
  const read = readUrlAction(competitionAction, { comp: value });
  if (!read.success) throw new Error(read.error);
  return read.data;
}

describe("buildCompetitionLink", () => {
  it("decodes back to the challenger, the score rounded", () => {
    const link = buildCompetitionLink({ name: "Ada", wpm: 86.6, acc: 96.4 });

    expect(link).toBe(`${location.origin}?comp=Ada~87~96`);
    expect(decodeChallenger(link)).toEqual({ name: "Ada", wpm: 87, acc: 96 });
  });

  it("keeps a name with spaces, symbols and the separator readable", () => {
    const link = buildCompetitionLink({
      name: "Ada & Bo~=?#",
      wpm: 50,
      acc: 90,
    });

    expect(decodeChallenger(link)).toEqual({
      name: "Ada & Bo-=?#",
      wpm: 50,
      acc: 90,
    });
  });
});

describe("reading competitionAction", () => {
  it('reads the "+" the router writes for a space as one', () => {
    expect(decodeChallenger("?comp=Ada+L~80~95")?.name).toBe("Ada L");
  });

  it("starts without a challenger from the bare link", () => {
    expect(buildCompetitionStartLink()).toBe(`${location.origin}?comp`);
    expect(decodeChallenger(buildCompetitionStartLink())).toBeNull();
  });

  it.each([
    ["garbage", "hello"],
    ["no name", "~80~95"],
    ["a score that isn't a number", "Ada~fast~95"],
    ["a negative score", "Ada~-5~95"],
    ["an accuracy over 100", "Ada~80~150"],
    ["too many parts", "Ada~80~95~1"],
  ])("starts without a challenger from %s", (_, value) => {
    expect(decodeChallenger(`?comp=${value}`)).toBeNull();
  });

  it("cuts a name that is too long", () => {
    const challenger = decodeChallenger(`?comp=${"a".repeat(100)}~80~95`);

    expect(challenger?.name).toHaveLength(32);
  });
});
