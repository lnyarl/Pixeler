import { useRef, useCallback } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { hexToRgba, screenToPixel, drawLine, fillPixels } from "@/utils/pixelOps";
import { UndoRedoManager } from "@/utils/undoRedoManager";

interface UseDrawToolOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  imageDataRef: React.MutableRefObject<ImageData | null>;
  undoManager: UndoRedoManager;
  scale: number;
  onRender: () => void;
  onStateChange: () => void;
}

export function useDrawTool({
  canvasRef,
  imageDataRef,
  undoManager,
  scale,
  onRender,
  onStateChange,
}: UseDrawToolOptions) {
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);
  const currentTool = useCanvasStore((s) => s.currentTool);
  const currentColor = useCanvasStore((s) => s.currentColor);
  const brushSize = useCanvasStore((s) => s.brushSize);

  const isDrawingRef = useRef(false);
  const lastPixelRef = useRef<{ x: number; y: number } | null>(null);

  const getPixel = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const wrapper = canvas.parentElement;
      if (!wrapper) return null;
      const rect = wrapper.getBoundingClientRect();
      return screenToPixel(clientX, clientY, rect, width, height, scale);
    },
    [canvasRef, width, height, scale]
  );

  const getRgba = useCallback((): [number, number, number, number] => {
    return currentTool === "eraser" ? [0, 0, 0, 0] : hexToRgba(currentColor);
  }, [currentTool, currentColor]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (currentTool === "mask") return;

      const imgData = imageDataRef.current;
      if (imgData) {
        undoManager.pushSnapshot(imgData);
        onStateChange();
      }

      isDrawingRef.current = true;
      const pixel = getPixel(e.clientX, e.clientY);
      if (pixel && imgData) {
        fillPixels(imgData, pixel.x, pixel.y, brushSize, getRgba());
        lastPixelRef.current = pixel;
        onRender();
        useCanvasStore.getState().setDirty(true);
      }
    },
    [imageDataRef, undoManager, getPixel, brushSize, getRgba, onRender, onStateChange, currentTool]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawingRef.current) return;
      const imgData = imageDataRef.current;
      if (!imgData) return;

      const pixel = getPixel(e.clientX, e.clientY);
      if (!pixel) return;

      const rgba = getRgba();
      const last = lastPixelRef.current;

      if (last && (last.x !== pixel.x || last.y !== pixel.y)) {
        // Bresenham 라인으로 이전 점과 현재 점 사이를 채움
        drawLine(imgData, last.x, last.y, pixel.x, pixel.y, brushSize, rgba);
      } else {
        fillPixels(imgData, pixel.x, pixel.y, brushSize, rgba);
      }

      lastPixelRef.current = pixel;
      onRender();
    },
    [imageDataRef, getPixel, brushSize, getRgba, onRender]
  );

  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPixelRef.current = null;
  }, []);

  return { handleMouseDown, handleMouseMove, handleMouseUp };
}
