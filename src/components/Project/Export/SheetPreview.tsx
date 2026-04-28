/**
 * SheetPreview — 합성된 시트 ImageData를 작은 캔버스에 미리보기.
 *
 * 시트 전체가 한 화면에 들어가도록 maxWidth/maxHeight에 맞춰 fit (CSS 스케일).
 * 픽셀 아트 보존을 위해 image-rendering: pixelated.
 */

import { useEffect, useRef } from "react";

interface Props {
  imageData: ImageData | null;
  maxWidth?: number;
  maxHeight?: number;
}

export default function SheetPreview({
  imageData,
  maxWidth = 480,
  maxHeight = 480,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  if (!imageData) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-sm border border-gray-700 bg-gray-900 rounded"
        style={{ width: maxWidth, height: maxHeight }}
        data-testid="export-sheet-preview-empty"
      >
        합성 중...
      </div>
    );
  }

  // CSS 스케일 — aspect ratio 유지하며 max에 맞춤.
  const wRatio = maxWidth / imageData.width;
  const hRatio = maxHeight / imageData.height;
  const scale = Math.min(wRatio, hRatio, 16); // 너무 큰 확대는 방지.
  const displayW = Math.max(1, Math.round(imageData.width * scale));
  const displayH = Math.max(1, Math.round(imageData.height * scale));

  return (
    <div
      className="border border-gray-700 bg-[length:16px_16px] bg-gray-900 rounded p-2"
      style={{
        backgroundImage:
          "linear-gradient(45deg, #2a2a2a 25%, transparent 25%), linear-gradient(-45deg, #2a2a2a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2a2a 75%), linear-gradient(-45deg, transparent 75%, #2a2a2a 75%)",
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
      }}
      data-testid="export-sheet-preview"
    >
      <canvas
        ref={canvasRef}
        style={{
          width: displayW,
          height: displayH,
          imageRendering: "pixelated",
          display: "block",
        }}
      />
      <div className="mt-2 text-xs text-gray-400 text-center">
        {imageData.width} × {imageData.height} px
      </div>
    </div>
  );
}
