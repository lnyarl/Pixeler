import { describe, it, expect } from "vitest";
import { paletteMap } from "../paletteMap";

describe("paletteMap", () => {
  it("투명 픽셀은 유지된다", () => {
    const src = new ImageData(2, 2);
    // 모두 투명 (alpha=0)
    const result = paletteMap(src, 4);
    expect(result.data[3]).toBe(0);
  });

  it("불투명 픽셀의 색상 수가 제한된다", () => {
    const src = new ImageData(4, 4);
    // 다양한 색상으로 채움
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = (i * 7) % 256; // R
      src.data[i + 1] = (i * 13) % 256; // G
      src.data[i + 2] = (i * 23) % 256; // B
      src.data[i + 3] = 255; // A
    }

    const result = paletteMap(src, 4);

    // 고유 색상 수 세기
    const colors = new Set<string>();
    for (let i = 0; i < result.data.length; i += 4) {
      if (result.data[i + 3] > 0) {
        colors.add(`${result.data[i]},${result.data[i + 1]},${result.data[i + 2]}`);
      }
    }

    expect(colors.size).toBeLessThanOrEqual(4);
  });

  it("거의 투명한 픽셀(alpha<=128)은 완전 투명으로", () => {
    const src = new ImageData(1, 1);
    src.data[0] = 255;
    src.data[1] = 0;
    src.data[2] = 0;
    src.data[3] = 100; // 거의 투명

    const result = paletteMap(src, 16);
    expect(result.data[3]).toBe(0);
  });
});
