import { JSXElement, Show } from "solid-js";

import {
  COMPETITION_MAX_ATTEMPTS,
  getBestCompetitionAttempt,
  getCompetitionAttemptNumber,
  getCompetitionChallenger,
  isCompetitionOver,
} from "../../../../states/competition";
import { isFocusMode, isTestFinished } from "../../../../states/test";
import { cn } from "../../../../utils/cn";
import { Fa } from "../../../common/Fa";

/**
 * Above a competition's test, in place of the test config: the rules, the
 * attempt up next, and who to beat.
 */
export function CompetitionBanner(): JSXElement {
  return (
    <div
      class={cn(
        "mx-auto mb-8 grid max-w-full justify-items-center gap-1 px-4 text-center text-sm transition-opacity duration-125",
        (isFocusMode() || isTestFinished()) && "pointer-events-none opacity-0",
        // the panel takes over
        isCompetitionOver() && "hidden",
      )}
      data-ui-element="competitionBanner"
    >
      <div class="text-base text-main">
        <Fa icon="fa-trophy" class="mr-2" />
        typing competition
      </div>
      <div class="text-sub">
        30 seconds · attempt {getCompetitionAttemptNumber()} of{" "}
        {COMPETITION_MAX_ATTEMPTS}
        <Show when={getBestCompetitionAttempt()}>
          {(best) => <> · best so far {Math.round(best().wpm)} wpm</>}
        </Show>
      </div>
      <Show when={getCompetitionChallenger()}>
        {(challenger) => (
          <div class="text-text">
            {challenger().name} nominated you: beat {challenger().wpm} wpm
          </div>
        )}
      </Show>
      <div class="text-xs text-sub">
        once you start typing the attempt is used, even if you restart
      </div>
    </div>
  );
}
