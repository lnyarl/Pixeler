import { useRef, useEffect, useState, useCallback } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { hexToRgba, screenToPixel, fillPixels } from "@/utils/pixelOps";
import { UndoRedoManager } from "@/utils/undoRedoManager";
import GridOverlay from "./GridOverlay";

const MIN_SCALE = 1;
const MAX_SCALE = 32;
const SCALE_STEP = 1.2;

export default function PixelCanvas() {
  const resolution = useCanvasStore((s) => s.resolution);
  const currentTool = useCanvasStore((s) => s.currentTool);
  const currentColor = useCanvasStore((s) => s.currentColor);
  const brushSize = useCanvasStore((s) => s.brushSize);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const imageDataRef = useRef<ImageData | null>(null);
  const isDrawingRef = useRef(false);
  const undoManagerRef = useRef(new UndoRedoManager());
  const [, forceUpdate] = useState(0);

  const calcFitScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 16;
    const padding = 80;
    const maxW = container.clientWidth - padding;
    const maxH = container.clientHeight - padding;
    const fitScale = Math.floor(Math.min(maxW / resolution, maxH / resolution));
    return Math.max(MIN_SCALE, Math.min(fitScale, MAX_SCALE));
  }, [resolution]);

  // 캔버스 초기화
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = resolution;
    canvas.height = resolution;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    imageDataRef.current = ctx.createImageData(resolution, resolution);
    ctx.putImageData(imageDataRef.current, 0, 0);
    undoManagerRef.current.clear();
    forceUpdate((n) => n + 1);
  }, [resolution]);

  // fit scale
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => setScale(calcFitScale()));
    observer.observe(container);
    return () => observer.disconnect();
  }, [calcFitScale]);

  // 줌
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((prev) => {
      if (e.deltaY < 0) return Math.min(MAX_SCALE, Math.ceil(prev * SCALE_STEP));
      return Math.max(MIN_SCALE, Math.floor(prev / SCALE_STEP));
    });
  }, []);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const imgData = imageDataRef.current;
    if (!canvas || !imgData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(imgData, 0, 0);
  }, []);

  // undo
  const handleUndo = useCallback(() => {
    const imgData = imageDataRef.current;
    if (!imgData) return;
    const prev = undoManagerRef.current.undo(imgData);
    if (prev) {
      imageDataRef.current = prev;
      renderCanvas();
      forceUpdate((n) => n + 1);
    }
  }, [renderCanvas]);

  // redo
  const handleRedo = useCallback(() => {
    const imgData = imageDataRef.current;
    if (!imgData) return;
    const next = undoManagerRef.current.redo(imgData);
    if (next) {
      imageDataRef.current = next;
      renderCanvas();
      forceUpdate((n) => n + 1);
    }
  }, [renderCanvas]);

  // 키보드 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey && e.shiftKey && e.key === "Z") ||
        (e.ctrlKey && e.key === "y")
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo, handleRedo]);

  // 드로잉
  const drawAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      const imgData = imageDataRef.current;
      if (!canvas || !imgData) return;
      const wrapper = canvas.parentElement;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const pixel = screenToPixel(clientX, clientY, rect, resolution, scale);
      if (!pixel) return;

      const rgba: [number, number, number, number] =
        currentTool === "eraser" ? [0, 0, 0, 0] : hexToRgba(currentColor);
      fillPixels(imgData, pixel.x, pixel.y, brushSize, rgba);
      renderCanvas();
    },
    [resolution, scale, currentTool, currentColor, brushSize, renderCanvas]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      // 그리기 시작 전 스냅샷 저장
      if (imageDataRef.current) {
        undoManagerRef.current.pushSnapshot(imageDataRef.current);
        forceUpdate((n) => n + 1);
      }
      isDrawingRef.current = true;
      drawAt(e.clientX, e.clientY);
    },
    [drawAt]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawingRef.current) return;
      drawAt(e.clientX, e.clientY);
    },
    [drawAt]
  );

  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false;
  }, []);

  const um = undoManagerRef.current;
  const scaledSize = resolution * scale;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex items-center justify-center overflow-hidden"
      onWheel={handleWheel}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="relative cursor-crosshair"
        style={{ width: scaledSize, height: scaledSize }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
      >
        <canvas
          ref={canvasRef}
          width={resolution}
          height={resolution}
          className="absolute top-0 left-0 bg-[repeating-conic-gradient(#404040_0%_25%,#333333_0%_50%)]"
          style={{
            imageRendering: "pixelated",
            width: scaledSize,
            height: scaledSize,
          }}
        />
        <GridOverlay resolution={resolution} scale={scale} visible={showGrid} />
      </div>

      <div className="absolute bottom-3 left-3 flex gap-2 items-center">
        <button
          onClick={() => setShowGrid((v) => !v)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            showGrid
              ? "bg-blue-600 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          그리드
        </button>
        <button
          onClick={handleUndo}
          disabled={!um.canUndo}
          className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Undo
        </button>
        <button
          onClick={handleRedo}
          disabled={!um.canRedo}
          className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Redo
        </button>
      </div>

      <div className="absolute bottom-3 right-3 bg-gray-800/80 px-2 py-1 rounded text-xs text-gray-400">
        {scale}x ({resolution}×{resolution})
      </div>
    </div>
  );
}

export { MIN_SCALE, MAX_SCALE };
