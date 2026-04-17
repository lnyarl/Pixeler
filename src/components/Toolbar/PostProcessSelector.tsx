import { useSettingsStore } from "@/stores/settingsStore";
import type { DownscaleAlgorithm } from "@/stores/settingsStore";
import { paletteMap } from "@/services/ai/postprocess/paletteMap";
import { makeTransparentBackground } from "@/services/ai/postprocess/transparentBackground";

interface PostProcessSelectorProps {
  getCanvasImageData: () => ImageData | null;
  onImageReady: (data: ImageData) => void;
}

export default function PostProcessSelector({
  getCanvasImageData,
  onImageReady,
}: PostProcessSelectorProps) {
  const config = useSettingsStore((s) => s.postProcess);
  const setConfig = useSettingsStore((s) => s.setPostProcess);
  const paletteSize = useSettingsStore((s) => s.paletteSize);

  /** 활성화된 단계를 현재 캔버스에 적용 (다운스케일은 스킵 — 이미 목표 해상도이므로) */
  function applyToCanvas() {
    const img = getCanvasImageData();
    if (!img) return;
    let result = img;
    if (config.transparentBg) {
      result = makeTransparentBackground(result);
    }
    if (config.paletteMap && paletteSize > 0) {
      result = paletteMap(result, paletteSize);
    }
    onImageReady(result);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">후처리</label>

      {/* 다운스케일 알고리즘 */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-gray-500">
          다운스케일 (AI 생성 시만)
        </label>
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

      {/* 수동 적용 */}
      <button
        onClick={applyToCanvas}
        className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
        title="활성화된 후처리를 현재 캔버스에 즉시 적용"
      >
        현재 캔버스에 적용
      </button>
    </div>
  );
}
