/**
 * AnimationFrameGrid — 프레임 N개 썸네일 그리드 (γ-F7).
 *
 * - 클릭 → onSelectFrame(frameIdx).
 * - 선택된 프레임 ring 강조.
 * - 각 프레임에 [↻] 재생성 버튼 (실제 호출은 부모 핸들러).
 * - DEV 환경: [DEV] 재생성 버튼 추가.
 */
import { useEffect, useRef } from "react";
import type { AnimationFrame } from "@/services/persistence/types";

interface Props {
  frames: AnimationFrame[];
  selectedIdx: number;
  busyIdx: number | null;
  onSelectFrame: (idx: number) => void;
  onRegenerate: (idx: number) => void;
  onDevRegenerate?: (idx: number) => void;
}

export default function AnimationFrameGrid({
  frames,
  selectedIdx,
  busyIdx,
  onSelectFrame,
  onRegenerate,
  onDevRegenerate,
}: Props) {
  const isDev = import.meta.env.DEV;

  return (
    <div
      className="flex flex-wrap gap-2"
      data-testid="animation-frame-grid"
      data-frame-count={frames.length}
    >
      {frames.map((frame, idx) => (
        <FrameCell
          key={idx}
          frame={frame}
          idx={idx}
          selected={idx === selectedIdx}
          busy={busyIdx === idx}
          onSelect={() => onSelectFrame(idx)}
          onRegenerate={() => onRegenerate(idx)}
          onDevRegenerate={
            isDev && onDevRegenerate ? () => onDevRegenerate(idx) : undefined
          }
        />
      ))}
    </div>
  );
}

interface FrameCellProps {
  frame: AnimationFrame;
  idx: number;
  selected: boolean;
  busy: boolean;
  onSelect: () => void;
  onRegenerate: () => void;
  onDevRegenerate?: () => void;
}

function FrameCell({
  frame,
  idx,
  selected,
  busy,
  onSelect,
  onRegenerate,
  onDevRegenerate,
}: FrameCellProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = frame.imageData.width;
    canvas.height = frame.imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(frame.imageData, 0, 0);
  }, [frame]);

  return (
    <div
      className={`flex flex-col items-center gap-1 p-2 rounded cursor-pointer transition-all ${
        selected
          ? "bg-gray-800 ring-2 ring-blue-500"
          : "bg-gray-900 ring-1 ring-gray-700 hover:ring-gray-500"
      }`}
      onClick={onSelect}
      data-testid={`animation-frame-${idx}`}
      data-selected={selected ? "true" : "false"}
    >
      <span className="text-[10px] font-mono text-gray-500">F{idx + 1}</span>
      <div className="w-16 h-16 flex items-center justify-center bg-gray-950 rounded overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ imageRendering: "pixelated" }}
          className="w-full h-full"
        />
      </div>
      <div className="flex gap-1 w-full">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRegenerate();
          }}
          disabled={busy}
          className="flex-1 text-[10px] px-1 py-0.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-gray-200"
          data-testid={`animation-frame-regen-${idx}`}
          title="이 프레임 재생성"
        >
          ↻
        </button>
        {onDevRegenerate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDevRegenerate();
            }}
            disabled={busy}
            className="flex-1 text-[10px] px-1 py-0.5 bg-yellow-700 hover:bg-yellow-600 disabled:bg-yellow-900 disabled:text-yellow-700 rounded text-white font-mono"
            data-testid={`animation-frame-dev-regen-${idx}`}
            title="DEV: 더미 프레임 재생성"
          >
            DEV
          </button>
        )}
      </div>
    </div>
  );
}
