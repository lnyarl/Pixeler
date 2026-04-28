import { describe, it, expect } from "vitest";
import { buildFeedbackPrompt } from "../promptBuilder";

const EDGE_TEXT = "Each shape must have clear 1-pixel dark outlines along its edges.";

describe("buildFeedbackPrompt", () => {
  it("원본과 피드백이 구분되어 포함된다", () => {
    const result = buildFeedbackPrompt("파란 기사", "검을 더 크게", 32, 32);
    expect(result).toContain("Original: 파란 기사");
    expect(result).toContain("Change: 검을 더 크게");
  });

  it("원본이 빈 문자열이어도 동작", () => {
    const result = buildFeedbackPrompt("", "더 밝게", 16, 16);
    expect(result).toContain("Original: ");
    expect(result).toContain("Change: 더 밝게");
  });

  it("해상도가 포함된다", () => {
    const result = buildFeedbackPrompt("원본", "수정", 64, 64);
    expect(result).toContain("64x64");
  });

  // T16(feedback): requireEdges=true 외곽선 텍스트 포함
  it("requireEdges=true면 외곽선 텍스트가 포함된다", () => {
    const result = buildFeedbackPrompt("원본", "수정", 32, 32, 16, true);
    expect(result).toContain(EDGE_TEXT);
  });

  // T17(feedback): false/미전달 회귀
  it("requireEdges=false면 외곽선 텍스트가 없다", () => {
    const result = buildFeedbackPrompt("원본", "수정", 32, 32, 16, false);
    expect(result).not.toContain(EDGE_TEXT);
  });

  it("requireEdges 미전달은 false와 동일 (회귀)", () => {
    const without = buildFeedbackPrompt("원본", "수정", 32, 32, 16);
    const explicitFalse = buildFeedbackPrompt("원본", "수정", 32, 32, 16, false);
    expect(without).toBe(explicitFalse);
    expect(without).not.toContain(EDGE_TEXT);
  });

  // T18(feedback): paletteSize=0과 직교
  it("requireEdges=true && paletteSize=0이면 둘 다 포함", () => {
    const result = buildFeedbackPrompt("원본", "수정", 32, 32, 0, true);
    expect(result).toContain(EDGE_TEXT);
    expect(result).toContain("limited color palette");
  });
});
