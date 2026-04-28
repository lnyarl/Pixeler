/**
 * processAnimationSheetToFrames 단위 테스트.
 *
 * - frameCount 별로 splitSheet 분할 + frameCount 길이 결과 반환.
 * - 후처리는 paletteMap 등이 jsdom 환경에서 안전하게 통과 (small ImageData).
 */
import { describe, it, expect } from "vitest";
import { processAnimationSheetToFrames } from "../processAnimationSheet";

function makeColoredSheet(w: number, h: number): ImageData {
  // 단순 RGBA = (r=x%256, g=y%256, b=128, a=255).
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data[i] = x % 256;
      data[i + 1] = y % 256;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, w, h);
}

describe("processAnimationSheetToFrames", () => {
  it("frameCount=4 (2x2) → 4개 프레임 반환", async () => {
    const sheet = makeColoredSheet(16, 16);
    const frames = await processAnimationSheetToFrames({
      sheet,
      frameCount: 4,
      targetWidth: 8,
      targetHeight: 8,
      paletteSize: 4,
    });
    expect(frames).toHaveLength(4);
    for (const f of frames) {
      expect(f.imageData.width).toBe(8);
      expect(f.imageData.height).toBe(8);
      expect(Array.isArray(f.palette)).toBe(true);
    }
  });

  it("frameCount=2 (2x1) → 2개 프레임 반환", async () => {
    const sheet = makeColoredSheet(16, 8);
    const frames = await processAnimationSheetToFrames({
      sheet,
      frameCount: 2,
      targetWidth: 8,
      targetHeight: 8,
      paletteSize: 4,
    });
    expect(frames).toHaveLength(2);
  });

  it("frameCount=3 (3x1) → 3개 프레임", async () => {
    const sheet = makeColoredSheet(24, 8);
    const frames = await processAnimationSheetToFrames({
      sheet,
      frameCount: 3,
      targetWidth: 8,
      targetHeight: 8,
      paletteSize: 4,
    });
    expect(frames).toHaveLength(3);
  });

  it("frameCount=8 (4x2) → 8개 프레임", async () => {
    const sheet = makeColoredSheet(32, 16);
    const frames = await processAnimationSheetToFrames({
      sheet,
      frameCount: 8,
      targetWidth: 8,
      targetHeight: 8,
      paletteSize: 4,
    });
    expect(frames).toHaveLength(8);
  });
});
