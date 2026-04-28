// TODO: AIHintPanel로 리네이밍 예정 (외곽선 강조 등 AI 힌트 다수 포함). 별도 후속 PR에서 처리.
import { useSettingsStore } from "@/stores/settingsStore";

const OPTIONS = [
  { value: 0, label: "제한없음" },
  { value: 4, label: "4색" },
  { value: 8, label: "8색" },
  { value: 16, label: "16색" },
  { value: 32, label: "32색" },
  { value: 64, label: "64색" },
];

export default function PaletteSizeSelector() {
  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const setPaletteSize = useSettingsStore((s) => s.setPaletteSize);
  const requireEdges = useSettingsStore((s) => s.requireEdges);
  const setRequireEdges = useSettingsStore((s) => s.setRequireEdges);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-400 font-medium">팔레트 색상 수</label>
        <select
          value={paletteSize}
          onChange={(e) => setPaletteSize(Number(e.target.value))}
          className="px-2 py-1 text-xs bg-gray-700 rounded border border-gray-600 text-white focus:outline-none focus:border-blue-500"
        >
          {OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={requireEdges}
          onChange={(e) => setRequireEdges(e.target.checked)}
          className="accent-blue-500"
        />
        <span title="AI에 1픽셀 어두운 외곽선을 요구하는 프롬프트 힌트 추가">
          외곽선 강조
        </span>
      </label>
    </div>
  );
}
