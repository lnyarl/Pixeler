import { describe, it, expect } from "vitest";
import { buildMaskedFeedbackPrompt } from "../promptBuilder";

describe("buildMaskedFeedbackPrompt", () => {
  it("red overlay 설명이 포함된다", () => {
    const result = buildMaskedFeedbackPrompt(
      "원본 기사",
      "투구 추가",
      32,
      32,
      "side",
      16
    );
    expect(result).toContain("red");
    expect(result).toContain("overlay");
  });

  it("원본 프롬프트와 피드백이 포함된다", () => {
    const result = buildMaskedFeedbackPrompt(
      "기사 캐릭터",
      "투구 추가",
      32,
      32,
      "side",
      16
    );
    expect(result).toContain("Original: 기사 캐릭터");
    expect(result).toContain("Change: 투구 추가");
  });

  it("팔레트 크기가 프롬프트에 포함된다", () => {
    const result = buildMaskedFeedbackPrompt(
      "원본",
      "수정",
      32,
      32,
      "side",
      8
    );
    expect(result).toContain("8-color palette");
  });

  it("팔레트 크기 0이면 제한 없음 문구", () => {
    const result = buildMaskedFeedbackPrompt("a", "b", 32, 32, "side", 0);
    expect(result).toContain("limited color palette");
    expect(result).not.toContain("strictly limited 0-color");
  });

  it("해상도와 뷰타입", () => {
    const result = buildMaskedFeedbackPrompt("a", "b", 64, 32, "quarter", 0);
    expect(result).toContain("64x32");
    expect(result).toContain("isometric quarter view");
  });
});
