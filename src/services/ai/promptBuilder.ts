function buildStyleLine(
  width: number,
  height: number,
  paletteSize: number
): string {
  const sizeStr = `${width}x${height}`;
  const paletteStr =
    paletteSize > 0
      ? `strictly limited ${paletteSize}-color palette`
      : `limited color palette`;
  return `Style: ${sizeStr} pixel art, clean pixel art style, ${paletteStr}, no anti-aliasing, transparent background.`;
}

/** 새 생성 프롬프트 */
export function buildGeneratePrompt(
  userPrompt: string,
  width: number,
  height: number,
  paletteSize: number = 0
): string {
  return [userPrompt, buildStyleLine(width, height, paletteSize)].join("\n");
}

/** 피드백 기반 재생성 프롬프트 */
export function buildFeedbackPrompt(
  originalPrompt: string,
  feedback: string,
  width: number,
  height: number,
  paletteSize: number = 0
): string {
  return [
    `Original: ${originalPrompt}`,
    `Change: ${feedback}`,
    buildStyleLine(width, height, paletteSize),
  ].join("\n");
}

/**
 * 마스크 오버레이 기반 부분 수정 프롬프트.
 * 참조 이미지에 빨간색으로 마스킹 영역이 표시되어 있음을 AI에 설명.
 */
export function buildMaskedFeedbackPrompt(
  originalPrompt: string,
  feedback: string,
  width: number,
  height: number,
  paletteSize: number = 0
): string {
  return [
    `Original: ${originalPrompt}`,
    `Change: ${feedback}`,
    `The area marked with red semi-transparent overlay in the reference image is where this change should be applied. Only modify that area while keeping the rest of the image as similar as possible to the reference.`,
    buildStyleLine(width, height, paletteSize),
  ].join("\n");
}
