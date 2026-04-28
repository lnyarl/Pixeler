/**
 * DirectionCell — 그리드 한 셀.
 *
 * - 채워짐: ImageData를 작은 canvas에 픽셀화 렌더 + "↻ 재생성" + "삭제" 버튼.
 * - 비어있음: placeholder.
 * - DEV 모드일 때 [DEV ↻] 버튼이 함께 노출 (M4) — onDevRegen 콜백을 받음.
 */
import { useEffect, useRef } from "react";
import type { DirKey, DirectionSprite } from "@/services/persistence/types";

interface DirectionCellProps {
  direction: DirKey;
  sprite: DirectionSprite | undefined;
  selected: boolean;
  onSelect: () => void;
  onRegenerate: () => void;
  onDevRegenerate?: () => void;
  onClear: () => void;
  busy?: boolean;
}

export default function DirectionCell({
  direction,
  sprite,
  selected,
  onSelect,
  onRegenerate,
  onDevRegenerate,
  onClear,
  busy,
}: DirectionCellProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sprite) return;
    canvas.width = sprite.imageData.width;
    canvas.height = sprite.imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(sprite.imageData, 0, 0);
  }, [sprite]);

  const isDev = import.meta.env.DEV;

  return (
    <div
      className={`relative bg-gray-800 rounded p-2 flex flex-col items-center gap-1 cursor-pointer transition-all ${
        selected
          ? "ring-2 ring-blue-500"
          : "ring-1 ring-gray-700 hover:ring-gray-500"
      }`}
      onClick={onSelect}
      data-testid={`direction-cell-${direction}`}
      data-filled={sprite ? "true" : "false"}
    >
      <div className="text-xs text-gray-400 font-mono w-full flex justify-between">
        <span>{direction}</span>
        {sprite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-gray-500 hover:text-red-400"
            title="삭제"
            data-testid={`direction-cell-clear-${direction}`}
          >
            ×
          </button>
        )}
      </div>
      <div className="w-20 h-20 flex items-center justify-center bg-gray-900 rounded overflow-hidden">
        {sprite ? (
          <canvas
            ref={canvasRef}
            style={{ imageRendering: "pixelated" }}
            className="w-full h-full"
          />
        ) : (
          <span className="text-gray-600 text-xs">empty</span>
        )}
      </div>
      <div className="flex gap-1 w-full">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRegenerate();
          }}
          disabled={busy}
          className="flex-1 text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded text-gray-200"
          data-testid={`direction-cell-regen-${direction}`}
          title="이 방향 재생성"
        >
          ↻
        </button>
        {isDev && onDevRegenerate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDevRegenerate();
            }}
            disabled={busy}
            className="flex-1 text-xs px-2 py-1 bg-yellow-700 hover:bg-yellow-600 disabled:bg-yellow-900 disabled:text-yellow-700 rounded text-white font-mono"
            data-testid={`direction-cell-dev-regen-${direction}`}
            title="DEV: 더미 재생성"
          >
            DEV
          </button>
        )}
      </div>
    </div>
  );
}
