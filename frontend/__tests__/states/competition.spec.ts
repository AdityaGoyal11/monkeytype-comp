import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __testing,
  activateCompetition,
  deactivateCompetition,
  endCompetitionAttempt,
  getBestCompetitionAttempt,
  getCompetitionAttemptNumber,
  getCompetitionAttempts,
  getCompetitionChallenger,
  isCompetitionActive,
  isCompetitionOver,
  startCompetitionAttempt,
} from "../../src/ts/states/competition";

const challenger = { name: "Ada", wpm: 80, acc: 97 };

function playAttempt(score: { wpm: number; acc: number } | null): void {
  startCompetitionAttempt();
  endCompetitionAttempt(score);
}

describe("competition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 10, 12));
    __testing.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("is off until activated", () => {
    expect(isCompetitionActive()).toBe(false);
    expect(isCompetitionOver()).toBe(false);

    activateCompetition(null);

    expect(isCompetitionActive()).toBe(true);
  });

  it("keeps the challenger of an earlier link when activated without one", () => {
    activateCompetition(challenger);
    activateCompetition(null);

    expect(getCompetitionChallenger()).toEqual(challenger);
  });

  it("replaces the challenger with a new link's", () => {
    activateCompetition(challenger);
    activateCompetition({ name: "Bo", wpm: 60, acc: 90 });

    expect(getCompetitionChallenger()?.name).toBe("Bo");
  });

  it("uses up an attempt when a test starts", () => {
    activateCompetition(null);
    expect(getCompetitionAttemptNumber()).toBe(1);

    expect(startCompetitionAttempt()).toBe(true);

    expect(getCompetitionAttempts()).toHaveLength(1);
    expect(getCompetitionAttemptNumber()).toBe(1);

    endCompetitionAttempt({ wpm: 70, acc: 95 });

    expect(getCompetitionAttempts()[0]).toEqual({
      status: "done",
      wpm: 70,
      acc: 95,
    });
    expect(getCompetitionAttemptNumber()).toBe(2);
  });

  it("keeps an abandoned attempt used, without a score", () => {
    activateCompetition(null);
    startCompetitionAttempt();

    expect(endCompetitionAttempt(null)).toBe(true);

    expect(getCompetitionAttempts()[0]?.status).toBe("void");
    expect(getBestCompetitionAttempt()).toBeNull();
  });

  it("reports ending an attempt when none is running", () => {
    activateCompetition(null);

    expect(endCompetitionAttempt(null)).toBe(false);
  });

  it("is over after three attempts, and starts no more", () => {
    activateCompetition(null);
    playAttempt({ wpm: 70, acc: 95 });
    playAttempt(null);
    expect(isCompetitionOver()).toBe(false);

    startCompetitionAttempt();
    // the last attempt is still being typed
    expect(isCompetitionOver()).toBe(false);
    endCompetitionAttempt({ wpm: 75, acc: 92 });

    expect(isCompetitionOver()).toBe(true);
    expect(startCompetitionAttempt()).toBe(false);
    expect(getCompetitionAttempts()).toHaveLength(3);
  });

  it("picks the best attempt by wpm, then accuracy", () => {
    activateCompetition(null);
    playAttempt({ wpm: 70, acc: 99 });
    playAttempt({ wpm: 82, acc: 91 });
    playAttempt({ wpm: 82, acc: 96 });

    expect(getBestCompetitionAttempt()).toEqual({
      status: "done",
      wpm: 82,
      acc: 96,
    });
  });

  it("keeps the attempts used when left and entered again", () => {
    activateCompetition(null);
    playAttempt({ wpm: 70, acc: 95 });

    deactivateCompetition();
    activateCompetition(null);

    expect(getCompetitionAttempts()).toHaveLength(1);
  });

  it("starts a new game the next day", () => {
    activateCompetition(challenger);
    playAttempt({ wpm: 70, acc: 95 });
    playAttempt({ wpm: 71, acc: 95 });
    playAttempt({ wpm: 72, acc: 95 });

    vi.setSystemTime(new Date(2026, 0, 11, 9));

    expect(startCompetitionAttempt()).toBe(true);
    expect(getCompetitionAttempts()).toHaveLength(1);
    expect(isCompetitionActive()).toBe(true);
    expect(getCompetitionChallenger()).toBeNull();
  });

  it("keeps the challenger of a link opened on a new day", () => {
    activateCompetition(null);
    vi.setSystemTime(new Date(2026, 0, 11, 9));

    activateCompetition(challenger);

    expect(getCompetitionChallenger()).toEqual(challenger);
  });
});
