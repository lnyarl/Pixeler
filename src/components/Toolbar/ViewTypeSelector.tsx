import { useSettingsStore } from "@/stores/settingsStore";
import type { ViewType } from "@/services/ai/types";

const VIEW_TYPES: { type: ViewType; label: string }[] = [
  { type: "top-down", label: "탑다운" },
  { type: "side", label: "사이드뷰" },
  { type: "quarter", label: "쿼터뷰" },
];

export default function ViewTypeSelector() {
  const viewType = useSettingsStore((s) => s.viewType);
  const setViewType = useSettingsStore((s) => s.setViewType);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 font-medium">뷰 타입</label>
      <select
        value={viewType}
        onChange={(e) => setViewType(e.target.value as ViewType)}
        className="px-2 py-1 text-xs bg-gray-700 rounded border border-gray-600 text-white focus:outline-none focus:border-blue-500"
      >
        {VIEW_TYPES.map(({ type, label }) => (
          <option key={type} value={type}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
