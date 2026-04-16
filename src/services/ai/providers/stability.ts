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

const API_BASE = import.meta.env.DEV
  ? "/api/stability/v2beta"
  : "https://api.stability.ai/v2beta";

export class StabilityAdapter implements AIAdapter {
  readonly name = "Stability AI";
  readonly providerType = "stability" as const;
  readonly capabilities: ProviderCapabilities = {
    supportsInpainting: true,
    supportsMultipleOutputs: false,
    supportsImageReference: true,
  };

  constructor(private apiKey: string) {}

  async generate(options: GenerateOptions): Promise<GeneratedImage[]> {
    const prompt = buildGeneratePrompt(
      options.prompt,
      options.width,
      options.height,
      options.viewType
    );

    // Stability는 복수 출력을 지원하지 않으므로 반복 호출.
    // 부분 실패 시 성공 결과를 보존.
    const results: GeneratedImage[] = [];
    const errors: string[] = [];

    for (let i = 0; i < options.count; i++) {
      try {
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("output_format", "png");

        const response = await fetchWithRetry(
          `${API_BASE}/stable-image/generate/core`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              Accept: "application/json",
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
        results.push({
          base64: data.image,
          metadata: {
            provider: this.name,
            model: "stable-image-core",
            prompt: options.prompt,
            timestamp: Date.now(),
        },
        });
      } catch (err) {
        // 취소는 즉시 전파
        if (err instanceof Error && err.message.includes("취소")) throw err;
        errors.push(err instanceof Error ? err.message : "알 수 없는 오류");
      }
    }

    // 전부 실패하면 에러
    if (results.length === 0) {
      throw new Error(errors[0] ?? "이미지 생성에 실패했습니다.");
    }

    return results;
  }

  async inpaint(options: InpaintOptions): Promise<GeneratedImage> {
    const formData = new FormData();
    formData.append("prompt", options.prompt);
    formData.append("image", base64ToBlob(options.image), "image.png");
    formData.append("mask", base64ToBlob(options.mask), "mask.png");
    formData.append("output_format", "png");

    const response = await fetchWithRetry(
      `${API_BASE}/stable-image/edit/inpaint`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
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
    return {
      base64: data.image,
      metadata: {
        provider: this.name,
        model: "stable-image-inpaint",
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
      options.viewType
    );

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append(
      "image",
      base64ToBlob(options.referenceImage),
      "reference.png"
    );
    formData.append("strength", "0.6");
    formData.append("output_format", "png");

    const response = await fetchWithRetry(
      `${API_BASE}/stable-image/generate/sd3`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
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
    return [
      {
        base64: data.image,
        metadata: {
          provider: this.name,
          model: "sd3-img2img",
          prompt: options.prompt,
          timestamp: Date.now(),
        },
      },
    ];
  }
}

function throwApiError(status: number, body: Record<string, unknown>): never {
  const message = (body?.message as string) ?? "알 수 없는 오류";

  switch (status) {
    case 401:
    case 403:
      throw new Error("API 키가 올바르지 않습니다.");
    case 429:
      throw new Error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
    case 400:
      throw new Error(`잘못된 요청: ${message}`);
    default:
      throw new Error(`API 오류 (${status}): ${message}`);
  }
}
