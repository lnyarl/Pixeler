import { describe, it, expect } from "vitest";
import { buildMaskedFeedbackPrompt } from "../promptBuilder";

const EDGE_TEXT = "Each shape must have clear 1-pixel dark outlines along its edges.";

describe("buildMaskedFeedbackPrompt", () => {
  it("red overlay 설명이 포함된다", () => {
    const result = buildMaskedFeedbackPrompt("원본 기사", "투구 추가", 32, 32, 16);
    expect(result).toContain("red");
    expect(result).toContain("overlay");
  });

  it("원본 프롬프트와 피드백이 포함된다", () => {
    const result = buildMaskedFeedbackPrompt("기사 캐릭터", "투구 추가", 32, 32, 16);
    expect(result).toContain("Original: 기사 캐릭터");
    expect(result).toContain("Change: 투구 추가");
  });

  it("팔레트 크기가 프롬프트에 포함된다", () => {
    const result = buildMaskedFeedbackPrompt("원본", "수정", 32, 32, 8);
    expect(result).toContain("8-color palette");
  });

  it("팔레트 크기 0이면 제한 없음 문구", () => {
    const result = buildMaskedFeedbackPrompt("a", "b", 32, 32, 0);
    expect(result).toContain("limited color palette");
    expect(result).not.toContain("strictly limited 0-color");
  });

  it("비정사각 해상도", () => {
    const result = buildMaskedFeedbackPrompt("a", "b", 64, 32, 0);
    expect(result).toContain("64x32");
  });

  // T16(masked): requireEdges=true 외곽선 텍스트 포함
  it("requireEdges=true면 외곽선 텍스트가 포함된다", () => {
    const result = buildMaskedFeedbackPrompt("원본", "투구 추가", 32, 32, 16, true);
    expect(result).toContain(EDGE_TEXT);
    // 마스크 오버레이 문구도 함께 유지되어야 함
    expect(result).toContain("red");
  });

  // T17(masked): false/미전달 회귀
  it("requireEdges=false면 외곽선 텍스트가 없다", () => {
    const result = buildMaskedFeedbackPrompt("원본", "수정", 32, 32, 16, false);
    expect(result).not.toContain(EDGE_TEXT);
  });

  it("requireEdges 미전달은 false와 동일 (기존 회귀)", () => {
    const without = buildMaskedFeedbackPrompt("원본", "수정", 32, 32, 16);
    const explicitFalse = buildMaskedFeedbackPrompt("원본", "수정", 32, 32, 16, false);
    expect(without).toBe(explicitFalse);
    expect(without).not.toContain(EDGE_TEXT);
  });

  // T18(masked): paletteSize=0과 직교
  it("requireEdges=true && paletteSize=0이면 둘 다 포함", () => {
    const result = buildMaskedFeedbackPrompt("원본", "수정", 32, 32, 0, true);
    expect(result).toContain(EDGE_TEXT);
    expect(result).toContain("limited color palette");
  });
});
