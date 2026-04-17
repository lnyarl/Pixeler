import type { ViewType } from "./types";

const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  "top-down": "top-down view",
  side: "side view",
  quarter: "isometric quarter view",
};

function buildStyleLine(
  width: number,
  height: number,
  viewType: ViewType,
  paletteSize: number
): string {
  const sizeStr = `${width}x${height}`;
  const viewStr = VIEW_TYPE_LABELS[viewType];
  const paletteStr =
    paletteSize > 0
      ? `strictly limited ${paletteSize}-color palette`
      : `limited color palette`;
  return `Style: ${sizeStr} pixel art, ${viewStr}, clean pixel art style, ${paletteStr}, no anti-aliasing, transparent background.`;
}

/** 새 생성 프롬프트 */
export function buildGeneratePrompt(
  userPrompt: string,
  width: number,
  height: number,
  viewType: ViewType,
  paletteSize: number = 0
): string {
  return [userPrompt, buildStyleLine(width, height, viewType, paletteSize)].join(
    "\n"
  );
}

/** 피드백 기반 재생성 프롬프트 */
export function buildFeedbackPrompt(
  originalPrompt: string,
  feedback: string,
  width: number,
  height: number,
  viewType: ViewType,
  paletteSize: number = 0
): string {
  return [
    `Original: ${originalPrompt}`,
    `Change: ${feedback}`,
    buildStyleLine(width, height, viewType, paletteSize),
  ].join("\n");
}
