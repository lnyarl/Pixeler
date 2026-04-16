import { useRef, useEffect } from "react";

interface MiniPreviewProps {
  imageDataRef: React.MutableRefObject<ImageData | null>;
  width: number;
  height: number;
  /** 리렌더 트리거용 (부모에서 변경 시 갱신) */
  renderKey: number;
}

const PREVIEW_MAX = 96;

export default function MiniPreview({
  imageDataRef,
  width,
  height,
  renderKey,
}: MiniPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 프리뷰 크기: 긴 쪽을 PREVIEW_MAX에 맞추고 비율 유지
  const ratio = Math.min(PREVIEW_MAX / width, PREVIEW_MAX / height);
  const previewW = Math.round(width * ratio);
  const previewH = Math.round(height * ratio);

  useEffect(() => {
    const canvas = canvasRef.current;
    const imgData = imageDataRef.current;
    if (!canvas || !imgData) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.putImageData(imgData, 0, 0);
  }, [imageDataRef, width, height, renderKey]);

  return (
    <div className="absolute bottom-12 left-3 bg-gray-800 border border-gray-600 rounded p-1 shadow-lg">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="bg-[repeating-conic-gradient(#404040_0%_25%,#333333_0%_50%)]"
        style={{
          imageRendering: "pixelated",
          width: previewW,
          height: previewH,
        }}
      />
      <p className="text-center text-[10px] text-gray-500 mt-0.5">
        {width}×{height}
      </p>
    </div>
  );
}
