/**
 * PresetSelector — 4 프리셋 라디오 + "직접 설명" 토글 (γ-F3 / γ-F4).
 *
 * customMode=true면 프리셋 라디오는 disabled, 사용자 textbox만으로 prompt 구성 (직접 설명).
 */
import { ANIMATION_PRESETS } from "@/services/ai/animation/presets";
import type { AnimationPresetKey } from "@/services/persistence/types";

interface Props {
  presetKey: AnimationPresetKey | null;
  customMode: boolean;
  onPresetChange: (key: AnimationPresetKey) => void;
  onCustomModeChange: (v: boolean) => void;
  disabled?: boolean;
}

export default function PresetSelector({
  presetKey,
  customMode,
  onPresetChange,
  onCustomModeChange,
  disabled,
}: Props) {
  return (
    <div className="flex flex-col gap-2" data-testid="animation-preset-selector">
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={customMode}
          onChange={(e) => onCustomModeChange(e.target.checked)}
          disabled={disabled}
          data-testid="animation-custom-mode-toggle"
        />
        직접 설명 모드
      </label>
      <div
        className={`grid grid-cols-2 gap-1 ${customMode ? "opacity-40 pointer-events-none" : ""}`}
        data-testid="animation-preset-list"
      >
        {ANIMATION_PRESETS.map((p) => (
          <label
            key={p.key}
            className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
              presetKey === p.key && !customMode
                ? "bg-blue-700 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
            data-testid={`animation-preset-${p.key}`}
            data-selected={presetKey === p.key && !customMode ? "true" : "false"}
          >
            <input
              type="radio"
              name="animation-preset"
              checked={presetKey === p.key && !customMode}
              onChange={() => onPresetChange(p.key)}
              disabled={disabled || customMode}
              className="hidden"
            />
            {p.label}
          </label>
        ))}
      </div>
    </div>
  );
}
