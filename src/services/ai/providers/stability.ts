import type {
  AIAdapter,
  GenerateOptions,
  GeneratedImage,
  FeedbackOptions,
  ProviderCapabilities,
  ControlStructureOptions,
} from "../types";
import { fetchWithRetry } from "../fetchWithRetry";
import {
  buildGeneratePrompt,
  buildFeedbackPrompt,
  buildMaskedFeedbackPrompt,
} from "../promptBuilder";
import { base64ToBlob } from "@/utils/imageConvert";

const API_BASE = import.meta.env.DEV
  ? "/api/stability/v2beta"
  : "https://api.stability.ai/v2beta";

export class StabilityAdapter implements AIAdapter {
  readonly name = "Stability AI";
  readonly capabilities: ProviderCapabilities = {
    supportsMultipleOutputs: false,
    supportsImageReference: true,
    supportsControlStructure: true,
  };

  constructor(private apiKey: string) {}

  async generate(options: GenerateOptions): Promise<GeneratedImage[]> {
    const prompt = buildGeneratePrompt(
      options.prompt,
      options.width,
      options.height,
      options.paletteSize,
      options.requireEdges
    );

    // Stability는 복수 출력을 지원하지 않으므로 반복 호출.
    // 부분 실패 시 성공 결과를 보존.
    const results: GeneratedImage[] = [];
    const errors: string[] = [];

    for (let i = 0; i < options.count; i++) {
      try {
        const formData = new FormData();
        formData.append("prompt", prompt);
        formData.append("negative_prompt", "realistic, photographic, 3D render, anti-aliasing, smooth gradients, blurry, soft shading, watermark");
        formData.append("style_preset", "pixel-art");
        formData.append("aspect_ratio", "1:1");
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

  async regenerateWithFeedback(
    options: FeedbackOptions
  ): Promise<GeneratedImage[]> {
    const promptBuilder = options.masked
      ? buildMaskedFeedbackPrompt
      : buildFeedbackPrompt;
    const prompt = promptBuilder(
      options.originalPrompt,
      options.prompt,
      options.width,
      options.height,
      options.paletteSize,
      options.requireEdges
    );

    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("negative_prompt", "realistic, photographic, 3D render, anti-aliasing, smooth gradients, blurry, soft shading, watermark");
    formData.append("mode", "image-to-image");
    formData.append("model", "sd3.5-large-turbo");
    formData.append(
      "image",
      base64ToBlob(options.referenceImage),
      "reference.png"
    );
    formData.append("strength", "0.2");
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

  /**
   * v2beta control/structure (PR-β — 방향 시트 / 단일 방향 셀 재생성).
   *
   * 엔드포인트: POST /v2beta/stable-image/control/structure
   * multipart/form-data 필드 (M5 — width/height 없음, input image 비율 사용):
   *   - image: input PNG (구조 control 가이드)
   *   - prompt
   *   - control_strength (0..1, default 0.7)
   *   - output_format=png
   *
   * 응답: { image: base64, finish_reason, seed } (Accept: application/json)
   */
  async controlStructure(
    options: ControlStructureOptions
  ): Promise<GeneratedImage[]> {
    const formData = new FormData();
    formData.append("prompt", options.prompt);
    formData.append(
      "image",
      base64ToBlob(options.inputImage),
      "structure.png"
    );
    formData.append(
      "control_strength",
      String(options.controlStrength ?? 0.7)
    );
    formData.append("output_format", "png");

    const response = await fetchWithRetry(
      `${API_BASE}/stable-image/control/structure`,
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
          model: "control-structure",
          prompt: options.prompt,
          timestamp: Date.now(),
        },
      },
    ];
  }
}

function throwApiError(status: number, body: Record<string, unknown>): never {
  // Stability v2beta는 { name, errors: [...] } 형식. OpenAI 호환형은 { message }.
  const errors = body?.errors;
  const message =
    (Array.isArray(errors) && errors.length > 0
      ? String(errors[0])
      : (body?.message as string)) ?? "알 수 없는 오류";

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
