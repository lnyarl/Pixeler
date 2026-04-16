import { describe, it, expect } from "vitest";
import { makeTransparentBackground } from "../transparentBackground";

describe("makeTransparentBackground", () => {
  it("네 귀퉁이와 같은 색인 픽셀을 투명으로 만든다", () => {
    const src = new ImageData(4, 4);
    // 전체를 흰색(배경)으로
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = 255;
      src.data[i + 1] = 255;
      src.data[i + 2] = 255;
      src.data[i + 3] = 255;
    }
    // 중앙 픽셀만 빨강(전경)
    const centerIdx = (1 * 4 + 1) * 4;
    src.data[centerIdx] = 255;
    src.data[centerIdx + 1] = 0;
    src.data[centerIdx + 2] = 0;
    src.data[centerIdx + 3] = 255;

    const result = makeTransparentBackground(src);

    // 배경(흰색)은 투명
    expect(result.data[3]).toBe(0);
    // 전경(빨강)은 불투명
    expect(result.data[centerIdx + 3]).toBe(255);
  });

  it("이미 투명한 픽셀은 그대로 유지", () => {
    const src = new ImageData(2, 2);
    // 모두 투명
    const result = makeTransparentBackground(src);
    expect(result.data[3]).toBe(0);
  });

  it("tolerance 내의 유사한 색도 투명 처리", () => {
    const src = new ImageData(2, 2);
    // 좌상단: (200, 200, 200)
    src.data[0] = 200;
    src.data[1] = 200;
    src.data[2] = 200;
    src.data[3] = 255;
    // 우상단: (210, 210, 210) — tolerance 30 이내
    src.data[4] = 210;
    src.data[5] = 210;
    src.data[6] = 210;
    src.data[7] = 255;
    // 좌하단, 우하단도 배경색
    for (let i = 8; i < 16; i += 4) {
      src.data[i] = 200;
      src.data[i + 1] = 200;
      src.data[i + 2] = 200;
      src.data[i + 3] = 255;
    }

    const result = makeTransparentBackground(src);
    // 우상단도 투명 (17 < tolerance 30)
    expect(result.data[7]).toBe(0);
  });
});
