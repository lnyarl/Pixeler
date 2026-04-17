import { describe, it, expect } from "vitest";
import { downscaleMode } from "../downscale";

/** 1024x1024 블록 구조를 흉내내기 위해 작은 버전 사용: 4x4 → 2x2 (각 블록 2x2) */
describe("downscaleMode", () => {
  it("동일 크기면 원본 반환", () => {
    const src = new ImageData(2, 2);
    src.data.fill(128);
    const result = downscaleMode(src, 2, 2);
    expect(result).toBe(src);
  });

  it("블록 내 최빈색 선택 — 단색 블록", () => {
    // 4x4 전체가 빨강 → 2x2 다운스케일도 모두 빨강
    const src = new ImageData(4, 4);
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = 255;
      src.data[i + 1] = 0;
      src.data[i + 2] = 0;
      src.data[i + 3] = 255;
    }
    const result = downscaleMode(src, 2, 2);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(255);
      expect(result.data[i + 1]).toBe(0);
      expect(result.data[i + 2]).toBe(0);
    }
  });

  it("블록 내 최빈색 선택 — 좌상단 블록만 다른 색", () => {
    // 4x4: 좌상단 2x2 블록 4픽셀 중 3개는 빨강, 1개는 초록 → 빨강
    const src = new ImageData(4, 4);
    // 전부 검정으로 초기화
    for (let i = 3; i < src.data.length; i += 4) src.data[i] = 255;

    // 좌상단 2x2 블록을 대부분 빨강으로
    function set(x: number, y: number, r: number, g: number, b: number) {
      const idx = (y * 4 + x) * 4;
      src.data[idx] = r;
      src.data[idx + 1] = g;
      src.data[idx + 2] = b;
      src.data[idx + 3] = 255;
    }
    set(0, 0, 255, 0, 0); // 빨강
    set(1, 0, 255, 0, 0);
    set(0, 1, 255, 0, 0);
    set(1, 1, 0, 255, 0); // 초록 (경계 노이즈)

    const result = downscaleMode(src, 2, 2);
    // 출력 (0,0)은 최빈색 = 빨강 (3:1 우세)
    expect(result.data[0]).toBe(255);
    expect(result.data[1]).toBe(0);
    expect(result.data[2]).toBe(0);
  });

  it("nearest와 다르게 경계 픽셀에 취약하지 않음", () => {
    // 좌상단만 파랑, 나머지는 빨강 → nearest는 파랑, mode는 빨강을 뽑음
    const src = new ImageData(4, 4);
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = 255;
      src.data[i + 3] = 255;
    }
    src.data[0] = 0;
    src.data[1] = 0;
    src.data[2] = 255; // (0,0) 파랑

    const result = downscaleMode(src, 1, 1);
    // 1픽셀 출력: 블록 전체 중 최빈색 = 빨강
    expect(result.data[0]).toBe(255);
    expect(result.data[2]).toBe(0);
  });

  it("비정사각 다운스케일", () => {
    const src = new ImageData(8, 4);
    const result = downscaleMode(src, 4, 2);
    expect(result.width).toBe(4);
    expect(result.height).toBe(2);
  });
});
