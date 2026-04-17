import type {
  AIAdapter,
  GenerateOptions,
  GeneratedImage,
  InpaintOptions,
  FeedbackOptions,
  ProviderCapabilities,
} from "../types";
import { fetchWithRetry } from "../fetchWithRetry";
import { buildGeneratePrompt, buildFeedbackPrompt } from "../promptBuilder";
import { base64ToBlob } from "@/utils/imageConvert";

// 개발: Vite proxy, 프로덕션: 직접 호출 또는 별도 프록시
const API_BASE = import.meta.env.DEV
  ? "/api/openai/v1"
  : "https://api.openai.com/v1";

export class OpenAIAdapter implements AIAdapter {
  readonly name = "OpenAI GPT Image";
  readonly providerType = "openai" as const;
  readonly capabilities: ProviderCapabilities = {
    supportsInpainting: true,
    supportsMultipleOutputs: true,
    supportsImageReference: true,
  };

  constructor(private apiKey: string) {}

  async generate(options: GenerateOptions): Promise<GeneratedImage[]> {
    const prompt = buildGeneratePrompt(
      options.prompt,
      options.width,
      options.height,
      options.viewType,
      options.paletteSize
    );

    const response = await fetchWithRetry(
      `${API_BASE}/images/generations`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt,
          n: options.count,
          size: "1024x1024",
          output_format: "png",
        }),
      },
      { signal: options.signal }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throwApiError(response.status, errorBody);
    }

    const data = await response.json();
    const timestamp = Date.now();

    return data.data.map((item: { b64_json?: string; b64?: string }) => ({
      base64: item.b64_json ?? item.b64 ?? "",
      metadata: {
        provider: this.name,
        model: "gpt-image-1",
        prompt: options.prompt,
        timestamp,
      },
    }));
  }

  async inpaint(options: InpaintOptions): Promise<GeneratedImage> {
    // OpenAI edit API는 FormData로 전달
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("prompt", options.prompt);
    formData.append("image", base64ToBlob(options.image), "image.png");
    formData.append("mask", base64ToBlob(options.mask), "mask.png");
    formData.append("size", "1024x1024");
    formData.append("output_format", "png");

    const response = await fetchWithRetry(
      `${API_BASE}/images/edits`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      },
      { signal: options.signal }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throwApiError(response.status, errorBody);
    }

    const data = await response.json();

    const item = data.data[0];
    return {
      base64: item.b64_json ?? item.b64 ?? "",
      metadata: {
        provider: this.name,
        model: "gpt-image-1",
        prompt: options.prompt,
        timestamp: Date.now(),
      },
    };
  }

  async regenerateWithFeedback(
    options: FeedbackOptions
  ): Promise<GeneratedImage[]> {
    const prompt = buildFeedbackPrompt(
      options.originalPrompt,
      options.prompt,
      options.width,
      options.height,
      options.viewType,
      options.paletteSize
    );

    // 참조 이미지와 함께 edit API 사용
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("prompt", prompt);
    formData.append(
      "image",
      base64ToBlob(options.referenceImage),
      "reference.png"
    );
    formData.append("size", "1024x1024");
    formData.append("output_format", "png");

    const response = await fetchWithRetry(
      `${API_BASE}/images/edits`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      },
      { signal: options.signal }
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throwApiError(response.status, errorBody);
    }

    const data = await response.json();

    return data.data.map((item: { b64_json?: string; b64?: string }) => ({
      base64: item.b64_json ?? item.b64 ?? "",
      metadata: {
        provider: this.name,
        model: "gpt-image-1",
        prompt: options.prompt,
        timestamp: Date.now(),
      },
    }));
  }
}

function throwApiError(status: number, body: Record<string, unknown>): never {
  const message =
    (body?.error as Record<string, unknown>)?.message ?? "알 수 없는 오류";

  switch (status) {
    case 401:
      throw new Error("API 키가 올바르지 않습니다.");
    case 429:
      throw new Error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
    case 400:
      if (String(message).includes("safety") || String(message).includes("policy")) {
        throw new Error("요청이 AI 정책에 의해 거부되었습니다. 프롬프트를 수정해주세요.");
      }
      throw new Error(`잘못된 요청: ${message}`);
    default:
      throw new Error(`API 오류 (${status}): ${message}`);
  }
}
