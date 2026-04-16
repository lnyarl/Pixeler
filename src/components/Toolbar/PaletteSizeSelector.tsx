import { useSettingsStore } from "@/stores/settingsStore";

const PRESETS = [4, 8, 16, 32, 64];

export default function PaletteSizeSelector() {
  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const setPaletteSize = useSettingsStore((s) => s.setPaletteSize);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">
        팔레트 색상 수: {paletteSize}
      </label>
      <div className="flex gap-1">
        {PRESETS.map((size) => (
          <button
            key={size}
            onClick={() => setPaletteSize(size)}
            className={`flex-1 px-1 py-1 text-xs rounded transition-colors ${
              paletteSize === size
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}
