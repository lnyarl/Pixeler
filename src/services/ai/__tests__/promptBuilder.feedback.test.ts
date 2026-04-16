import { describe, it, expect } from "vitest";
import { buildFeedbackPrompt } from "../promptBuilder";

describe("buildFeedbackPrompt", () => {
  it("원본과 피드백이 구분되어 포함된다", () => {
    const result = buildFeedbackPrompt(
      "파란 기사",
      "검을 더 크게",
      32,
      32,
      "side"
    );

    expect(result).toContain("Original: 파란 기사");
    expect(result).toContain("Change: 검을 더 크게");
  });

  it("원본이 빈 문자열이어도 동작", () => {
    const result = buildFeedbackPrompt("", "더 밝게", 16, 16, "top-down");
    expect(result).toContain("Original: ");
    expect(result).toContain("Change: 더 밝게");
  });

  it("해상도와 뷰타입이 포함된다", () => {
    const result = buildFeedbackPrompt("원본", "수정", 64, 64, "quarter");
    expect(result).toContain("64x64");
    expect(result).toContain("isometric quarter view");
  });
});
