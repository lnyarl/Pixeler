import { describe, it, expect } from "vitest";
import { hexToRgba, screenToPixel, fillPixels } from "../pixelOps";

describe("hexToRgba", () => {
  it("#ffffff → [255,255,255,255]", () => {
    expect(hexToRgba("#ffffff")).toEqual([255, 255, 255, 255]);
  });

  it("#000000 → [0,0,0,255]", () => {
    expect(hexToRgba("#000000")).toEqual([0, 0, 0, 255]);
  });

  it("#ff0000 → [255,0,0,255]", () => {
    expect(hexToRgba("#ff0000")).toEqual([255, 0, 0, 255]);
  });
});

describe("screenToPixel", () => {
  const rect = { left: 100, top: 50, right: 420, bottom: 370 } as DOMRect;

  it("줌 1x에서 정확한 좌표 변환", () => {
    const result = screenToPixel(110, 60, rect, 32, 10);
    expect(result).toEqual({ x: 1, y: 1 });
  });

  it("줌 10x에서 좌표 변환", () => {
    const result = screenToPixel(100, 50, rect, 32, 10);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("캔버스 밖 좌표는 null", () => {
    const result = screenToPixel(50, 50, rect, 32, 10);
    expect(result).toBeNull();
  });

  it("해상도 초과 좌표는 null", () => {
    const result = screenToPixel(500, 500, rect, 32, 10);
    expect(result).toBeNull();
  });
});

describe("fillPixels", () => {
  it("브러시 1px로 단일 픽셀 채우기", () => {
    const imgData = new ImageData(4, 4);
    fillPixels(imgData, 1, 1, 1, [255, 0, 0, 255]);
    const idx = (1 * 4 + 1) * 4;
    expect(imgData.data[idx]).toBe(255);
    expect(imgData.data[idx + 1]).toBe(0);
    expect(imgData.data[idx + 2]).toBe(0);
    expect(imgData.data[idx + 3]).toBe(255);
  });

  it("브러시 2px로 2x2 영역 채우기", () => {
    const imgData = new ImageData(4, 4);
    fillPixels(imgData, 1, 1, 2, [0, 255, 0, 255]);

    // 2x2 브러시: half=1, 범위 [-1,0], 중심(1,1) 기준 → (0,0),(1,0),(0,1),(1,1)
    for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const idx = (y * 4 + x) * 4;
      expect(imgData.data[idx + 1]).toBe(255);
    }
  });

  it("캔버스 경계 밖 좌표는 무시", () => {
    const imgData = new ImageData(4, 4);
    // 경계에서 브러시가 넘어가도 에러 없이 동작
    expect(() => fillPixels(imgData, 0, 0, 3, [255, 0, 0, 255])).not.toThrow();
  });
});
