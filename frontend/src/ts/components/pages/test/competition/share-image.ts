// The score card the player posts to Instagram, which takes no text or link
// from the web: an image drawn in the player's theme, shared through the
// device's share sheet or, without one, downloaded.

import { CompetitionAttempt } from "../../../../states/competition";
import { download } from "../../../../utils/misc";
import { formatShareDate } from "./share";

const WIDTH = 1080;
const HEIGHT = 1350;
const FILENAME = "typing-comp.png";

type Colors = {
  bg: string;
  main: string;
  sub: string;
  subAlt: string;
  text: string;
};

function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string): string =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    bg: read("--bg-color", "#323437"),
    main: read("--main-color", "#e2b714"),
    sub: read("--sub-color", "#646669"),
    subAlt: read("--sub-alt-color", "#2c2e31"),
    text: read("--text-color", "#d1d0c5"),
  };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, radius);
}

/** The card: the best score, an attempt per square, and where to play. */
export async function createShareImage(options: {
  attempts: CompetitionAttempt[];
  best: CompetitionAttempt;
  name: string;
  date: Date;
}): Promise<Blob> {
  const { attempts, best, name, date } = options;
  // the card is drawn once, the theme's font must be loaded by then
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("No canvas to draw the card on");

  const colors = readColors();
  const font = getComputedStyle(document.body).fontFamily;
  const write = (
    text: string,
    options: { x: number; y: number; size: number; color: string },
  ): void => {
    ctx.font = `${options.size}px ${font}`;
    ctx.fillStyle = options.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, options.x, options.y);
  };
  const middle = WIDTH / 2;

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  write("typing competition", {
    x: middle,
    y: 170,
    size: 56,
    color: colors.main,
  });
  write(`30 seconds · ${formatShareDate(date)}`, {
    x: middle,
    y: 235,
    size: 38,
    color: colors.sub,
  });

  write(String(Math.round(best.wpm)), {
    x: middle,
    y: 640,
    size: 400,
    color: colors.main,
  });
  write(`wpm · ${Math.round(best.acc)}% accuracy`, {
    x: middle,
    y: 735,
    size: 52,
    color: colors.text,
  });
  if (name.trim() !== "") {
    write(name.trim(), { x: middle, y: 830, size: 56, color: colors.text });
  }

  // an attempt per square: the best filled, another score outlined, no
  // score dim
  const size = 250;
  const gap = 45;
  const left =
    (WIDTH - (attempts.length * size + (attempts.length - 1) * gap)) / 2;
  const top = 910;
  attempts.forEach((attempt, index) => {
    const x = left + index * (size + gap);
    const isBest = attempt === best;
    const isScored = attempt.status === "done";

    roundedRect(ctx, x, top, size, 28);
    ctx.fillStyle = isBest ? colors.main : colors.subAlt;
    ctx.fill();
    if (isScored && !isBest) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = colors.main;
      ctx.stroke();
    }

    write(isScored ? String(Math.round(attempt.wpm)) : "-", {
      x: x + size / 2,
      y: top + size / 2 + 36,
      size: 100,
      color: isBest ? colors.bg : isScored ? colors.text : colors.sub,
    });
  });

  write("can you beat it? you get 3 attempts", {
    x: middle,
    y: 1255,
    size: 40,
    color: colors.text,
  });
  write(location.host, { x: middle, y: 1312, size: 34, color: colors.sub });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error("Failed to create the card"));
      else resolve(blob);
    }, "image/png");
  });
}

/**
 * Hands the card to the device's share sheet, where the player picks
 * Instagram, or downloads it where there is none. Returns what happened;
 * "cancelled" is the player closing the sheet.
 */
export async function shareImage(
  image: Blob,
  text: string,
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([image], FILENAME, { type: "image/png" });
  if (
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], text });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      throw error;
    }
  }

  download({ filename: FILENAME, data: image });
  return "downloaded";
}
