import { useRef, useCallback } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import {
  hexToRgba,
  screenToPixel,
  drawLine,
  fillPixels,
  shiftImageData,
} from "@/utils/pixelOps";
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
  // move 도구: 드래그 시작 시 원본 이미지 + 시작 픽셀 좌표 저장
  const moveStartRef = useRef<{ x: number; y: number } | null>(null);
  const moveBaseImageRef = useRef<ImageData | null>(null);

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

  // move 도구에서는 캔버스 밖 좌표도 허용 (드래그 중 밖으로 나갈 수 있음)
  const getPixelUnbounded = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const wrapper = canvas.parentElement;
      if (!wrapper) return null;
      const rect = wrapper.getBoundingClientRect();
      const localX = clientX - rect.left;
      const localY = clientY - rect.top;
      return {
        x: Math.floor(localX / scale),
        y: Math.floor(localY / scale),
      };
    },
    [canvasRef, scale]
  );

  const getRgba = useCallback((): [number, number, number, number] => {
    return currentTool === "eraser" ? [0, 0, 0, 0] : hexToRgba(currentColor);
  }, [currentTool, currentColor]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (currentTool === "mask") return;

      const imgData = imageDataRef.current;
      if (!imgData) return;

      // 스냅샷 저장 (undo용)
      undoManager.pushSnapshot(imgData);
      onStateChange();
      isDrawingRef.current = true;

      if (currentTool === "move") {
        const pixel = getPixelUnbounded(e.clientX, e.clientY);
        if (pixel) {
          moveStartRef.current = pixel;
          // 드래그 시작 시 원본 복사본 저장
          moveBaseImageRef.current = new ImageData(
            new Uint8ClampedArray(imgData.data),
            imgData.width,
            imgData.height
          );
        }
        return;
      }

      // pen / eraser
      const pixel = getPixel(e.clientX, e.clientY);
      if (pixel) {
        fillPixels(imgData, pixel.x, pixel.y, brushSize, getRgba());
        lastPixelRef.current = pixel;
        onRender();
        useCanvasStore.getState().setDirty(true);
      }
    },
    [imageDataRef, undoManager, getPixel, getPixelUnbounded, brushSize, getRgba, onRender, onStateChange, currentTool]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawingRef.current) return;
      const imgData = imageDataRef.current;
      if (!imgData) return;

      if (currentTool === "move") {
        const pixel = getPixelUnbounded(e.clientX, e.clientY);
        const start = moveStartRef.current;
        const baseImage = moveBaseImageRef.current;
        if (!pixel || !start || !baseImage) return;

        const dx = pixel.x - start.x;
        const dy = pixel.y - start.y;

        // 원본 기준으로 이동 (누적 드래그가 아니라 시작점 대비 오프셋)
        const shifted = shiftImageData(baseImage, dx, dy);
        imgData.data.set(shifted.data);
        onRender();
        useCanvasStore.getState().setDirty(true);
        return;
      }

      // pen / eraser
      const pixel = getPixel(e.clientX, e.clientY);
      if (!pixel) return;

      const rgba = getRgba();
      const last = lastPixelRef.current;

      if (last && (last.x !== pixel.x || last.y !== pixel.y)) {
        drawLine(imgData, last.x, last.y, pixel.x, pixel.y, brushSize, rgba);
      } else {
        fillPixels(imgData, pixel.x, pixel.y, brushSize, rgba);
      }

      lastPixelRef.current = pixel;
      onRender();
    },
    [imageDataRef, getPixel, getPixelUnbounded, brushSize, getRgba, onRender, currentTool]
  );

  const handleMouseUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPixelRef.current = null;
    moveStartRef.current = null;
    moveBaseImageRef.current = null;
  }, []);

  return { handleMouseDown, handleMouseMove, handleMouseUp };
}
