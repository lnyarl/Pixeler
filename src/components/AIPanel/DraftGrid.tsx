import type { ProcessedDraft } from "./PromptPanel";
import { useHistoryStore } from "@/stores/historyStore";

interface DraftGridProps {
  drafts: ProcessedDraft[];
  onSelect: (imageData: ImageData) => void;
}

export default function DraftGrid({ drafts, onSelect }: DraftGridProps) {
  const setActiveItemId = useHistoryStore((s) => s.setActiveItemId);

  if (!drafts || drafts.length <= 1) return null;

  function handleSelect(draft: ProcessedDraft) {
    onSelect(draft.imageData);
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
              src={`data:image/png;base64,${item.draft.base64}`}
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
