// Competition mode's rules for the test engine (test-logic.ts): the locked
// test settings, and which tests count as an attempt. Its state:
// states/competition.ts

import { Config as ConfigType } from "@monkeytype/schemas/configs";
import { typedKeys } from "@monkeytype/util/objects";

import { loadFromLocalStorage } from "../config/lifecycle";
import { setConfig } from "../config/setters";
import { Config } from "../config/store";
import { configEvent } from "../events/config";
import {
  activateCompetition,
  COMPETITION_MAX_ATTEMPTS,
  CompetitionChallenger,
  deactivateCompetition,
  endCompetitionAttempt,
  getCompetitionAttempts,
  isCompetitionActive,
  startCompetitionAttempt,
} from "../states/competition";
import { showNoticeNotification } from "../states/notifications";
import type { CompletedResult } from "../states/test";

// every player types the same test. In the order to apply: a funbox can
// block the mode, the mode sets punctuation and numbers
const COMPETITION_CONFIG = {
  funbox: [],
  mode: "time",
  time: 30,
  punctuation: false,
  numbers: false,
  language: "english",
  difficulty: "normal",
  lazyMode: false,
} as const satisfies Partial<ConfigType>;

type LockedKey = keyof typeof COMPETITION_CONFIG;

function isLockedKey(key: string): key is LockedKey {
  return Object.hasOwn(COMPETITION_CONFIG, key);
}

function isLockedValue(key: LockedKey, value: unknown): boolean {
  const locked = COMPETITION_CONFIG[key];
  if (Array.isArray(locked)) {
    return Array.isArray(value) && value.length === locked.length;
  }
  return value === locked;
}

/**
 * Sets the test settings a competition locks, without saving them. Returns
 * whether any changed.
 */
function applyCompetitionConfig(): boolean {
  let changed = false;
  for (const key of typedKeys(COMPETITION_CONFIG)) {
    if (isLockedValue(key, Config[key])) continue;
    setConfig(key, COMPETITION_CONFIG[key] as ConfigType[typeof key], {
      nosave: true,
    });
    changed = true;
  }
  return changed;
}

/**
 * Enters competition mode, with the challenger of the link if it has one.
 * The caller restarts the test.
 */
export function enterCompetition(
  challenger: CompetitionChallenger | null,
): void {
  activateCompetition(challenger);
  applyCompetitionConfig();
}

/**
 * Leaves competition mode, back to the user's own settings. The caller
 * restarts the test.
 */
export async function leaveCompetition(): Promise<void> {
  deactivateCompetition();
  // the locked settings were never saved
  await loadFromLocalStorage();
}

/**
 * Applies the locked settings if a competition is on, eg. one left on by an
 * earlier visit. Returns whether any changed.
 */
export function resumeCompetition(): boolean {
  return isCompetitionActive() && applyCompetitionConfig();
}

/**
 * Keeps the locked settings during a competition: a change to one (the
 * commandline, the account's config loading) is undone. `onRevert` runs
 * after settings were put back.
 */
export function keepCompetitionConfig(onRevert: () => void): void {
  let queued = false;
  configEvent.subscribe(({ key }) => {
    if (queued || !isCompetitionActive()) return;
    if (key !== "fullConfigChangeFinished" && !isLockedKey(key)) return;
    // after the change is done: setting a config inside its event nests them
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (resumeCompetition()) onRevert();
    });
  });
}

/** Whether `result` is of the test a competition locks. */
function isCompetitionTest(result: CompletedResult): boolean {
  return (
    result.mode === COMPETITION_CONFIG.mode &&
    result.mode2 === String(COMPETITION_CONFIG.time) &&
    typedKeys(COMPETITION_CONFIG).every(
      (key) =>
        key === "mode" || key === "time" || isLockedValue(key, result[key]),
    ) &&
    !result.bailedOut
  );
}

/**
 * Uses up an attempt for the test that starts. Returns false if it may not
 * start: the day's attempts are used up.
 */
export function onCompetitionTestStart(): boolean {
  if (!isCompetitionActive()) return true;
  return startCompetitionAttempt();
}

/**
 * Scores the attempt of the test that ended. An invalid test, or one with
 * other settings, uses up the attempt without a score.
 */
export function onCompetitionTestEnd(
  result: CompletedResult,
  valid: boolean,
): void {
  endCompetitionAttempt(
    valid && isCompetitionTest(result)
      ? { wpm: result.wpm, acc: result.acc }
      : null,
  );
}

/** A running test that was restarted or left used up its attempt. */
export function onCompetitionTestAbandoned(): void {
  if (!endCompetitionAttempt(null)) return;
  showNoticeNotification(
    `Attempt ${getCompetitionAttempts().length} of ${COMPETITION_MAX_ATTEMPTS} used up without a score`,
    { important: true },
  );
}
