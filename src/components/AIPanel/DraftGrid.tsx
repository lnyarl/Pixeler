import type { ProcessedDraft } from "./PromptPanel";
import { useHistoryStore } from "@/stores/historyStore";
import { useCanvasHandleStore } from "@/stores/canvasHandleStore";

interface DraftGridProps {
  drafts: ProcessedDraft[];
}

export default function DraftGrid({ drafts }: DraftGridProps) {
  const setActiveItemId = useHistoryStore((s) => s.setActiveItemId);
  const loadImageData = useCanvasHandleStore((s) => s.loadImageData);

  if (!drafts || drafts.length <= 1) return null;

  function handleSelect(draft: ProcessedDraft) {
    // (1) 캔버스에 적용 — 기존 onSelect 콜백 대체
    loadImageData(draft.imageData);
    // (2) 활성 히스토리 갱신 — 기존 그대로 유지 (Major-1)
    setActiveItemId(draft.historyId);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">
        초안 선택 ({drafts.length}장)
      </label>
      <div className="grid grid-cols-2 gap-1">
        {drafts.map((item, i) => (
          <button
            key={item.historyId}
            onClick={() => handleSelect(item)}
            className="aspect-square bg-gray-700 rounded border border-gray-600 hover:border-blue-500 overflow-hidden transition-colors"
            title={`초안 ${i + 1}`}
          >
            <img
              src={`data:image/png;base64,${item.thumbnail}`}
              alt={`초안 ${i + 1}`}
              className="w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
