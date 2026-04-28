/**
 * AnimationGenerationPanel — 우측 AIPanel 영역 (γ-F3~F6 / γ-F16).
 *
 * 입력:
 * - 프리셋 선택 (4종) + "직접 설명" 토글
 * - 추가 설명 textbox
 * - frameCount 슬라이더 [2, 8]
 * - "생성" 버튼 (실제 호출은 부모 콜백)
 * - DEV 버튼 (M4 — AI 호출 없이 더미 시트)
 */
import { useEffect } from "react";
import {
  ANIMATION_PRESETS,
  PRESET_BY_KEY,
  FRAME_COUNT_MIN,
  FRAME_COUNT_MAX,
} from "@/services/ai/animation/presets";
import type { AnimationPresetKey } from "@/services/persistence/types";
import PresetSelector from "./PresetSelector";

interface Props {
  presetKey: AnimationPresetKey | null;
  customMode: boolean;
  customDescriptor: string;
  frameCount: number;
  busy: boolean;
  error: string | null;
  onPresetChange: (key: AnimationPresetKey) => void;
  onCustomModeChange: (v: boolean) => void;
  onCustomDescriptorChange: (s: string) => void;
  onFrameCountChange: (n: number) => void;
  onGenerate: () => void;
  onDevGenerate?: () => void;
}

export default function AnimationGenerationPanel({
  presetKey,
  customMode,
  customDescriptor,
  frameCount,
  busy,
  error,
  onPresetChange,
  onCustomModeChange,
  onCustomDescriptorChange,
  onFrameCountChange,
  onGenerate,
  onDevGenerate,
}: Props) {
  const isDev = import.meta.env.DEV;

  // 프리셋 선택 시 frameCount 자동 적용 (사용자가 변경 가능).
  // 단, 직접 설명 모드면 무시.
  // 의도적으로 presetKey 변경 시에만 동기화 — frameCount/onFrameCountChange는 deps에서 제외.
  useEffect(() => {
    if (customMode || !presetKey) return;
    const p = PRESET_BY_KEY[presetKey];
    if (!p) return;
    if (frameCount === p.defaultFrameCount) return;
    onFrameCountChange(p.defaultFrameCount);
  }, [presetKey, customMode]);

  return (
    <div
      className="flex flex-col gap-3"
      data-testid="animation-generation-panel"
    >
      <PresetSelector
        presetKey={presetKey}
        customMode={customMode}
        onPresetChange={onPresetChange}
        onCustomModeChange={onCustomModeChange}
        disabled={busy}
      />

      <textarea
        value={customDescriptor}
        onChange={(e) => onCustomDescriptorChange(e.target.value)}
        placeholder={
          customMode
            ? "직접 설명: 캐릭터의 동작을 영어로 자세히 입력 (예: spinning fast with sparks)"
            : "추가 설명 (선택, 예: with hair flowing)"
        }
        className="bg-gray-800 text-gray-200 text-sm rounded p-2 resize-none"
        rows={3}
        disabled={busy}
        data-testid="animation-custom-descriptor"
      />

      <label className="flex items-center gap-2 text-xs text-gray-300">
        프레임 수
        <input
          type="range"
          min={FRAME_COUNT_MIN}
          max={FRAME_COUNT_MAX}
          value={frameCount}
          onChange={(e) => onFrameCountChange(parseInt(e.target.value, 10))}
          disabled={busy}
          className="flex-1"
          data-testid="animation-frame-count"
        />
        <span className="font-mono w-6 text-right">{frameCount}</span>
      </label>

      <div className="flex gap-2">
        <button
          onClick={onGenerate}
          disabled={busy}
          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-white text-sm"
          data-testid="animation-generate"
        >
          {busy ? "생성 중..." : "생성"}
        </button>
        {isDev && onDevGenerate && (
          <button
            onClick={onDevGenerate}
            disabled={busy}
            className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 rounded text-white text-sm font-mono"
            data-testid="animation-generate-dev"
            title="DEV: AI 호출 없이 더미 시트"
          >
            DEV
          </button>
        )}
      </div>

      {error && (
        <div
          className="text-xs text-red-400 bg-red-950/30 rounded p-2"
          data-testid="animation-error"
        >
          {error}
        </div>
      )}

      <div className="text-[10px] text-gray-500">
        프리셋:{" "}
        {customMode
          ? "직접 설명"
          : presetKey
            ? PRESET_BY_KEY[presetKey].label
            : "(선택 필요)"}
        {ANIMATION_PRESETS.length > 0 && null}
      </div>
    </div>
  );
}
