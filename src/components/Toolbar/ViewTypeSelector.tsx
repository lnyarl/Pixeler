import { useSettingsStore } from "@/stores/settingsStore";
import type { ViewType } from "@/services/ai/types";

const VIEW_TYPES: { type: ViewType; label: string }[] = [
  { type: "top-down", label: "탑다운" },
  { type: "side", label: "사이드" },
  { type: "quarter", label: "쿼터" },
];

export default function ViewTypeSelector() {
  const viewType = useSettingsStore((s) => s.viewType);
  const setViewType = useSettingsStore((s) => s.setViewType);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">뷰 타입</label>
      <div className="flex gap-1">
        {VIEW_TYPES.map(({ type, label }) => (
          <button
            key={type}
            onClick={() => setViewType(type)}
            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
              viewType === type
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
