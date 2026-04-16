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

    // Stability는 복수 출력을 지원하지 않으므로 반복 호출
    const results: GeneratedImage[] = [];
    for (let i = 0; i < options.count; i++) {
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
    options: FeedbackOptions & { originalPrompt?: string }
  ): Promise<GeneratedImage[]> {
    const prompt = buildFeedbackPrompt(
      options.originalPrompt ?? "",
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
