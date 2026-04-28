/**
 * 방향 페이즈 prompt builder (§5.2.4).
 *
 * - 시트 호출용 buildDirectionSheetPrompt — 4/8 view 그리드.
 * - 단일 셀 재생성용 buildSingleDirectionPrompt — 한 방향 단독.
 * - palette 힌트는 rgb() 형식 (W8: hex보다 모델에 잘 먹힘).
 */
import type { DirKey, DirectionMode, RGB } from "@/services/persistence/types";

const MAX_HINT_COLORS = 16;

const DIRECTION_TEXT: Record<DirKey, string> = {
  N: "back view (N, facing away from camera)",
  NE: "back-right diagonal (NE)",
  E: "right side view (E)",
  SE: "front-right diagonal (SE)",
  S: "front view (S, facing camera)",
  SW: "front-left diagonal (SW)",
  W: "left side view (W)",
  NW: "back-left diagonal (NW)",
};

interface StyleOptions {
  width: number;
  height: number;
  paletteSize: number;
  requireEdges?: boolean;
}

function buildStyleLine(opts: StyleOptions): string {
  const sizeStr = `${opts.width}x${opts.height}`;
  const paletteStr =
    opts.paletteSize > 0
      ? `strictly limited ${opts.paletteSize}-color palette`
      : `limited color palette`;
  const base = `Style: ${sizeStr} pixel art per cell, clean pixel art style, ${paletteStr}, no anti-aliasing, transparent background.`;
  return opts.requireEdges
    ? `${base} Each shape must have clear 1-pixel dark outlines along its edges.`
    : base;
}

/** RGB 배열 → "rgb(r,g,b), rgb(r,g,b), ..." 직렬화. 빈 배열 시 빈 문자열. */
export function serializePaletteHint(palette: ReadonlyArray<RGB>): string {
  if (!palette || palette.length === 0) return "";
  const limited = palette.slice(0, MAX_HINT_COLORS);
  return limited.map(([r, g, b]) => `rgb(${r},${g},${b})`).join(", ");
}

export interface BuildDirectionSheetPromptOptions {
  /** 베이스 prompt에서 승계한 캐릭터 설명. */
  characterDescription: string;
  mode: DirectionMode;
  /** 베이스 sprite에서 추출한 팔레트 (힌트). */
  basePalette: ReadonlyArray<RGB>;
  /** 사용자가 입력한 추가 설명 (선택). */
  userExtra?: string;
  width: number;
  height: number;
  paletteSize: number;
  requireEdges?: boolean;
}

export function buildDirectionSheetPrompt(
  opts: BuildDirectionSheetPromptOptions
): string {
  const lines: string[] = [];

  lines.push(`Character sheet of ${opts.characterDescription}.`);

  if (opts.mode === 4) {
    lines.push("4 views laid out in a 2x2 grid:");
    lines.push("- top-left: " + DIRECTION_TEXT.N);
    lines.push("- top-right: " + DIRECTION_TEXT.E);
    lines.push("- bottom-left: " + DIRECTION_TEXT.W);
    lines.push("- bottom-right: " + DIRECTION_TEXT.S);
    lines.push(
      "Keep all four views consistent in proportions, design, and details."
    );
  } else {
    lines.push(
      "8 views laid out in a 3x3 grid (center cell intentionally left empty / blank):"
    );
    lines.push(
      "- top row: " +
        DIRECTION_TEXT.NW +
        ", " +
        DIRECTION_TEXT.N +
        ", " +
        DIRECTION_TEXT.NE
    );
    lines.push(
      "- middle row: " +
        DIRECTION_TEXT.W +
        ", [empty/blank], " +
        DIRECTION_TEXT.E
    );
    lines.push(
      "- bottom row: " +
        DIRECTION_TEXT.SW +
        ", " +
        DIRECTION_TEXT.S +
        ", " +
        DIRECTION_TEXT.SE
    );
    lines.push(
      "Keep all eight views consistent in proportions, design, and details."
    );
  }

  lines.push(
    "Each view fills its grid cell, centered, with empty space around if needed."
  );

  const hint = serializePaletteHint(opts.basePalette);
  if (hint) {
    lines.push(`Use these base colors where possible: ${hint}.`);
  }

  if (opts.userExtra && opts.userExtra.trim()) {
    lines.push(`Additional notes: ${opts.userExtra.trim()}`);
  }

  lines.push(
    buildStyleLine({
      width: opts.width,
      height: opts.height,
      paletteSize: opts.paletteSize,
      requireEdges: opts.requireEdges,
    })
  );

  return lines.join("\n");
}

export interface BuildSingleDirectionPromptOptions {
  characterDescription: string;
  direction: DirKey;
  basePalette: ReadonlyArray<RGB>;
  userExtra?: string;
  width: number;
  height: number;
  paletteSize: number;
  requireEdges?: boolean;
}

export function buildSingleDirectionPrompt(
  opts: BuildSingleDirectionPromptOptions
): string {
  const lines: string[] = [];
  const dirText = DIRECTION_TEXT[opts.direction];
  lines.push(
    `Single ${dirText} of ${opts.characterDescription}, centered in frame, transparent background.`
  );
  lines.push(
    "Keep the character design (proportions, outline, equipment) consistent with the reference image."
  );

  const hint = serializePaletteHint(opts.basePalette);
  if (hint) {
    lines.push(`Use these base colors where possible: ${hint}.`);
  }

  if (opts.userExtra && opts.userExtra.trim()) {
    lines.push(`Additional notes: ${opts.userExtra.trim()}`);
  }

  lines.push(
    buildStyleLine({
      width: opts.width,
      height: opts.height,
      paletteSize: opts.paletteSize,
      requireEdges: opts.requireEdges,
    })
  );

  return lines.join("\n");
}
