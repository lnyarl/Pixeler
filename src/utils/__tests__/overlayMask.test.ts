import { describe, it, expect } from "vitest";
import { overlayMaskOnImage } from "../overlayMask";

function makeImage(w: number, h: number, r: number, g: number, b: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return new ImageData(data, w, h);
}

function makeMask(w: number, h: number, white: boolean[]): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < white.length; i++) {
    const idx = i * 4;
    const v = white[i] ? 255 : 0;
    data[idx] = v;
    data[idx + 1] = v;
    data[idx + 2] = v;
    data[idx + 3] = 255;
  }
  return new ImageData(data, w, h);
}

describe("overlayMaskOnImage", () => {
  it("마스크된 픽셀에 오버레이 색 블렌딩", () => {
    const image = makeImage(2, 1, 0, 0, 0);
    const mask = makeMask(2, 1, [true, false]);
    const result = overlayMaskOnImage(image, mask, [255, 0, 0], 0.5);

    // 0번 픽셀: 블렌딩 (0*0.5 + 255*0.5 = 127.5 → clamped 128)
    expect(result.data[0]).toBeGreaterThanOrEqual(127);
    expect(result.data[0]).toBeLessThanOrEqual(128);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);

    // 1번 픽셀: 원본 유지
    expect(result.data[4]).toBe(0);
    expect(result.data[5]).toBe(0);
    expect(result.data[6]).toBe(0);
  });

  it("alpha=1이면 완전 오버레이 색", () => {
    const image = makeImage(1, 1, 0, 0, 0);
    const mask = makeMask(1, 1, [true]);
    const result = overlayMaskOnImage(image, mask, [100, 200, 50], 1);
    expect(result.data[0]).toBe(100);
    expect(result.data[1]).toBe(200);
    expect(result.data[2]).toBe(50);
  });

  it("alpha=0이면 원본 그대로", () => {
    const image = makeImage(1, 1, 80, 90, 100);
    const mask = makeMask(1, 1, [true]);
    const result = overlayMaskOnImage(image, mask, [255, 0, 0], 0);
    expect(result.data[0]).toBe(80);
    expect(result.data[1]).toBe(90);
    expect(result.data[2]).toBe(100);
  });

  it("크기 불일치 시 에러", () => {
    const image = makeImage(2, 2, 0, 0, 0);
    const mask = makeMask(1, 1, [true]);
    expect(() => overlayMaskOnImage(image, mask)).toThrow();
  });

  it("원본 이미지는 수정되지 않음 (immutable)", () => {
    const image = makeImage(1, 1, 50, 50, 50);
    const mask = makeMask(1, 1, [true]);
    overlayMaskOnImage(image, mask, [255, 0, 0], 1);
    expect(image.data[0]).toBe(50);
  });
});
