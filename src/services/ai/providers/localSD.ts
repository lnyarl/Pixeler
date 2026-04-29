import type {
  AIAdapter,
  GenerateOptions,
  GeneratedImage,
  FeedbackOptions,
  ProviderCapabilities,
} from "../types";
import {
  buildGeneratePrompt,
  buildFeedbackPrompt,
  buildMaskedFeedbackPrompt,
} from "../promptBuilder";

const LOCAL_SD_NEGATIVE =
  "realistic, photographic, 3D render, anti-aliasing, smooth gradients, blurry, soft shading, watermark";

export class LocalSDAdapter implements AIAdapter {
  readonly name = "Local SD";
  readonly capabilities: ProviderCapabilities = {
    supportsMultipleOutputs: true,
    supportsImageReference: true,
    supportsControlStructure: false,
  };

  constructor(
    private baseUrl: string,
    private loraName?: string,
    private loraWeight: number = 0.8
  ) {}

  /** prompt 뒤에 LoRA 태그를 삽입한다 (loraName이 있을 때만). */
  private applyLora(prompt: string): string {
    if (!this.loraName) return prompt;
    return `${prompt} <lora:${this.loraName}:${this.loraWeight}>`;
  }

  async generate(options: GenerateOptions): Promise<GeneratedImage[]> {
    const basePrompt = buildGeneratePrompt(
      options.prompt,
      options.width,
      options.height,
      options.paletteSize,
      options.requireEdges
    );
    const prompt = this.applyLora(basePrompt);

    const results: GeneratedImage[] = [];
    const errors: string[] = [];

    for (let i = 0; i < options.count; i++) {
      if (options.signal?.aborted) {
        throw new Error("생성이 취소되었습니다.");
      }

      try {
        const response = await fetch(`${this.baseUrl}/txt2img`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            negative_prompt: LOCAL_SD_NEGATIVE,
            width: options.width,
            height: options.height,
            sample_steps: 20,
            cfg_scale: 7.0,
            seed: -1,
            batch_count: 1,
          }),
          signal: options.signal,
        });

        if (!response.ok) {
          throw new Error(`Local SD 오류 (${response.status}): ${response.statusText}`);
        }

        const data = await response.json();
        const base64: string = data.images?.[0];
        if (!base64) throw new Error("Local SD 응답에 이미지가 없습니다.");

        results.push({
          base64,
          metadata: {
            provider: this.name,
            model: "local-sd-txt2img",
            prompt: options.prompt,
            timestamp: Date.now(),
          },
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error("생성이 취소되었습니다.", { cause: err });
        }
        errors.push(err instanceof Error ? err.message : "알 수 없는 오류");
      }
    }

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
    const basePrompt = promptBuilder(
      options.originalPrompt,
      options.prompt,
      options.width,
      options.height,
      options.paletteSize,
      options.requireEdges
    );
    const prompt = this.applyLora(basePrompt);

    const response = await fetch(`${this.baseUrl}/img2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        init_images: [options.referenceImage],
        prompt,
        negative_prompt: LOCAL_SD_NEGATIVE,
        width: options.width,
        height: options.height,
        sample_steps: 20,
        cfg_scale: 7.0,
        denoising_strength: 0.35,
        seed: -1,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      throw new Error(`Local SD 오류 (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    const base64: string = data.images?.[0];
    if (!base64) throw new Error("Local SD 응답에 이미지가 없습니다.");

    return [
      {
        base64,
        metadata: {
          provider: this.name,
          model: "local-sd-img2img",
          prompt: options.prompt,
          timestamp: Date.now(),
        },
      },
    ];
  }
}
