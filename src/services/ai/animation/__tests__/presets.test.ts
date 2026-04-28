/**
 * 애니메이션 프리셋 단위 테스트 (γ-N1).
 *
 * - 4 키 (idle / idle_wind / walk / attack) 정확히 정의됨.
 * - frameCount/fps 범위 내.
 * - baseDescriptor 비어있지 않음.
 * - PRESET_BY_KEY 인덱스 매핑이 정확.
 */
import { describe, it, expect } from "vitest";
import {
  ANIMATION_PRESETS,
  PRESET_BY_KEY,
  FRAME_COUNT_MIN,
  FRAME_COUNT_MAX,
  FPS_MIN,
  FPS_MAX,
} from "../presets";

describe("ANIMATION_PRESETS (γ-N1)", () => {
  it("4종 프리셋이 정확한 key로 정의됨", () => {
    const keys = ANIMATION_PRESETS.map((p) => p.key);
    expect(keys).toEqual(["idle", "idle_wind", "walk", "attack"]);
  });

  it("각 프리셋의 frameCount는 [2, 8] 범위 내", () => {
    for (const p of ANIMATION_PRESETS) {
      expect(p.defaultFrameCount).toBeGreaterThanOrEqual(FRAME_COUNT_MIN);
      expect(p.defaultFrameCount).toBeLessThanOrEqual(FRAME_COUNT_MAX);
    }
  });

  it("각 프리셋의 fps는 [1, 60] 범위 내", () => {
    for (const p of ANIMATION_PRESETS) {
      expect(p.defaultFps).toBeGreaterThanOrEqual(FPS_MIN);
      expect(p.defaultFps).toBeLessThanOrEqual(FPS_MAX);
    }
  });

  it("baseDescriptor가 비어있지 않고, 의미있는 길이", () => {
    for (const p of ANIMATION_PRESETS) {
      expect(p.baseDescriptor.length).toBeGreaterThan(20);
    }
  });

  it("label이 한국어 라벨로 채워짐", () => {
    for (const p of ANIMATION_PRESETS) {
      expect(p.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("PRESET_BY_KEY는 모든 key에 대해 동일 객체 반환", () => {
    for (const p of ANIMATION_PRESETS) {
      expect(PRESET_BY_KEY[p.key]).toBe(p);
    }
  });

  it("walk 프리셋은 4프레임", () => {
    expect(PRESET_BY_KEY.walk.defaultFrameCount).toBe(4);
  });

  it("attack 프리셋은 3프레임", () => {
    expect(PRESET_BY_KEY.attack.defaultFrameCount).toBe(3);
  });
});
