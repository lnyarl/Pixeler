/** AI 제공자가 지원하는 기능 플래그 */
export interface ProviderCapabilities {
  supportsInpainting: boolean;
  supportsMultipleOutputs: boolean;
  supportsImageReference: boolean; // img2img / 피드백 재생성용
}

/** 이미지 생성 옵션 */
export interface GenerateOptions {
  prompt: string;
  width: number;
  height: number;
  viewType: ViewType;
  /** 생성할 이미지 수 (1~4) */
  count: number;
  /** 요청 취소용 */
  signal?: AbortSignal;
}

/** Inpainting 옵션 */
export interface InpaintOptions {
  prompt: string;
  /** 원본 이미지 (base64 PNG) */
  image: string;
  /** 마스크 이미지 (base64 PNG, 흰색=수정 영역) */
  mask: string;
  width: number;
  height: number;
  signal?: AbortSignal;
}

/** 피드백 기반 재생성 옵션 */
export interface FeedbackOptions {
  prompt: string;
  /** 이전 이미지 (base64 PNG) */
  referenceImage: string;
  width: number;
  height: number;
  viewType: ViewType;
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

export type ViewType = "top-down" | "side" | "quarter";

export type AIProviderType = "openai" | "stability";

/** AI 어댑터 인터페이스 — 모든 제공자가 구현 */
export interface AIAdapter {
  readonly name: string;
  readonly providerType: AIProviderType;
  readonly capabilities: ProviderCapabilities;

  /** 텍스트 프롬프트로 이미지 생성 */
  generate(options: GenerateOptions): Promise<GeneratedImage[]>;

  /** 부분 수정 (inpainting) — capabilities.supportsInpainting이 true일 때만 */
  inpaint?(options: InpaintOptions): Promise<GeneratedImage>;

  /** 참조 이미지 기반 재생성 — capabilities.supportsImageReference가 true일 때만 */
  regenerateWithFeedback?(options: FeedbackOptions): Promise<GeneratedImage[]>;
}
