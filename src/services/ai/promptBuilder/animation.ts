/**
 * 애니메이션 페이즈 prompt builder (§5.3.4).
 *
 * - 시트 호출용 buildAnimationSheetPrompt — 1xN 또는 2xK 그리드.
 * - 단일 프레임 재생성용 buildSingleAnimationFramePrompt.
 * - palette 힌트는 rgb() 형식 — direction.ts와 동일 규칙 (W8 / m7).
 *
 * "직접 설명" 모드: presetDescriptor=undefined, customDescriptor만 사용.
 */
import type { DirKey, RGB } from "@/services/persistence/types";
import { serializePaletteHint } from "./direction";

const DIRECTION_AS_TEXT: Record<DirKey, string> = {
  N: "away from the camera (back view)",
  NE: "diagonal back-right",
  E: "to the right",
  SE: "diagonal front-right",
  S: "toward the camera (front view)",
  SW: "diagonal front-left",
  W: "to the left",
  NW: "diagonal back-left",
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

/**
 * frameCount → 그리드 레이아웃 (§5.3.6).
 *
 * | frameCount | layout |
 * |---|---|
 * | 2 | 1×2 |
 * | 3 | 1×3 |
 * | 4 | 2×2 |
 * | 5~6 | 2×3 |
 * | 7~8 | 4×2 |
 *
 * 결과는 splitSpriteSheet의 cols/rows에 그대로 사용.
 */
export function frameCountToGrid(frameCount: number): {
  cols: number;
  rows: number;
  label: "1xN" | "2xK";
} {
  if (frameCount <= 1) return { cols: 1, rows: 1, label: "1xN" };
  if (frameCount <= 3) return { cols: frameCount, rows: 1, label: "1xN" };
  if (frameCount === 4) return { cols: 2, rows: 2, label: "2xK" };
  if (frameCount <= 6) return { cols: 3, rows: 2, label: "2xK" };
  // 7~8
  return { cols: 4, rows: 2, label: "2xK" };
}

export interface BuildAnimationSheetPromptOptions {
  /** 베이스/방향 sprite의 캐릭터 설명 — prompt seed. */
  characterDescription: string;
  /** 어느 방향 sprite를 시드로 사용했는지. */
  direction: DirKey;
  /** 프리셋 baseDescriptor (직접 설명 모드면 undefined). */
  presetDescriptor?: string;
  /** 사용자 추가 설명 또는 (직접 설명 모드의) 메인 설명. */
  customDescriptor?: string;
  /** 2~8. */
  frameCount: number;
  /** 베이스/방향 sprite 팔레트 힌트. */
  basePalette: ReadonlyArray<RGB>;
  width: number;
  height: number;
  paletteSize: number;
  requireEdges?: boolean;
}

export function buildAnimationSheetPrompt(
  opts: BuildAnimationSheetPromptOptions
): string {
  const { cols, rows, label } = frameCountToGrid(opts.frameCount);
  const lines: string[] = [];

  lines.push(
    `Animation sheet of ${opts.characterDescription} facing ${DIRECTION_AS_TEXT[opts.direction]}.`
  );

  // 동작 묘사: presetDescriptor 우선, 직접 설명 모드면 customDescriptor만.
  const motionParts: string[] = [];
  if (opts.presetDescriptor && opts.presetDescriptor.trim()) {
    motionParts.push(opts.presetDescriptor.trim());
  }
  if (opts.customDescriptor && opts.customDescriptor.trim()) {
    motionParts.push(opts.customDescriptor.trim());
  }
  const motion =
    motionParts.length > 0
      ? motionParts.join(". ")
      : `a ${opts.frameCount}-frame animation cycle`;
  lines.push(
    `Show ${opts.frameCount} sequential frames of ${motion}, ` +
      `laid out in a ${cols}x${rows} grid (${label}), frames go left-to-right` +
      (rows > 1 ? `, then top-to-bottom` : "") +
      "."
  );

  lines.push(
    "Keep all frames consistent in character design, proportions, outline, and equipment."
  );
  lines.push(
    "Each frame fills its grid cell, centered, with empty space around if needed."
  );

  const hint = serializePaletteHint(opts.basePalette);
  if (hint) {
    lines.push(`Use these base colors where possible: ${hint}.`);
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

export interface BuildSingleAnimationFramePromptOptions {
  characterDescription: string;
  direction: DirKey;
  presetDescriptor?: string;
  customDescriptor?: string;
  /** 1-based 프레임 번호 ("frame 2 of 4"). */
  frameIndex: number;
  /** 전체 프레임 수 (force 컨텍스트). */
  frameCount: number;
  basePalette: ReadonlyArray<RGB>;
  width: number;
  height: number;
  paletteSize: number;
  requireEdges?: boolean;
}

export function buildSingleAnimationFramePrompt(
  opts: BuildSingleAnimationFramePromptOptions
): string {
  const lines: string[] = [];

  lines.push(
    `Single frame ${opts.frameIndex} of ${opts.frameCount} of ${opts.characterDescription} facing ${DIRECTION_AS_TEXT[opts.direction]}, centered, transparent background.`
  );

  const motionParts: string[] = [];
  if (opts.presetDescriptor && opts.presetDescriptor.trim()) {
    motionParts.push(opts.presetDescriptor.trim());
  }
  if (opts.customDescriptor && opts.customDescriptor.trim()) {
    motionParts.push(opts.customDescriptor.trim());
  }
  if (motionParts.length > 0) {
    lines.push(`Motion context: ${motionParts.join(". ")}.`);
  }

  lines.push(
    "Keep the character design consistent with the reference image (proportions, outline, equipment)."
  );

  const hint = serializePaletteHint(opts.basePalette);
  if (hint) {
    lines.push(`Use these base colors where possible: ${hint}.`);
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
