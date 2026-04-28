function buildStyleLine(
  width: number,
  height: number,
  paletteSize: number,
  requireEdges?: boolean
): string {
  const sizeStr = `${width}x${height}`;
  const paletteStr =
    paletteSize > 0
      ? `strictly limited ${paletteSize}-color palette`
      : `limited color palette`;
  const base = `Style: ${sizeStr} pixel art, clean pixel art style, ${paletteStr}, no anti-aliasing, transparent background.`;
  return requireEdges
    ? `${base} Each shape must have clear 1-pixel dark outlines along its edges.`
    : base;
}

/** 새 생성 프롬프트 */
export function buildGeneratePrompt(
  userPrompt: string,
  width: number,
  height: number,
  paletteSize: number = 0,
  requireEdges?: boolean
): string {
  return [
    userPrompt,
    buildStyleLine(width, height, paletteSize, requireEdges),
  ].join("\n");
}

/** 피드백 기반 재생성 프롬프트 */
export function buildFeedbackPrompt(
  originalPrompt: string,
  feedback: string,
  width: number,
  height: number,
  paletteSize: number = 0,
  requireEdges?: boolean
): string {
  return [
    `Original: ${originalPrompt}`,
    `Change: ${feedback}`,
    buildStyleLine(width, height, paletteSize, requireEdges),
  ].join("\n");
}

/**
 * 마스크 오버레이 기반 부분 수정 프롬프트.
 * 참조 이미지에 빨간색으로 마스킹 영역이 표시되어 있음을 AI에 설명.
 *
 * 시그니처는 buildFeedbackPrompt와 동일(6인자) — 어댑터의 함수형 분기 변수
 * 패턴(`const promptBuilder = options.masked ? buildMaskedFeedbackPrompt : buildFeedbackPrompt`)
 * 안전성 보장. 한쪽만 갱신 시 TypeScript가 변수 함수 타입을 좁혀 컴파일 에러로 잡힘.
 */
export function buildMaskedFeedbackPrompt(
  originalPrompt: string,
  feedback: string,
  width: number,
  height: number,
  paletteSize: number = 0,
  requireEdges?: boolean
): string {
  return [
    `Original: ${originalPrompt}`,
    `Change: ${feedback}`,
    `The area marked with red semi-transparent overlay in the reference image is where this change should be applied. Only modify that area while keeping the rest of the image as similar as possible to the reference.`,
    buildStyleLine(width, height, paletteSize, requireEdges),
  ].join("\n");
}
