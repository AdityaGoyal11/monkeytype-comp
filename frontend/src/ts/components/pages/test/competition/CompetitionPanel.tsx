import { For, JSXElement, Show } from "solid-js";

import { getUserData } from "../../../../queries/user";
import {
  COMPETITION_MAX_ATTEMPTS,
  COMPETITION_NAME_MAX_LENGTH,
  CompetitionAttempt,
  CompetitionChallenger,
  getBestCompetitionAttempt,
  getCompetitionAttempts,
  getCompetitionChallenger,
  getCompetitionPlayerName,
  isCompetitionOver,
  setCompetitionPlayerName,
} from "../../../../states/competition";
import {
  showErrorNotification,
  showSuccessNotification,
} from "../../../../states/notifications";
import { leaveCompetition } from "../../../../test/competition";
import { restartTest } from "../../../../test/test-logic";
import { cn } from "../../../../utils/cn";
import { Button } from "../../../common/Button";
import {
  buildLinkedInShareUrl,
  buildShareBody,
  buildShareLink,
  buildShareText,
  buildXShareUrl,
} from "./share";
import { createShareImage, shareImage } from "./share-image";

async function leave(): Promise<void> {
  await leaveCompetition();
  await restartTest();
}

/**
 * A competition's score board: the day's attempts and who to beat. Once the
 * attempts are used up, the player shares their best to nominate others.
 */
export function CompetitionPanel(): JSXElement {
  const slots = (): (CompetitionAttempt | undefined)[] =>
    Array.from(
      { length: COMPETITION_MAX_ATTEMPTS },
      (_, index) => getCompetitionAttempts()[index],
    );

  return (
    <div
      class="mb-8 grid justify-items-center gap-6 rounded border-2 border-sub-alt p-6 text-center"
      data-ui-element="competitionPanel"
    >
      <div class="text-2xl text-main">
        {isCompetitionOver()
          ? "game over"
          : `attempt ${getCompetitionAttempts().length} of ${COMPETITION_MAX_ATTEMPTS}`}
      </div>
      <div class="grid grid-cols-3 gap-4 sm:gap-12">
        <For each={slots()}>
          {(attempt, index) => (
            <AttemptSlot
              number={index() + 1}
              attempt={attempt}
              best={
                attempt !== undefined && attempt === getBestCompetitionAttempt()
              }
            />
          )}
        </For>
      </div>
      <Show when={getCompetitionChallenger()}>
        {(challenger) => <Verdict challenger={challenger()} />}
      </Show>
      <Show
        when={isCompetitionOver()}
        fallback={
          <Button
            class="px-8 py-3"
            text="next attempt"
            fa={{ icon: "fa-chevron-right" }}
            onClick={() => void restartTest()}
          />
        }
      >
        <Show
          when={getBestCompetitionAttempt()}
          fallback={<div class="text-sub">none of your attempts scored</div>}
        >
          {(best) => <Share best={best()} />}
        </Show>
        <div class="grid justify-items-center gap-1 text-xs text-sub">
          <div>
            come back tomorrow for {COMPETITION_MAX_ATTEMPTS} new attempts
          </div>
          <Button
            variant="text"
            text="leave the competition and practice"
            fa={{ icon: "fa-sign-out-alt" }}
            onClick={() => void leave()}
          />
        </div>
      </Show>
    </div>
  );
}

function AttemptSlot(props: {
  number: number;
  attempt: CompetitionAttempt | undefined;
  best: boolean;
}): JSXElement {
  const scored = (): CompetitionAttempt | undefined =>
    props.attempt?.status === "done" ? props.attempt : undefined;

  return (
    <div class="grid justify-items-center">
      <div class="text-xs text-sub">
        {props.best ? "best" : `attempt ${props.number}`}
      </div>
      <div
        class={cn(
          "text-[2.5rem] leading-none",
          props.best ? "text-main" : "text-text",
          scored() === undefined && "text-sub",
        )}
      >
        {scored() === undefined ? "-" : Math.round(scored()?.wpm ?? 0)}
      </div>
      <div class="text-xs text-sub">
        <Show
          when={scored()}
          fallback={props.attempt === undefined ? "not played" : "no score"}
        >
          {(attempt) => (
            <>
              wpm<span class="max-sm:hidden"> · </span>
              <span class="max-sm:block">{Math.round(attempt().acc)}% acc</span>
            </>
          )}
        </Show>
      </div>
    </div>
  );
}

/** How the player's best compares to the challenger's score. */
function Verdict(props: { challenger: CompetitionChallenger }): JSXElement {
  const text = (): string => {
    const { name, wpm } = props.challenger;
    const best = getBestCompetitionAttempt();
    if (best === null) return `${name} nominated you: beat ${wpm} wpm`;
    const lead = Math.round(best.wpm) - wpm;
    if (lead > 0) return `you beat ${name}'s ${wpm} wpm by ${lead}`;
    if (lead === 0) return `you tied with ${name} at ${wpm} wpm`;
    return `${name} is ${-lead} wpm ahead with ${wpm} wpm`;
  };

  return <div class="text-text">{text()}</div>;
}

function Share(props: { best: CompetitionAttempt }): JSXElement {
  // the account's name until the player types another
  const name = (): string =>
    getCompetitionPlayerName() || (getUserData()?.name ?? "");
  const date = new Date();
  const link = (): string => buildShareLink(name(), props.best);
  const body = (): string =>
    buildShareBody(getCompetitionAttempts(), props.best, date);
  const text = (): string => buildShareText(body(), link());

  const copy = (message: string): void => {
    void navigator.clipboard
      .writeText(text())
      .then(() => showSuccessNotification(message))
      .catch((error: unknown) =>
        showErrorNotification("Failed to copy your result", { error }),
      );
  };

  const shareToInstagram = async (): Promise<void> => {
    try {
      const image = await createShareImage({
        attempts: getCompetitionAttempts(),
        best: props.best,
        name: name(),
        date,
      });
      const result = await shareImage(image, text());
      if (result === "cancelled") return;
      if (result === "downloaded") {
        // Instagram takes no text from the web: the caption is on the
        // clipboard to paste
        await navigator.clipboard.writeText(text()).catch(() => undefined);
        showSuccessNotification(
          "Card saved and caption copied, post them to Instagram",
          { durationMs: 6000 },
        );
      }
    } catch (error) {
      showErrorNotification("Failed to create your card", { error });
    }
  };

  return (
    <div class="grid w-full max-w-md gap-3">
      <div class="text-text">
        share your {Math.round(props.best.wpm)} wpm and nominate 3 people to
        beat it
      </div>
      <input
        type="text"
        class="w-full text-center"
        placeholder="your name, shown on your link"
        autocomplete="off"
        maxLength={COMPETITION_NAME_MAX_LENGTH}
        value={name()}
        onInput={(event) => setCompetitionPlayerName(event.currentTarget.value)}
      />
      <pre
        class="rounded bg-sub-alt p-3 text-left text-sm break-all whitespace-pre-wrap text-text"
        data-ui-element="competitionShareText"
      >
        {text()}
      </pre>
      <div class="grid gap-3 sm:grid-cols-2">
        <Button
          class="py-3"
          text="post on X"
          fa={{ icon: "fa-twitter", variant: "brand" }}
          href={buildXShareUrl(body(), link())}
        />
        <Button
          class="py-3"
          text="share on LinkedIn"
          fa={{ icon: "fa-linkedin", variant: "brand" }}
          href={buildLinkedInShareUrl(text())}
          // the post is on the clipboard too, should LinkedIn not prefill it
          onClick={() => copy("Post copied, tag your 3 people in it")}
        />
        <Button
          class="py-3"
          text="share to Instagram"
          fa={{ icon: "fa-instagram", variant: "brand" }}
          onClick={() => void shareToInstagram()}
        />
        <Button
          class="py-3"
          text="copy result"
          fa={{ icon: "fa-copy" }}
          onClick={() => copy("Copied, send it to your 3 people")}
        />
      </div>
      <div class="text-xs text-sub">
        add the @names of 3 people you nominate, or send them the link: it opens
        this test with your score to beat
      </div>
    </div>
  );
}
