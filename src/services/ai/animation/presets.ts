/**
 * 애니메이션 프리셋 정의 (§5.3.3 / γ-N1).
 *
 * 4종 프리셋: idle, idle_wind, walk, attack.
 * - 각 프리셋은 defaultFrameCount / defaultFps / baseDescriptor를 가짐.
 * - "직접 설명" 모드는 presetKey가 null — 사용자 textbox만으로 prompt 구성.
 *
 * presetKey 타입은 `@/services/persistence/types`의 `AnimationPresetKey`와 동기화.
 */

import type { AnimationPresetKey } from "@/services/persistence/types";

export interface AnimationPreset {
  /** 프리셋 식별자 (영속화 시 그대로 저장). */
  key: AnimationPresetKey;
  /** UI 표시 라벨 (한국어). */
  label: string;
  /** 슬라이더 기본값 (사용자가 변경 가능). */
  defaultFrameCount: number;
  /** 프리뷰 기본 FPS (사용자가 변경 가능). */
  defaultFps: number;
  /** 영문 prompt seed — buildAnimationSheetPrompt에 그대로 삽입. */
  baseDescriptor: string;
}

export const ANIMATION_PRESETS: ReadonlyArray<AnimationPreset> = [
  {
    key: "idle",
    label: "Idle (호흡)",
    defaultFrameCount: 2,
    defaultFps: 4,
    baseDescriptor:
      "a subtle 2-frame idle animation with minimal breathing motion, " +
      "the character mostly stationary, only chest/shoulders softly rising and falling",
  },
  {
    key: "idle_wind",
    label: "Idle (바람)",
    defaultFrameCount: 4,
    defaultFps: 8,
    baseDescriptor:
      "a 4-frame looping idle animation with the character standing in light wind, " +
      "hair and cloth gently swaying, slight breathing",
  },
  {
    key: "walk",
    label: "Walk (걷기)",
    defaultFrameCount: 4,
    defaultFps: 12,
    baseDescriptor:
      "a 4-frame walking cycle: contact, recoil, passing, high-point. " +
      "Standard side-scroller walk animation with leg and arm swing",
  },
  {
    key: "attack",
    label: "Attack (공격)",
    defaultFrameCount: 3,
    defaultFps: 12,
    baseDescriptor:
      "a 3-frame attack motion: wind-up, strike, recovery. " +
      "Decisive, impactful pose at strike frame",
  },
];

export const PRESET_BY_KEY: Readonly<Record<AnimationPresetKey, AnimationPreset>> =
  ANIMATION_PRESETS.reduce(
    (acc, p) => {
      acc[p.key] = p;
      return acc;
    },
    {} as Record<AnimationPresetKey, AnimationPreset>
  );

/** UI 슬라이더 강제 범위 (§5.3.6). */
export const FRAME_COUNT_MIN = 2;
export const FRAME_COUNT_MAX = 8;
/** FPS 슬라이더 범위. */
export const FPS_MIN = 1;
export const FPS_MAX = 60;
