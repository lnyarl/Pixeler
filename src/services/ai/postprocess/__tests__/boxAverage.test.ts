import { describe, it, expect } from "vitest";
import { boxAverage } from "../boxAverage";

/**
 * 환경 가정:
 *   vitest 설정은 jsdom (vitest.config.ts) → OffscreenCanvas / createImageBitmap 미정의.
 *   따라서 본 파일의 모든 테스트는 boxAverageFallback 경로를 실제로 실행한다.
 *   (기획서 §13 NF9 + §9.1 T7: jsdom 폴백 환경 동작 검증.)
 *
 * OffscreenCanvas가 정의된 환경에서는 T7-fallback-explicit 테스트가
 * globalThis.OffscreenCanvas를 일시 삭제하여 폴백 경로를 강제로 타게 한다.
 */

function makeImage(
  w: number,
  h: number,
  fill: (x: number, y: number) => [number, number, number, number]
): ImageData {
  const img = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const [r, g, b, a] = fill(x, y);
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = a;
    }
  }
  return img;
}

describe("boxAverage", () => {
  describe("기본 동작", () => {
    it("(T1) 입력 = 출력 해상도면 입력을 그대로 반환 (참조 동일)", async () => {
      const src = makeImage(8, 8, () => [123, 45, 67, 255]);
      const result = await boxAverage(src, 8, 8);
      expect(result).toBe(src);
    });

    it("(T2) 4×4 단색 → 2×2: 단색 보존", async () => {
      const src = makeImage(4, 4, () => [200, 100, 50, 255]);
      const result = await boxAverage(src, 2, 2);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBe(200);
        expect(result.data[i + 1]).toBe(100);
        expect(result.data[i + 2]).toBe(50);
        expect(result.data[i + 3]).toBe(255);
      }
    });

    it("(T3) 4×4 (좌2열 빨강, 우2열 파랑) → 2×2: 경계 면적평균", async () => {
      // 입력: x=0,1 빨강 / x=2,3 파랑. 2×2로 줄이면 좌 1픽셀이 (0,1)을 커버, 우 1픽셀이 (2,3)을 커버 → 각 단색 보존
      const src = makeImage(4, 4, (x) =>
        x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255]
      );
      const result = await boxAverage(src, 2, 2);
      // 좌측 두 픽셀
      expect(result.data[0]).toBe(255);
      expect(result.data[1]).toBe(0);
      expect(result.data[2]).toBe(0);
      expect(result.data[4 * 2]).toBe(255); // (0,1) 좌
      // 우측 두 픽셀
      expect(result.data[4]).toBe(0);
      expect(result.data[5]).toBe(0);
      expect(result.data[6]).toBe(255);
    });

    it("(T4) 8×8 → 2×2 (4배 축소) 면적 평균값 검증", async () => {
      // 좌상 4×4=빨강, 우상 4×4=파랑, 좌하 4×4=초록, 우하 4×4=노랑
      const src = makeImage(8, 8, (x, y) => {
        if (x < 4 && y < 4) return [255, 0, 0, 255];
        if (x >= 4 && y < 4) return [0, 0, 255, 255];
        if (x < 4 && y >= 4) return [0, 255, 0, 255];
        return [255, 255, 0, 255];
      });
      const result = await boxAverage(src, 2, 2);
      // 출력 (0,0)은 입력 (0..3,0..3) 영역 평균 (단색 빨강) → 빨강 그대로
      expect(result.data[0]).toBe(255);
      expect(result.data[1]).toBe(0);
      expect(result.data[2]).toBe(0);
      expect(result.data[3]).toBe(255);
      // 출력 (1,0): 파랑 영역
      expect(result.data[4]).toBe(0);
      expect(result.data[5]).toBe(0);
      expect(result.data[6]).toBe(255);
      // 출력 (0,1): 초록
      expect(result.data[8]).toBe(0);
      expect(result.data[9]).toBe(255);
      expect(result.data[10]).toBe(0);
      // 출력 (1,1): 노랑
      expect(result.data[12]).toBe(255);
      expect(result.data[13]).toBe(255);
      expect(result.data[14]).toBe(0);
    });
  });

  describe("alpha 처리 (M1 / T5)", () => {
    it("(T5) alpha=0과 alpha=255 픽셀 인접 시 alpha=0 RGB는 결과 RGB에 가중치 0", async () => {
      // 4×1 가로: x=0,1 (빨강 alpha=255), x=2,3 (파랑 alpha=0).
      // 출력 2×1로 축소 시 우측 출력 픽셀은 (alpha=0인 파랑 2개)만 커버 → alpha 평균 0.
      // 좌측 출력 픽셀은 빨강 2개 → 단색 빨강 alpha=255.
      const src = makeImage(4, 1, (x) =>
        x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 0]
      );
      const result = await boxAverage(src, 2, 1);

      // 좌: 단색 빨강
      expect(result.data[0]).toBe(255);
      expect(result.data[1]).toBe(0);
      expect(result.data[2]).toBe(0);
      expect(result.data[3]).toBe(255);
      // 우: alpha=0이므로 RGB는 의미 없음 (구현상 0). alpha만 0 검증.
      expect(result.data[7]).toBe(0);
    });

    it("(T5b) alpha=0 영역이 alpha=255 영역과 같은 출력 픽셀로 묶일 때 RGB는 alpha=255 색만 반영", async () => {
      // 4×1: x=0,1 (빨강 alpha=255), x=2,3 (파랑 alpha=0).
      // 1×1로 축소 → 출력 픽셀 1개. premultiplied 가중치로 alpha=0인 파랑은 RGB 가중치 0.
      // → 출력 RGB는 빨강 (255,0,0). alpha 평균은 (255+255+0+0)/4 = 127 또는 128.
      const src = makeImage(4, 1, (x) =>
        x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 0]
      );
      const result = await boxAverage(src, 1, 1);

      expect(result.data[0]).toBe(255); // R = 빨강
      expect(result.data[1]).toBe(0); // G
      expect(result.data[2]).toBe(0); // B (파랑 영향 없음)
      // alpha 평균: (255+255+0+0)/4 = 127.5 → round → 128
      expect(Math.abs(result.data[3] - 128)).toBeLessThanOrEqual(1);
    });

    it("(T5c) 0/255 이진화 입력은 출력 alpha도 0 또는 255 근사 (블록 내 균일하면 정확)", async () => {
      // 단색 alpha=255 영역만 있는 출력 픽셀 → alpha=255.
      // 단색 alpha=0 영역만 있는 출력 픽셀 → alpha=0.
      // 8×1: 좌 4 alpha=255, 우 4 alpha=0. 2×1로 축소 → 좌 출력 alpha=255, 우 출력 alpha=0.
      const src = makeImage(8, 1, (x) =>
        x < 4 ? [100, 100, 100, 255] : [50, 50, 50, 0]
      );
      const result = await boxAverage(src, 2, 1);
      expect(result.data[3]).toBe(255);
      expect(result.data[7]).toBe(0);
    });
  });

  describe("비정수 비율 (M6 / NF9 / T6)", () => {
    it("(T6) 33×33 → 32×32: 빈 블록 없이 정상 처리", async () => {
      // 단색 입력 (alpha=255). 비정수 비율 33/32. 모든 출력 픽셀은 단색 보존 + alpha=255.
      const src = makeImage(33, 33, () => [80, 160, 240, 255]);
      const result = await boxAverage(src, 32, 32);

      expect(result.width).toBe(32);
      expect(result.height).toBe(32);
      for (let i = 0; i < result.data.length; i += 4) {
        // 단색이므로 면적평균 후에도 동일
        expect(result.data[i]).toBe(80);
        expect(result.data[i + 1]).toBe(160);
        expect(result.data[i + 2]).toBe(240);
        expect(result.data[i + 3]).toBe(255);
      }
    });

    it("(T6b) 1000×1000 → 32×32: 비정수 비율 (31.25배 축소) 단색 보존", async () => {
      const src = makeImage(1000, 1000, () => [10, 20, 30, 255]);
      const result = await boxAverage(src, 32, 32);
      expect(result.width).toBe(32);
      expect(result.height).toBe(32);
      // 단색 입력이므로 모든 출력 픽셀이 동일 색
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i]).toBe(10);
        expect(result.data[i + 1]).toBe(20);
        expect(result.data[i + 2]).toBe(30);
        expect(result.data[i + 3]).toBe(255);
      }
    });

    it("(T6c) 5×5 → 2×2: 비정수 비율 (2.5배 축소)에서 빈 블록(0,0,0,0) 없음", async () => {
      // 모두 alpha=255인 단색 입력 → 출력에 alpha=0 픽셀이 절대 발생하지 않아야 함.
      const src = makeImage(5, 5, () => [123, 200, 50, 255]);
      const result = await boxAverage(src, 2, 2);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
      for (let i = 0; i < result.data.length; i += 4) {
        expect(result.data[i + 3]).toBeGreaterThan(0); // alpha 0이 아님 = 빈 블록 없음
      }
    });
  });

  describe("폴백 경로 (NF9 / T7)", () => {
    it("(T7) jsdom 환경에서 OffscreenCanvas 미정의 → 폴백 경로가 정상 실행됨", async () => {
      // jsdom에서는 OffscreenCanvas가 기본적으로 없다. 환경 자체로 폴백을 검증.
      // 만약 어떤 환경에서 OffscreenCanvas가 정의되어 있다면 임시 삭제.
      const hadOffscreen = typeof OffscreenCanvas !== "undefined";
      const hadCreateBitmap = typeof createImageBitmap !== "undefined";

      const savedOC = (globalThis as Record<string, unknown>).OffscreenCanvas;
      const savedCB = (globalThis as Record<string, unknown>).createImageBitmap;
      try {
        delete (globalThis as Record<string, unknown>).OffscreenCanvas;
        delete (globalThis as Record<string, unknown>).createImageBitmap;

        const src = makeImage(4, 4, () => [128, 64, 32, 255]);
        const result = await boxAverage(src, 2, 2);

        // 폴백이 단색을 정확히 보존
        for (let i = 0; i < result.data.length; i += 4) {
          expect(result.data[i]).toBe(128);
          expect(result.data[i + 1]).toBe(64);
          expect(result.data[i + 2]).toBe(32);
          expect(result.data[i + 3]).toBe(255);
        }
      } finally {
        if (hadOffscreen) {
          (globalThis as Record<string, unknown>).OffscreenCanvas = savedOC;
        }
        if (hadCreateBitmap) {
          (globalThis as Record<string, unknown>).createImageBitmap = savedCB;
        }
      }
    });

    it("(T7b) 폴백 경로의 면적평균 — 2색 가로 그라데이션", async () => {
      // 4×1: x=0 빨, x=1 빨, x=2 파, x=3 파 → 2×1로 축소.
      const savedOC = (globalThis as Record<string, unknown>).OffscreenCanvas;
      const savedCB = (globalThis as Record<string, unknown>).createImageBitmap;
      try {
        delete (globalThis as Record<string, unknown>).OffscreenCanvas;
        delete (globalThis as Record<string, unknown>).createImageBitmap;

        const src = makeImage(4, 1, (x) =>
          x < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255]
        );
        const result = await boxAverage(src, 2, 1);

        // 좌 출력: 빨강 단색
        expect(result.data[0]).toBe(255);
        expect(result.data[2]).toBe(0);
        // 우 출력: 파랑 단색
        expect(result.data[4]).toBe(0);
        expect(result.data[6]).toBe(255);
      } finally {
        if (savedOC !== undefined) {
          (globalThis as Record<string, unknown>).OffscreenCanvas = savedOC;
        }
        if (savedCB !== undefined) {
          (globalThis as Record<string, unknown>).createImageBitmap = savedCB;
        }
      }
    });
  });
});
