import { describe, it, expect } from "vitest";
import { downscale } from "../downscale";

describe("downscale", () => {
  it("동일 크기면 원본 반환", () => {
    const src = new ImageData(4, 4);
    const result = downscale(src, 4, 4);
    expect(result).toBe(src);
  });

  it("4x4 → 2x2로 다운스케일", () => {
    const src = new ImageData(4, 4);
    // (0,0) 픽셀을 빨강으로
    src.data[0] = 255;
    src.data[3] = 255;
    // (2,0) 픽셀을 파랑으로
    src.data[8] = 0;
    src.data[9] = 0;
    src.data[10] = 255;
    src.data[11] = 255;

    const result = downscale(src, 2, 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);

    // nearest-neighbor: (0,0) → 원본 (0,0) = 빨강
    expect(result.data[0]).toBe(255);
    // (1,0) → 원본 (2,0) = 파랑
    expect(result.data[6]).toBe(255);
  });

  it("비정사각 다운스케일", () => {
    const src = new ImageData(8, 4);
    const result = downscale(src, 4, 2);
    expect(result.width).toBe(4);
    expect(result.height).toBe(2);
  });
});
