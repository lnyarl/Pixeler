import { describe, it, expect } from "vitest";
import { runPostProcess } from "../pipeline";

describe("runPostProcess", () => {
  it("범용 모델: 다운스케일이 적용된다", () => {
    const src = new ImageData(8, 8);
    // 빨간 픽셀로 채움
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = 255;
      src.data[i + 1] = 0;
      src.data[i + 2] = 0;
      src.data[i + 3] = 255;
    }

    const result = runPostProcess(src, {
      targetWidth: 4,
      targetHeight: 4,
      providerType: "openai",
    });

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it("파이프라인 실행 후 색상 수가 제한된다", () => {
    const src = new ImageData(4, 4);
    // 다양한 색상
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = (i * 17) % 256;
      src.data[i + 1] = (i * 31) % 256;
      src.data[i + 2] = (i * 53) % 256;
      src.data[i + 3] = 255;
    }

    const result = runPostProcess(src, {
      targetWidth: 4,
      targetHeight: 4,
      paletteSize: 4,
      providerType: "openai",
    });

    const colors = new Set<string>();
    for (let i = 0; i < result.data.length; i += 4) {
      if (result.data[i + 3] > 0) {
        colors.add(
          `${result.data[i]},${result.data[i + 1]},${result.data[i + 2]}`
        );
      }
    }

    expect(colors.size).toBeLessThanOrEqual(4);
  });
});
