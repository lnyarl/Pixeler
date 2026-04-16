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

  return (
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
  );
}
