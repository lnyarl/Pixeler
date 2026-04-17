import { useSettingsStore } from "@/stores/settingsStore";
import type { DownscaleAlgorithm } from "@/stores/settingsStore";

export default function PostProcessSelector() {
  const config = useSettingsStore((s) => s.postProcess);
  const setConfig = useSettingsStore((s) => s.setPostProcess);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">후처리 도구</label>

      {/* 다운스케일 알고리즘 */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-500">다운스케일</label>
        <select
          value={config.downscale}
          onChange={(e) =>
            setConfig({ downscale: e.target.value as DownscaleAlgorithm })
          }
          className="px-2 py-1 text-xs bg-gray-700 rounded border border-gray-600 text-white focus:outline-none focus:border-blue-500"
        >
          <option value="mode">최빈색 (기본)</option>
          <option value="nearest">좌상단 (nearest)</option>
        </select>
      </div>

      {/* 투명 배경 토글 */}
      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={config.transparentBg}
          onChange={(e) => setConfig({ transparentBg: e.target.checked })}
          className="accent-blue-500"
        />
        <span>투명 배경 처리</span>
      </label>

      {/* 팔레트 매핑 토글 */}
      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={config.paletteMap}
          onChange={(e) => setConfig({ paletteMap: e.target.checked })}
          className="accent-blue-500"
        />
        <span>팔레트 매핑</span>
      </label>
    </div>
  );
}
