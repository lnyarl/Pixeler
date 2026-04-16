import { useHistoryStore, type HistoryItem } from "@/stores/historyStore";
import { useCanvasStore } from "@/stores/canvasStore";

interface HistoryPanelProps {
  onRestore: (imageData: ImageData) => void;
}

export default function HistoryPanel({ onRestore }: HistoryPanelProps) {
  const items = useHistoryStore((s) => s.items);
  const dirty = useCanvasStore((s) => s.dirty);

  function handleClick(item: HistoryItem) {
    if (dirty) {
      if (!window.confirm("현재 편집 내용을 버리고 이 버전을 로드하시겠습니까?")) {
        return;
      }
    }
    onRestore(item.imageData);
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
      <label className="text-xs text-gray-400 font-medium">
        히스토리 ({items.length})
      </label>
      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className="flex gap-2 items-start p-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-left"
          >
            <img
              src={`data:image/png;base64,${item.thumbnail}`}
              alt=""
              className="w-10 h-10 rounded border border-gray-600 object-contain flex-shrink-0"
              style={{ imageRendering: "pixelated" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-300 truncate">{item.prompt}</p>
              <p className="text-[10px] text-gray-500">
                {item.type === "generate" && "생성"}
                {item.type === "feedback" && "피드백"}
                {item.type === "inpaint" && "부분 수정"}
                {" · "}
                {new Date(item.timestamp).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
