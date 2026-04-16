import { describe, it, expect } from "vitest";
import { buildGeneratePrompt, buildFeedbackPrompt } from "../promptBuilder";

describe("buildGeneratePrompt", () => {
  it("해상도, 뷰타입, 스타일 힌트가 포함된다", () => {
    const result = buildGeneratePrompt("기사 캐릭터", 32, 32, "side");
    expect(result).toContain("32x32");
    expect(result).toContain("side view");
    expect(result).toContain("pixel art");
    expect(result).toContain("기사 캐릭터");
  });

  it("탑다운 뷰타입", () => {
    const result = buildGeneratePrompt("마법사", 16, 16, "top-down");
    expect(result).toContain("top-down view");
  });

  it("쿼터 뷰타입", () => {
    const result = buildGeneratePrompt("건물", 64, 64, "quarter");
    expect(result).toContain("isometric quarter view");
  });

  it("비정사각 해상도", () => {
    const result = buildGeneratePrompt("나무", 32, 64, "side");
    expect(result).toContain("32x64");
  });
});

describe("buildFeedbackPrompt", () => {
  it("원본 프롬프트와 피드백이 결합된다", () => {
    const result = buildFeedbackPrompt(
      "기사 캐릭터",
      "검을 더 크게",
      32,
      32,
      "side"
    );
    expect(result).toContain("Original request: 기사 캐릭터");
    expect(result).toContain("Modification request: 검을 더 크게");
    expect(result).toContain("pixel art");
  });
});
