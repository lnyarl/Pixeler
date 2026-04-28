/**
 * extractPaletteFromImageData — m7 / α-N15.
 */

import { describe, it, expect } from "vitest";
import { extractPaletteFromImageData } from "../extractPalette";

function makeImageData(
  w: number,
  h: number,
  fill: [number, number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return new ImageData(data, w, h);
}

describe("extractPaletteFromImageData", () => {
  it("단색 이미지에서 1색 추출 (또는 동일 색의 클러스터들)", () => {
    const img = makeImageData(8, 8, [255, 0, 0, 255]);
    const palette = extractPaletteFromImageData(img, 4);
    expect(palette.length).toBeGreaterThan(0);
    // 모든 팔레트 색이 빨간색에 가까움.
    for (const c of palette) {
      expect(c[0]).toBeGreaterThan(200);
      expect(c[1]).toBeLessThan(50);
      expect(c[2]).toBeLessThan(50);
    }
  });

  it("투명 이미지에서 빈 팔레트", () => {
    const img = makeImageData(8, 8, [0, 0, 0, 0]);
    const palette = extractPaletteFromImageData(img, 4);
    expect(palette).toEqual([]);
  });

  it("다색 이미지에서 paletteSize만큼 추출", () => {
    const w = 4;
    const h = 4;
    const data = new Uint8ClampedArray(w * h * 4);
    // 4픽셀씩 4가지 색.
    const colors: [number, number, number][] = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 0],
    ];
    for (let i = 0; i < 16; i++) {
      const c = colors[Math.floor(i / 4)];
      data[i * 4] = c[0];
      data[i * 4 + 1] = c[1];
      data[i * 4 + 2] = c[2];
      data[i * 4 + 3] = 255;
    }
    const img = new ImageData(data, w, h);
    const palette = extractPaletteFromImageData(img, 4);
    expect(palette.length).toBe(4);
  });

  it("빈 이미지(undefined-like) 입력에서 빈 팔레트", () => {
    // ImageData 자체는 0x0 생성 불가. width=0인 상태를 시뮬레이션.
    const fake = { data: new Uint8ClampedArray(0), width: 0, height: 0 } as ImageData;
    expect(extractPaletteFromImageData(fake, 4)).toEqual([]);
  });
});
