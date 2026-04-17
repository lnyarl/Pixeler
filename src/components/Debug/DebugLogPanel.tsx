import { useState } from "react";
import { useDebugLogStore, type DebugLogEntry } from "@/stores/debugLogStore";

export default function DebugLogPanel() {
  const [open, setOpen] = useState(false);
  const entries = useDebugLogStore((s) => s.entries);
  const clear = useDebugLogStore((s) => s.clear);

  if (!import.meta.env.DEV) return null;

  return (
    <>
      {/* 플로팅 토글 버튼 */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-3 right-3 z-40 px-3 py-1.5 bg-yellow-800 text-yellow-200 text-xs rounded shadow-lg hover:bg-yellow-700 transition-colors"
      >
        🪵 DEBUG ({entries.length})
      </button>

      {/* 패널 — 전체 화면 */}
      {open && (
        <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-700">
            <h2 className="text-sm font-bold text-yellow-400">
              🪵 디버그 로그 ({entries.length})
            </h2>
            <div className="flex gap-3 items-center">
              <button
                onClick={clear}
                className="text-xs text-gray-400 hover:text-red-400"
              >
                전체 삭제
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white text-xl leading-none px-2"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {entries.length === 0 ? (
              <p className="p-3 text-xs text-gray-500">아직 로그 없음</p>
            ) : (
              <div className="max-w-[1400px] mx-auto">
                {entries.map((entry) => (
                  <DebugLogEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function DebugLogEntryRow({ entry }: { entry: DebugLogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const modeColor: Record<string, string> = {
    generate: "text-blue-400",
    feedback: "text-green-400",
    inpaint: "text-purple-400",
    "dev-skip": "text-yellow-400",
  };

  const modeLabel: Record<string, string> = {
    generate: "생성",
    feedback: "수정 생성",
    inpaint: "부분 수정",
    "dev-skip": "DEV 스킵",
  };

  const time = new Date(entry.timestamp).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="border-b border-gray-800">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2.5 text-left hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs text-gray-500 font-mono shrink-0">
              {expanded ? "▼" : "▶"}
            </span>
            <span className={`text-xs font-bold shrink-0 ${modeColor[entry.mode]}`}>
              {modeLabel[entry.mode]}
            </span>
            <span className="text-xs text-gray-300 truncate">
              {entry.userPrompt}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {entry.error && (
              <span className="text-[10px] text-red-400">ERROR</span>
            )}
            {entry.meta.durationMs !== undefined && (
              <span className="text-[10px] text-gray-500">
                {(entry.meta.durationMs / 1000).toFixed(1)}s
              </span>
            )}
            <span className="text-[10px] text-gray-500">{time}</span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 flex flex-col gap-3 text-xs">
          <Section label="사용자 프롬프트">
            <pre className="bg-gray-800 p-2 rounded text-gray-300 whitespace-pre-wrap break-words">
              {entry.userPrompt}
            </pre>
          </Section>

          <Section label="AI에 전달된 최종 프롬프트">
            <pre className="bg-gray-800 p-2 rounded text-gray-300 whitespace-pre-wrap break-words">
              {entry.finalPrompt}
            </pre>
          </Section>

          <Section label="메타">
            <pre className="bg-gray-800 p-2 rounded text-gray-300 text-[10px]">
              {JSON.stringify(entry.meta, null, 2)}
            </pre>
          </Section>

          {entry.error && (
            <Section label="에러">
              <pre className="bg-red-950/50 border border-red-800 p-2 rounded text-red-300 whitespace-pre-wrap break-words">
                {entry.error}
              </pre>
            </Section>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {entry.referenceImage && (
              <ImageSlot
                label="입력: 참조 이미지"
                base64={entry.referenceImage}
                pixelated
              />
            )}
            {entry.maskImage && (
              <ImageSlot
                label="입력: 마스크"
                base64={entry.maskImage}
                pixelated
              />
            )}
            {entry.rawOutput && (
              <ImageSlot label="AI 원본 출력" base64={entry.rawOutput} />
            )}
            {entry.processedOutput && (
              <ImageSlot
                label="후처리 결과"
                base64={entry.processedOutput}
                pixelated
              />
            )}
            {entry.compositedOutput && (
              <ImageSlot
                label="마스크 합성 (최종)"
                base64={entry.compositedOutput}
                pixelated
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] text-gray-500 font-medium">{label}</p>
      {children}
    </div>
  );
}

function ImageSlot({
  label,
  base64,
  pixelated,
}: {
  label: string;
  base64: string;
  pixelated?: boolean;
}) {
  const [showFull, setShowFull] = useState(false);
  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-[10px] text-gray-500">{label}</p>
        <img
          src={`data:image/png;base64,${base64}`}
          alt={label}
          className="w-full aspect-square object-contain bg-gray-800 rounded border border-gray-700 cursor-pointer hover:border-yellow-500"
          style={{ imageRendering: pixelated ? "pixelated" : "auto" }}
          onClick={() => setShowFull(true)}
        />
      </div>
      {showFull && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setShowFull(false)}
        >
          <img
            src={`data:image/png;base64,${base64}`}
            alt={label}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            style={{ imageRendering: pixelated ? "pixelated" : "auto" }}
          />
        </div>
      )}
    </>
  );
}
