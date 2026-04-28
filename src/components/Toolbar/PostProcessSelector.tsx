import { useSettingsStore } from "@/stores/settingsStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useDebugLogStore } from "@/stores/debugLogStore";
import { useCanvasHandleStore } from "@/stores/canvasHandleStore";
import type { DownscaleAlgorithm } from "@/stores/settingsStore";
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import { base64ToImageData, imageDataToBase64 } from "@/utils/imageConvert";

export default function PostProcessSelector() {
  const config = useSettingsStore((s) => s.postProcess);
  const setConfig = useSettingsStore((s) => s.setPostProcess);
  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);
  const activeItemId = useHistoryStore((s) => s.activeItemId);
  const items = useHistoryStore((s) => s.items);
  const loadImageData = useCanvasHandleStore((s) => s.loadImageData);

  const activeItem = items.find((i) => i.id === activeItemId);
  const canReapply = Boolean(activeItem?.rawBase64);

  /** AI 원본 → 전체 파이프라인 재실행 */
  async function reapplyFromRaw() {
    if (!activeItem?.rawBase64) return;
    const raw = await base64ToImageData(activeItem.rawBase64);
    const result: ImageData = await runPostProcess(raw, {
      targetWidth: width,
      targetHeight: height,
      paletteSize,
      config,
    });
    loadImageData(result);

    // 같은 rawBase64를 가진 가장 최근 디버그 로그 엔트리의 processedOutput 갱신
    const debug = useDebugLogStore.getState();
    const target = debug.entries.find((e) => e.rawOutput === activeItem.rawBase64);
    if (target) {
      debug.updateEntry(target.id, {
        processedOutput: imageDataToBase64(result),
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">후처리</label>

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

      {/* 외곽선 보존 — mode 알고리즘에서만 유효. nearest 선택 시 disabled (UX 명료성). */}
      <label
        className={`flex items-center gap-2 text-xs ${
          config.downscale === "mode"
            ? "text-gray-300 cursor-pointer"
            : "text-gray-500 opacity-50 cursor-not-allowed"
        }`}
        title={
          config.downscale === "mode"
            ? "어두운 외곽선 픽셀이 mode 후보보다 충분히 어두우면 외곽선을 보존"
            : "다운스케일이 '최빈색'일 때만 사용 가능"
        }
      >
        <input
          type="checkbox"
          checked={config.outlinePreserve}
          onChange={(e) => setConfig({ outlinePreserve: e.target.checked })}
          disabled={config.downscale !== "mode"}
          className="accent-blue-500"
        />
        <span>외곽선 보존</span>
      </label>

      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={config.transparentBg}
          onChange={(e) => setConfig({ transparentBg: e.target.checked })}
          className="accent-blue-500"
        />
        <span>투명 배경 처리</span>
      </label>

      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={config.paletteMap}
          onChange={(e) => setConfig({ paletteMap: e.target.checked })}
          className="accent-blue-500"
        />
        <span>팔레트 매핑</span>
      </label>

      <button
        onClick={reapplyFromRaw}
        disabled={!canReapply}
        className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        title={
          canReapply
            ? "AI 원본에서 현재 후처리 설정으로 다시 적용"
            : "AI 원본이 있는 히스토리 항목을 선택해주세요"
        }
      >
        AI 원본에 재적용
      </button>
    </div>
  );
}
