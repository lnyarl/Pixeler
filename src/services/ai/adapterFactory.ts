import type { AIAdapter, AIProviderType } from "./types";
import { OpenAIAdapter } from "./providers/openai";
import { StabilityAdapter } from "./providers/stability";

/**
 * 제공자 타입과 API 키로 적절한 어댑터 인스턴스를 생성.
 */
export function createAdapter(
  provider: AIProviderType,
  apiKey: string
): AIAdapter {
  switch (provider) {
    case "openai":
      return new OpenAIAdapter(apiKey);
    case "stability":
      return new StabilityAdapter(apiKey);
    default:
      throw new Error(`지원하지 않는 AI 제공자: ${provider}`);
  }
}
