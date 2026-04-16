import type { ViewType } from "./types";

const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  "top-down": "top-down view",
  side: "side view",
  quarter: "isometric quarter view",
};

/**
 * 사용자 프롬프트에 시스템 컨텍스트를 자동 삽입하여 AI에 전달할 최종 프롬프트를 구성.
 */
export function buildGeneratePrompt(
  userPrompt: string,
  width: number,
  height: number,
  viewType: ViewType
): string {
  const sizeStr =
    width === height ? `${width}x${height}` : `${width}x${height}`;
  const viewStr = VIEW_TYPE_LABELS[viewType];

  return [
    `${sizeStr} pixel art sprite, ${viewStr}.`,
    `Clean pixel art style, limited color palette, no anti-aliasing, transparent background.`,
    userPrompt,
  ].join("\n");
}

/**
 * 피드백 기반 재생성 프롬프트.
 * 이전 프롬프트 + 피드백 텍스트를 결합.
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
    `${sizeStr} pixel art sprite, ${viewStr}.`,
    `Clean pixel art style, limited color palette, no anti-aliasing, transparent background.`,
    `Original request: ${originalPrompt}`,
    `Modification request: ${feedback}`,
  ].join("\n");
}
