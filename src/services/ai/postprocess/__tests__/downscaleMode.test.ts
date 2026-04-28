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

  // T11: 16단계 양자화 키 결정론 검증 (기획서 §9.1).
  // (200,200,200,255) 12개 + (255,255,255,255) 4개 → 12개 우세 색 선택.
  // `>>4` 시 200 → 12, 255 → 15 → 키 분리. 12:4 비동률로 비결정성 제거.
  it("T11: 16단계 양자화 키 비동률 12:4 — 우세 색 정확 선택", () => {
    const src = new ImageData(4, 4);
    // 전체 16픽셀 중 12개를 (200,200,200,255), 4개를 (255,255,255,255)
    // 좌상단 4x3 = 12픽셀 (200) + 마지막 행 4픽셀 (255)
    function set(x: number, y: number, r: number, g: number, b: number) {
      const idx = (y * 4 + x) * 4;
      src.data[idx] = r;
      src.data[idx + 1] = g;
      src.data[idx + 2] = b;
      src.data[idx + 3] = 255;
    }
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        set(x, y, 200, 200, 200);
      }
    }
    for (let x = 0; x < 4; x++) {
      set(x, 3, 255, 255, 255);
    }

    // 4×4 → 1×1: 한 블록에 (200) 12개 + (255) 4개 → 200 키가 우세.
    const result = downscaleMode(src, 1, 1);
    expect(result.data[0]).toBe(200);
    expect(result.data[1]).toBe(200);
    expect(result.data[2]).toBe(200);
    expect(result.data[3]).toBe(255);
  });

  // T11b: 16단계 양자화 — 색 거리가 가까워도(>>6 시 같은 키였을 색)
  // >>4 양자화로 분리됨 검증. (200,200,200)과 (220,220,220)은 >>4 시
  // 12 vs 13으로 다른 키 → 다수쪽이 정확히 선택됨.
  it("T11b: 16단계 양자화로 인접 색 분리 — 4단계로는 같은 키였을 케이스", () => {
    const src = new ImageData(4, 4);
    function set(x: number, y: number, r: number, g: number, b: number) {
      const idx = (y * 4 + x) * 4;
      src.data[idx] = r;
      src.data[idx + 1] = g;
      src.data[idx + 2] = b;
      src.data[idx + 3] = 255;
    }
    // (200) 픽셀 10개, (220) 픽셀 6개 → 200이 우세
    let count = 0;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (count < 10) {
          set(x, y, 200, 200, 200);
        } else {
          set(x, y, 220, 220, 220);
        }
        count++;
      }
    }
    const result = downscaleMode(src, 1, 1);
    expect(result.data[0]).toBe(200);
    expect(result.data[1]).toBe(200);
    expect(result.data[2]).toBe(200);
  });

  // T11(PR1): outlinePreserve=true, 단일 어두운 픽셀 보존 (기획서 §9.1).
  // 4×4 단일 블록 → 1×1. 면색 (200,200,200,255) 15개 + 외곽선 (20,20,20,255) 1개.
  // lum 면색 = (400+1000+200)>>3 = 200, 외곽선 = (40+100+20)>>3 = 20. 갭 180 ≥ 64 → darkest 채택.
  it("T11(PR1): outlinePreserve=true — 임계 이상 어두운 픽셀이 mode를 대체", () => {
    const src = new ImageData(4, 4);
    function set(x: number, y: number, r: number, g: number, b: number, a = 255) {
      const idx = (y * 4 + x) * 4;
      src.data[idx] = r;
      src.data[idx + 1] = g;
      src.data[idx + 2] = b;
      src.data[idx + 3] = a;
    }
    // 16픽셀 모두 면색 (200,200,200) 우선 채움
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        set(x, y, 200, 200, 200);
      }
    }
    // 단 1개만 외곽선 픽셀로 교체
    set(0, 0, 20, 20, 20);

    const result = downscaleMode(src, 1, 1, { preserveOutline: true });
    expect(result.data[0]).toBe(20);
    expect(result.data[1]).toBe(20);
    expect(result.data[2]).toBe(20);
    expect(result.data[3]).toBe(255);
  });

  // T12(PR1): outlinePreserve=true, 임계 미달 → mode 유지.
  // 면색 (150,150,150) 15개 + 약간 어두운 (120,120,120) 1개. lum 갭 = 30 < 64.
  it("T12(PR1): outlinePreserve=true — 임계 미달이면 mode 유지", () => {
    const src = new ImageData(4, 4);
    function set(x: number, y: number, r: number, g: number, b: number, a = 255) {
      const idx = (y * 4 + x) * 4;
      src.data[idx] = r;
      src.data[idx + 1] = g;
      src.data[idx + 2] = b;
      src.data[idx + 3] = a;
    }
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        set(x, y, 150, 150, 150);
      }
    }
    set(0, 0, 120, 120, 120);

    const result = downscaleMode(src, 1, 1, { preserveOutline: true });
    // mode = 150 유지
    expect(result.data[0]).toBe(150);
    expect(result.data[1]).toBe(150);
    expect(result.data[2]).toBe(150);
  });

  // T13(PR1): outlinePreserve=true, α<=128인 어두운 픽셀은 darkest 후보에서 제외.
  // 면색 (200,200,200,255) 15개 + (10,10,10,100) 1개 → α≤128이라 무시 → mode 유지.
  it("T13(PR1): outlinePreserve=true — α<=128 어두운 픽셀은 무시", () => {
    const src = new ImageData(4, 4);
    function set(x: number, y: number, r: number, g: number, b: number, a = 255) {
      const idx = (y * 4 + x) * 4;
      src.data[idx] = r;
      src.data[idx + 1] = g;
      src.data[idx + 2] = b;
      src.data[idx + 3] = a;
    }
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        set(x, y, 200, 200, 200);
      }
    }
    // α=100은 임계 (128) 이하 → darkest 후보에서 제외
    set(0, 0, 10, 10, 10, 100);

    const result = downscaleMode(src, 1, 1, { preserveOutline: true });
    // mode = (200,200,200,255) 유지
    expect(result.data[0]).toBe(200);
    expect(result.data[1]).toBe(200);
    expect(result.data[2]).toBe(200);
    expect(result.data[3]).toBe(255);
  });

  // T14(PR1): outlinePreserve=false (기본/미전달) — T11 동일 입력에서 mode 그대로.
  // 회귀 0 검증: 옵션 미전달 시 기존 동작 100% 동일.
  it("T14(PR1): outlinePreserve=false — 기존 mode 동작 회귀 0", () => {
    const src = new ImageData(4, 4);
    function set(x: number, y: number, r: number, g: number, b: number, a = 255) {
      const idx = (y * 4 + x) * 4;
      src.data[idx] = r;
      src.data[idx + 1] = g;
      src.data[idx + 2] = b;
      src.data[idx + 3] = a;
    }
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        set(x, y, 200, 200, 200);
      }
    }
    set(0, 0, 20, 20, 20);

    // 옵션 미제공
    const resultNoOpt = downscaleMode(src, 1, 1);
    expect(resultNoOpt.data[0]).toBe(200);
    expect(resultNoOpt.data[1]).toBe(200);
    expect(resultNoOpt.data[2]).toBe(200);

    // 명시적 false
    const resultFalse = downscaleMode(src, 1, 1, { preserveOutline: false });
    expect(resultFalse.data[0]).toBe(200);
    expect(resultFalse.data[1]).toBe(200);
    expect(resultFalse.data[2]).toBe(200);
  });

  // T12: blockW < 1 → nearest 폴백 (기획서 §6.2 변경 1).
  // src=33, target=32 → blockW≈1.03 (≥1, 폴백 안 함). src=16, target=32 → blockW=0.5 (폴백).
  it("T12: blockW < 1이면 nearest 폴백 작동, (0,0,0,0) 픽셀 발생 안 함", () => {
    const src = new ImageData(16, 16);
    // 모두 빨강
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = 255;
      src.data[i + 1] = 0;
      src.data[i + 2] = 0;
      src.data[i + 3] = 255;
    }

    // 16 → 32 (블록폭 0.5, blockW<1 케이스) — 폴백이 nearest로 처리해야 함
    const result = downscaleMode(src, 32, 32);
    expect(result.width).toBe(32);
    expect(result.height).toBe(32);
    // 모든 출력 픽셀이 빨강이어야 (0,0,0,0) 검정 투명 픽셀 없음
    for (let i = 0; i < result.data.length; i += 4) {
      expect(result.data[i]).toBe(255);
      expect(result.data[i + 1]).toBe(0);
      expect(result.data[i + 2]).toBe(0);
      expect(result.data[i + 3]).toBe(255);
    }
  });
});
