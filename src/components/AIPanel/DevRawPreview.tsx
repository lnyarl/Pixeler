import { useState } from "react";
import type { ProcessedDraft } from "./PromptPanel";

interface DevRawPreviewProps {
  drafts: ProcessedDraft[];
}

export default function DevRawPreview({ drafts }: DevRawPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  if (!import.meta.env.DEV) return null;
  if (!drafts || drafts.length === 0) return null;
  // DEV 모드에서 rawBase64가 thumbnail과 같으면 (DEV 스킵) 표시 안 함
  if (drafts.every((d) => d.rawBase64 === d.thumbnail)) return null;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-yellow-500 hover:text-yellow-300 text-left"
      >
        {expanded ? "▼" : "▶"} DEV: AI 원본 보기 ({drafts.length}장)
      </button>
      {expanded && (
        <div className="grid grid-cols-2 gap-1">
          {drafts.map((draft, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <div className="flex gap-1">
                <div className="flex-1">
                  <p className="text-[9px] text-gray-500 text-center">AI 원본</p>
                  <img
                    src={`data:image/png;base64,${draft.rawBase64}`}
                    alt={`원본 ${i + 1}`}
                    className="w-full aspect-square object-contain rounded border border-yellow-800 bg-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] text-gray-500 text-center">후처리</p>
                  <img
                    src={`data:image/png;base64,${draft.thumbnail}`}
                    alt={`후처리 ${i + 1}`}
                    className="w-full aspect-square object-contain rounded border border-gray-600 bg-gray-900"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
