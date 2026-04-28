import { useHistoryStore, type HistoryItem } from "@/stores/historyStore";
import { useCanvasHandleStore } from "@/stores/canvasHandleStore";
import HistoryGraph from "./HistoryGraph";

export default function HistoryPanel() {
  const items = useHistoryStore((s) => s.items);
  const activeItemId = useHistoryStore((s) => s.activeItemId);
  const removeItem = useHistoryStore((s) => s.removeItem);
  const setActiveItemId = useHistoryStore((s) => s.setActiveItemId);
  const clearAll = useHistoryStore((s) => s.clear);
  const loadImageData = useCanvasHandleStore((s) => s.loadImageData);
  function handleSelect(item: HistoryItem) {
    if (item.id === activeItemId) return;
    // undo 스택에 현재 상태가 저장되므로 확인 다이얼로그 불필요
    loadImageData(item.imageData);
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
