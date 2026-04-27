import { describe, it, expect } from "vitest";
import { paletteMap } from "../paletteMap";

describe("paletteMap", () => {
  describe("기본 동작 (preserveAlpha 미지정 = false)", () => {
    it("투명 픽셀은 유지된다", () => {
      const src = new ImageData(2, 2);
      // 모두 투명 (alpha=0)
      const { result } = paletteMap(src, 4);
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

      const { result } = paletteMap(src, 4);

      // 고유 색상 수 세기
      const colors = new Set<string>();
      for (let i = 0; i < result.data.length; i += 4) {
        if (result.data[i + 3] > 0) {
          colors.add(`${result.data[i]},${result.data[i + 1]},${result.data[i + 2]}`);
        }
      }

      expect(colors.size).toBeLessThanOrEqual(4);
    });

    it("거의 투명한 픽셀(alpha<=128)은 완전 투명으로 (이진화)", () => {
      const src = new ImageData(1, 1);
      src.data[0] = 255;
      src.data[1] = 0;
      src.data[2] = 0;
      src.data[3] = 100; // 거의 투명

      const { result } = paletteMap(src, 16);
      expect(result.data[3]).toBe(0);
    });

    it("불투명 픽셀(alpha>128)의 alpha는 255로 강제된다", () => {
      const src = new ImageData(1, 1);
      src.data[0] = 255;
      src.data[1] = 0;
      src.data[2] = 0;
      src.data[3] = 200; // 불투명 (이진화 후 255)

      const { result } = paletteMap(src, 16);
      expect(result.data[3]).toBe(255);
    });
  });

  describe("preserveAlpha: true", () => {
    it("alpha 임의값(64, 128, 192)이 그대로 통과된다", () => {
      // 가로 4픽셀: alpha=64, 128, 192, 255
      const src = new ImageData(4, 1);
      const alphas = [64, 128, 192, 255];
      for (let i = 0; i < 4; i++) {
        src.data[i * 4] = 200;
        src.data[i * 4 + 1] = 100;
        src.data[i * 4 + 2] = 50;
        src.data[i * 4 + 3] = alphas[i];
      }

      const { result } = paletteMap(src, 4, { preserveAlpha: true });

      expect(result.data[3]).toBe(64);
      expect(result.data[7]).toBe(128);
      expect(result.data[11]).toBe(192);
      expect(result.data[15]).toBe(255);
    });

    it("alpha=0 픽셀은 RGB가 변경되지 않는다 (매핑 대상 아님)", () => {
      const src = new ImageData(1, 1);
      src.data[0] = 123;
      src.data[1] = 45;
      src.data[2] = 67;
      src.data[3] = 0;

      const { result } = paletteMap(src, 16, { preserveAlpha: true });
      expect(result.data[0]).toBe(123);
      expect(result.data[1]).toBe(45);
      expect(result.data[2]).toBe(67);
      expect(result.data[3]).toBe(0);
    });

    it("alpha=128(임계값) 이하 픽셀은 매핑 대상이 아니므로 RGB 보존", () => {
      // 임계: alpha > 128일 때 매핑. alpha=128은 매핑 제외.
      const src = new ImageData(1, 1);
      src.data[0] = 99;
      src.data[1] = 88;
      src.data[2] = 77;
      src.data[3] = 128;

      const { result } = paletteMap(src, 4, {
        preserveAlpha: true,
        fixedPalette: [[0, 0, 0]],
      });
      // 매핑 안 됐으므로 원본 RGB 유지
      expect(result.data[0]).toBe(99);
      expect(result.data[1]).toBe(88);
      expect(result.data[2]).toBe(77);
      // alpha 보존
      expect(result.data[3]).toBe(128);
    });
  });

  describe("fixedPalette", () => {
    it("주어진 fixedPalette 그대로 반환된다 (K-means 스킵 추론)", () => {
      const src = new ImageData(2, 2);
      // 다양한 색
      for (let i = 0; i < src.data.length; i += 4) {
        src.data[i] = (i * 50) % 256;
        src.data[i + 1] = (i * 30) % 256;
        src.data[i + 2] = (i * 70) % 256;
        src.data[i + 3] = 255;
      }

      const fixed: [number, number, number][] = [
        [255, 0, 255],
        [0, 255, 255],
      ];

      const { palette } = paletteMap(src, 4, { fixedPalette: fixed });

      expect(palette).toBe(fixed); // 동일 참조
      expect(palette.length).toBe(2);
      expect(palette[0]).toEqual([255, 0, 255]);
      expect(palette[1]).toEqual([0, 255, 255]);
    });

    it("출력 픽셀이 모두 fixedPalette 색 중 하나 (K-means 미실행 검증)", () => {
      // 이미지 색은 빨강 계열이지만 fixedPalette는 자홍/시안 — K-means가 돌았다면 빨강이 들어왔을 것
      const src = new ImageData(3, 3);
      for (let i = 0; i < src.data.length; i += 4) {
        src.data[i] = 200; // R
        src.data[i + 1] = 50; // G
        src.data[i + 2] = 50; // B
        src.data[i + 3] = 255;
      }

      const fixed: [number, number, number][] = [
        [255, 0, 255],
        [0, 255, 255],
      ];

      const { result } = paletteMap(src, 16, { fixedPalette: fixed });

      const allowed = new Set(["255,0,255", "0,255,255"]);
      for (let i = 0; i < result.data.length; i += 4) {
        if (result.data[i + 3] > 0) {
          const key = `${result.data[i]},${result.data[i + 1]},${result.data[i + 2]}`;
          expect(allowed.has(key)).toBe(true);
        }
      }
    });

    it("targetColors는 fixedPalette 길이를 따른다 (targetColors 무시)", () => {
      const src = new ImageData(2, 2);
      for (let i = 0; i < src.data.length; i += 4) {
        src.data[i + 3] = 255;
      }

      const fixed: [number, number, number][] = [
        [10, 20, 30],
        [40, 50, 60],
        [70, 80, 90],
      ];

      // targetColors=16이지만 fixedPalette 길이는 3 — 길이 3을 따름
      const { palette } = paletteMap(src, 16, { fixedPalette: fixed });
      expect(palette.length).toBe(3);
    });
  });

  describe("preserveAlpha: true && fixedPalette 직교 동작", () => {
    it("alpha 보존 + 고정 팔레트 매핑이 모두 정상", () => {
      const src = new ImageData(2, 1);
      // 픽셀 0: alpha=64 (매핑 대상 아님), 픽셀 1: alpha=200 (매핑 대상)
      src.data[0] = 100;
      src.data[1] = 100;
      src.data[2] = 100;
      src.data[3] = 64;
      src.data[4] = 100;
      src.data[5] = 100;
      src.data[6] = 100;
      src.data[7] = 200;

      const fixed: [number, number, number][] = [[255, 0, 0]];

      const { result, palette } = paletteMap(src, 16, {
        preserveAlpha: true,
        fixedPalette: fixed,
      });

      // 픽셀 0: 매핑 안 됨, 원본 RGB + 원본 alpha
      expect(result.data[0]).toBe(100);
      expect(result.data[1]).toBe(100);
      expect(result.data[2]).toBe(100);
      expect(result.data[3]).toBe(64);
      // 픽셀 1: 매핑 됨 (255,0,0), alpha 원본 200 보존
      expect(result.data[4]).toBe(255);
      expect(result.data[5]).toBe(0);
      expect(result.data[6]).toBe(0);
      expect(result.data[7]).toBe(200);

      expect(palette).toBe(fixed);
    });
  });

  describe("반환 타입", () => {
    it("result는 ImageData 인스턴스, palette는 [r,g,b] 배열", () => {
      const src = new ImageData(1, 1);
      src.data[0] = 100;
      src.data[1] = 50;
      src.data[2] = 25;
      src.data[3] = 255;

      const { result, palette } = paletteMap(src, 2);

      expect(result).toBeInstanceOf(ImageData);
      expect(result.width).toBe(1);
      expect(result.height).toBe(1);
      expect(Array.isArray(palette)).toBe(true);
      expect(palette.length).toBeGreaterThan(0);
      // 각 항목이 [r,g,b] 형태
      for (const color of palette) {
        expect(color.length).toBe(3);
        expect(typeof color[0]).toBe("number");
        expect(typeof color[1]).toBe("number");
        expect(typeof color[2]).toBe("number");
      }
    });
  });
});
