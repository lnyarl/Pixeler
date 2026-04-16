import type { ViewType } from "./types";

const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  "top-down": "top-down view",
  side: "side view",
  quarter: "isometric quarter view",
};

/**
 * 사용자 프롬프트에 스타일 힌트만 삽입. 내용은 사용자 프롬프트에 맡김.
 * "sprite"를 넣으면 AI가 캐릭터로 해석하므로 의도적으로 제외.
 */
export function buildGeneratePrompt(
  userPrompt: string,
  width: number,
  height: number,
  viewType: ViewType
): string {
  const sizeStr = `${width}x${height}`;
  const viewStr = VIEW_TYPE_LABELS[viewType];

  return [
    userPrompt,
    `Style: ${sizeStr} pixel art, ${viewStr}, clean pixel art style, limited color palette, no anti-aliasing, transparent background.`,
  ].join("\n");
}

/**
 * 피드백 기반 재생성 프롬프트.
 */
export function buildFeedbackPrompt(
  originalPrompt: string,
  feedback: string,
  width: number,
  height: number,
  viewType: ViewType
): string {
  const sizeStr = `${width}x${height}`;
  const viewStr = VIEW_TYPE_LABELS[viewType];

  return [
    `Original: ${originalPrompt}`,
    `Change: ${feedback}`,
    `Style: ${sizeStr} pixel art, ${viewStr}, clean pixel art style, limited color palette, no anti-aliasing, transparent background.`,
  ].join("\n");
}
