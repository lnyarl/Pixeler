/** AI 제공자가 지원하는 기능 플래그 */
export interface ProviderCapabilities {
  supportsMultipleOutputs: boolean;
  /** img2img / 피드백 재생성용. 마스크 오버레이 기반 부분 수정도 이걸로 충분 */
  supportsImageReference: boolean;
}

/** 이미지 생성 옵션 */
export interface GenerateOptions {
  prompt: string;
  width: number;
  height: number;
  /** 생성할 이미지 수 (1~4) */
  count: number;
  /** 팔레트 색상 수 — 프롬프트에 삽입 (0이면 제한 없음) */
  paletteSize?: number;
  /** 요청 취소용 */
  signal?: AbortSignal;
}

/** 피드백 기반 재생성 옵션 */
export interface FeedbackOptions {
  /** 피드백/수정 요청 텍스트 */
  prompt: string;
  /** 원본 프롬프트 */
  originalPrompt: string;
  /** 이전 이미지 (base64 PNG) */
  referenceImage: string;
  width: number;
  height: number;
  /** 팔레트 색상 수 (0이면 제한 없음) */
  paletteSize?: number;
  /**
   * true면 referenceImage에 마스크가 반투명 빨강으로 오버레이되어 있음.
   * 어댑터는 buildMaskedFeedbackPrompt를 써서 AI에 오버레이 의미를 설명한다.
   */
  masked?: boolean;
  signal?: AbortSignal;
}

/** AI 생성 결과 */
export interface GeneratedImage {
  /** base64 인코딩된 PNG 이미지 */
  base64: string;
  metadata: {
    provider: string;
    model: string;
    prompt: string;
    timestamp: number;
  };
}

export type AIProviderType = "openai" | "stability";

/** AI 어댑터 인터페이스 — 모든 제공자가 구현 */
export interface AIAdapter {
  readonly name: string;
  readonly providerType: AIProviderType;
  readonly capabilities: ProviderCapabilities;

  /** 텍스트 프롬프트로 이미지 생성 */
  generate(options: GenerateOptions): Promise<GeneratedImage[]>;

  /**
   * 참조 이미지 기반 재생성 — capabilities.supportsImageReference가 true일 때만.
   * options.masked가 true면 referenceImage에 마스크 오버레이가 적용되어 있음.
   */
  regenerateWithFeedback?(options: FeedbackOptions): Promise<GeneratedImage[]>;
}
