// Competition mode's state: a locked 30s test with three attempts a day,
// entered from a ?comp link (url-actions/actions/competition.ts). It lives in
// this browser only (local storage), nothing is sent to the server.
// test/competition.ts drives it from the test engine.

import { createStore, reconcile } from "solid-js/store";
import { z } from "zod";

import { LocalStorageWithSchema } from "../utils/local-storage-with-schema";

export const COMPETITION_MAX_ATTEMPTS = 3;
export const COMPETITION_NAME_MAX_LENGTH = 32;

const AttemptSchema = z.object({
  // running: the test started and hasn't ended. void: restarted, left or
  // invalid, it counts as an attempt with no score
  status: z.enum(["running", "done", "void"]),
  wpm: z.number(),
  acc: z.number(),
});
export type CompetitionAttempt = z.infer<typeof AttemptSchema>;

const ChallengerSchema = z.object({
  name: z.string().max(COMPETITION_NAME_MAX_LENGTH),
  wpm: z.number(),
  acc: z.number(),
});
/** Whose link the player came from, with the score they shared. */
export type CompetitionChallenger = z.infer<typeof ChallengerSchema>;

const CompetitionSchema = z.object({
  active: z.boolean(),
  // the local day the attempts belong to: a new day starts a new game
  day: z.string(),
  attempts: z.array(AttemptSchema),
  challenger: ChallengerSchema.nullable(),
  // the name on the player's share link
  playerName: z.string().max(COMPETITION_NAME_MAX_LENGTH),
});
type Competition = z.infer<typeof CompetitionSchema>;

const fallback: Competition = {
  active: false,
  day: "",
  attempts: [],
  challenger: null,
  playerName: "",
};

const storage = new LocalStorageWithSchema({
  key: "competition",
  schema: CompetitionSchema,
  fallback,
});

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** `state` as a page load finds it: an attempt can't still be running. */
function withoutRunningAttempts(state: Competition): Competition {
  return {
    ...state,
    attempts: state.attempts.map((it) =>
      it.status === "running" ? { ...it, status: "void" } : it,
    ),
  };
}

/** `state` on `day`: a new day starts a new game, without a challenger. */
function onDay(state: Competition, day: string): Competition {
  if (state.day === day) return state;
  return { ...state, day, attempts: [], challenger: null };
}

const [competition, setCompetition] = createStore<Competition>(
  onDay(withoutRunningAttempts(storage.get()), today()),
);

function update(next: Partial<Competition>): void {
  const state = onDay({ ...competition, ...next }, today());
  setCompetition(reconcile(state));
  storage.set(state);
}

export function isCompetitionActive(): boolean {
  return competition.active;
}

export function getCompetitionAttempts(): CompetitionAttempt[] {
  return competition.attempts;
}

export function getCompetitionChallenger(): CompetitionChallenger | null {
  return competition.challenger;
}

export function getCompetitionPlayerName(): string {
  return competition.playerName;
}

export function setCompetitionPlayerName(name: string): void {
  update({ playerName: name.slice(0, COMPETITION_NAME_MAX_LENGTH) });
}

/** The number of the attempt being played, or up next: 1 to the max. */
export function getCompetitionAttemptNumber(): number {
  const { attempts } = competition;
  const running = attempts.some((it) => it.status === "running");
  return Math.min(
    attempts.length + (running ? 0 : 1),
    COMPETITION_MAX_ATTEMPTS,
  );
}

/** Whether every attempt of the day is used up. */
export function isCompetitionOver(): boolean {
  return (
    competition.active &&
    competition.attempts.length >= COMPETITION_MAX_ATTEMPTS &&
    competition.attempts.every((it) => it.status !== "running")
  );
}

/** The scored attempt with the highest wpm, then accuracy. */
export function getBestCompetitionAttempt(): CompetitionAttempt | null {
  let best: CompetitionAttempt | null = null;
  for (const attempt of competition.attempts) {
    if (attempt.status !== "done") continue;
    if (
      best === null ||
      attempt.wpm > best.wpm ||
      (attempt.wpm === best.wpm && attempt.acc > best.acc)
    ) {
      best = attempt;
    }
  }
  return best;
}

/**
 * Turns competition mode on. A `challenger` replaces the one of the link
 * entered before, none keeps it.
 */
export function activateCompetition(
  challenger: CompetitionChallenger | null,
): void {
  // moves to today first: a challenger must not be dropped as yesterday's
  update({});
  update({
    active: true,
    challenger: challenger ?? competition.challenger,
  });
}

/** Turns competition mode off. The day's attempts stay used. */
export function deactivateCompetition(): void {
  update({ active: false });
}

/**
 * Uses up an attempt for the test that starts. Returns false if there is
 * none left.
 */
export function startCompetitionAttempt(): boolean {
  // moves to today first: a page left open overnight gets its new attempts
  update({});
  if (competition.attempts.length >= COMPETITION_MAX_ATTEMPTS) return false;
  update({
    attempts: [
      ...withoutRunningAttempts(competition).attempts,
      { status: "running", wpm: 0, acc: 0 },
    ],
  });
  return true;
}

/**
 * Ends the running attempt with its `score`, or void without one. Returns
 * false if no attempt was running.
 */
export function endCompetitionAttempt(
  score: { wpm: number; acc: number } | null,
): boolean {
  if (!competition.attempts.some((it) => it.status === "running")) {
    return false;
  }
  update({
    attempts: competition.attempts.map((it) =>
      it.status !== "running"
        ? it
        : score === null
          ? { ...it, status: "void" }
          : { status: "done", wpm: score.wpm, acc: score.acc },
    ),
  });
  return true;
}

export const __testing = {
  reset(): void {
    update({ ...fallback });
  },
};
