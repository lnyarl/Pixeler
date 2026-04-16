import { useRef, useEffect, useState, useCallback } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { UndoRedoManager } from "@/utils/undoRedoManager";
import { useDrawTool } from "./tools/useDrawTool";
import GridOverlay from "./GridOverlay";
import ZoomControl from "@/components/Toolbar/ZoomControl";
import UndoRedoButtons from "@/components/Toolbar/UndoRedoButtons";
import MiniPreview from "./MiniPreview";
import MaskOverlay from "./MaskOverlay";

const MIN_SCALE = 1;
const MAX_SCALE = 64;

export interface PixelCanvasHandle {
  loadImageData: (data: ImageData) => void;
  getImageData: () => ImageData | null;
}

interface PixelCanvasProps {
  onReady?: (handle: PixelCanvasHandle) => void;
  disabled?: boolean;
}

export default function PixelCanvas({ onReady, disabled }: PixelCanvasProps) {
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const imageDataRef = useRef<ImageData | null>(null);
  const undoManagerRef = useRef(new UndoRedoManager());
  const [renderKey, setRenderKey] = useState(0);

  const triggerUpdate = useCallback(() => setRenderKey((n) => n + 1), []);

  const calcFitScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return 16;
    const padding = 80;
    const maxW = container.clientWidth - padding;
    const maxH = container.clientHeight - padding;
    const fitScale = Math.floor(Math.min(maxW / width, maxH / height));
    return Math.max(MIN_SCALE, Math.min(fitScale, MAX_SCALE));
  }, [width, height]);

  // 해상도 변경 시 기존 이미지 보존 (좌상단 기준 crop/pad)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const oldData = imageDataRef.current;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newData = ctx.createImageData(width, height);

    if (oldData) {
      const copyW = Math.min(oldData.width, width);
      const copyH = Math.min(oldData.height, height);
      for (let y = 0; y < copyH; y++) {
        for (let x = 0; x < copyW; x++) {
          const srcIdx = (y * oldData.width + x) * 4;
          const dstIdx = (y * width + x) * 4;
          newData.data[dstIdx] = oldData.data[srcIdx];
          newData.data[dstIdx + 1] = oldData.data[srcIdx + 1];
          newData.data[dstIdx + 2] = oldData.data[srcIdx + 2];
          newData.data[dstIdx + 3] = oldData.data[srcIdx + 3];
        }
      }
    }

    imageDataRef.current = newData;
    ctx.putImageData(newData, 0, 0);
    undoManagerRef.current.clear();
    triggerUpdate();
  }, [width, height, triggerUpdate]);

  // fit scale (ResizeObserver)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => setScale(calcFitScale()));
    observer.observe(container);
    return () => observer.disconnect();
  }, [calcFitScale]);

  // wheel zoom (native event for passive:false)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setScale((prev) => {
        if (e.deltaY < 0) return Math.min(MAX_SCALE, prev + 1);
        return Math.max(MIN_SCALE, prev - 1);
      });
    };
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, []);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const imgData = imageDataRef.current;
    if (!canvas || !imgData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(imgData, 0, 0);
  }, []);

  // 외부에서 이미지 로드 (AI 생성 결과, 히스토리 복원 등)
  const loadImageData = useCallback(
    (data: ImageData) => {
      // AI 생성/히스토리 복원 시 undo 스택 클리어 (새 작업 시작)
      undoManagerRef.current.clear();
      imageDataRef.current = new ImageData(
        new Uint8ClampedArray(data.data),
        data.width,
        data.height
      );
      renderCanvas();
      useCanvasStore.getState().setDirty(true);
      triggerUpdate();
    },
    [renderCanvas, triggerUpdate]
  );

  const getImageData = useCallback(() => {
    return imageDataRef.current
      ? new ImageData(
          new Uint8ClampedArray(imageDataRef.current.data),
          imageDataRef.current.width,
          imageDataRef.current.height
        )
      : null;
  }, []);

  // onReady 콜백으로 handle 전달
  useEffect(() => {
    onReady?.({ loadImageData, getImageData });
  }, [onReady, loadImageData, getImageData]);

  // undo / redo
  const handleUndo = useCallback(() => {
    const imgData = imageDataRef.current;
    if (!imgData) return;
    const prev = undoManagerRef.current.undo(imgData);
    if (prev) {
      imageDataRef.current = prev;
      renderCanvas();
      triggerUpdate();
    }
  }, [renderCanvas, triggerUpdate]);

  const handleRedo = useCallback(() => {
    const imgData = imageDataRef.current;
    if (!imgData) return;
    const next = undoManagerRef.current.redo(imgData);
    if (next) {
      imageDataRef.current = next;
      renderCanvas();
      triggerUpdate();
    }
  }, [renderCanvas, triggerUpdate]);

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

  // 도구 로직 (분리)
  const { handleMouseDown, handleMouseMove, handleMouseUp } = useDrawTool({
    canvasRef,
    imageDataRef,
    undoManager: undoManagerRef.current,
    scale,
    onRender: renderCanvas,
    onStateChange: triggerUpdate,
  });

  const zoomIn = useCallback(() => setScale((s) => Math.min(MAX_SCALE, s + 1)), []);
  const zoomOut = useCallback(() => setScale((s) => Math.max(MIN_SCALE, s - 1)), []);

  const currentTool = useCanvasStore((s) => s.currentTool);
  const maskData = useCanvasStore((s) => s.maskData);
  const um = undoManagerRef.current;
  const scaledW = width * scale;
  const scaledH = height * scale;
  const cursorClass = disabled
    ? "cursor-not-allowed"
    : currentTool === "move"
      ? "cursor-grab active:cursor-grabbing"
      : "cursor-crosshair";

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex items-center justify-center overflow-hidden"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className={`relative ${cursorClass}`}
        style={{ width: scaledW, height: scaledH }}
        onMouseDown={disabled ? undefined : handleMouseDown}
        onMouseMove={disabled ? undefined : handleMouseMove}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute top-0 left-0 bg-[repeating-conic-gradient(#404040_0%_25%,#333333_0%_50%)]"
          style={{
            imageRendering: "pixelated",
            width: scaledW,
            height: scaledH,
          }}
        />
        <MaskOverlay
          width={width}
          height={height}
          scale={scale}
          maskData={maskData}
        />
        <GridOverlay
          width={width}
          height={height}
          scale={scale}
          visible={showGrid}
        />
      </div>

      <MiniPreview
        imageDataRef={imageDataRef}
        width={width}
        height={height}
        renderKey={renderKey}
      />

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
        <UndoRedoButtons
          canUndo={um.canUndo}
          canRedo={um.canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      </div>

      <ZoomControl
        scale={scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        width={width}
        height={height}
      />
    </div>
  );
}
