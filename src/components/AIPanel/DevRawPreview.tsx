import { useState } from "react";
import { useHistoryStore } from "@/stores/historyStore";

export default function DevRawPreview() {
  const [expanded, setExpanded] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);

  const activeItemId = useHistoryStore((s) => s.activeItemId);
  const items = useHistoryStore((s) => s.items);

  if (!import.meta.env.DEV) return null;

  const activeItem = items.find((i) => i.id === activeItemId);
  if (!activeItem?.rawBase64) return null;

  return (
    <>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-yellow-500 hover:text-yellow-300 text-left"
        >
          {expanded ? "▼" : "▶"} DEV: AI 원본 비교
        </button>
        {expanded && (
          <div className="flex gap-1">
            <div className="flex-1">
              <p className="text-[9px] text-gray-500 text-center mb-0.5">
                AI 원본
              </p>
              <img
                src={`data:image/png;base64,${activeItem.rawBase64}`}
                alt="AI 원본"
                className="w-full aspect-square object-contain rounded border border-yellow-800 bg-gray-900 cursor-pointer hover:border-yellow-500"
                onClick={() => setModalImage(activeItem.rawBase64!)}
              />
            </div>
            <div className="flex-1">
              <p className="text-[9px] text-gray-500 text-center mb-0.5">
                후처리
              </p>
              <img
                src={`data:image/png;base64,${activeItem.thumbnail}`}
                alt="후처리"
                className="w-full aspect-square object-contain rounded border border-gray-600 bg-gray-900 cursor-pointer hover:border-blue-500"
                style={{ imageRendering: "pixelated" }}
                onClick={() => setModalImage(activeItem.thumbnail)}
              />
            </div>
          </div>
        )}
      </div>

      {modalImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
          onClick={() => setModalImage(null)}
        >
          <img
            src={`data:image/png;base64,${modalImage}`}
            alt="확대"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded border border-gray-600"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
      )}
    </>
  );
}
