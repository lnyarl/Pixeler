import { useHistoryStore, type HistoryItem } from "@/stores/historyStore";
import { useCanvasStore } from "@/stores/canvasStore";
import HistoryGraph from "./HistoryGraph";

interface HistoryPanelProps {
  onRestore: (imageData: ImageData) => void;
}

export default function HistoryPanel({ onRestore }: HistoryPanelProps) {
  const items = useHistoryStore((s) => s.items);
  const activeItemId = useHistoryStore((s) => s.activeItemId);
  const removeItem = useHistoryStore((s) => s.removeItem);
  const setActiveItemId = useHistoryStore((s) => s.setActiveItemId);
  const clearAll = useHistoryStore((s) => s.clear);
  const dirty = useCanvasStore((s) => s.dirty);

  function handleSelect(item: HistoryItem) {
    if (dirty) {
      if (!window.confirm("현재 편집 내용을 버리고 이 버전을 로드하시겠습니까?")) {
        return;
      }
    }
    onRestore(item.imageData);
    setActiveItemId(item.id);
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 font-medium">히스토리</label>
        <p className="text-xs text-gray-500">아직 생성된 이미지가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 font-medium">
          히스토리 ({items.length})
        </label>
        <button
          onClick={() => {
            if (window.confirm("히스토리를 전부 삭제하시겠습니까?")) {
              clearAll();
            }
          }}
          className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
        >
          전체 삭제
        </button>
      </div>

      <HistoryGraph
        items={items}
        activeItemId={activeItemId}
        onSelect={handleSelect}
        onDelete={removeItem}
      />
    </div>
  );
}
