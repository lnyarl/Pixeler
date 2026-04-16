import { useRef, useEffect } from "react";

interface MaskOverlayProps {
  width: number;
  height: number;
  scale: number;
  maskData: ImageData | null;
}

export default function MaskOverlay({
  width,
  height,
  scale,
  maskData,
}: MaskOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !maskData) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 마스크 데이터를 반투명 빨강으로 오버레이
    const overlay = ctx.createImageData(width, height);
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i] > 128) {
        // 마스크된 영역: 반투명 빨강
        overlay.data[i] = 255;
        overlay.data[i + 1] = 50;
        overlay.data[i + 2] = 50;
        overlay.data[i + 3] = 100;
      }
    }

    ctx.putImageData(overlay, 0, 0);
  }, [width, height, maskData]);

  if (!maskData) return null;

  const scaledW = width * scale;
  const scaledH = height * scale;

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        imageRendering: "pixelated",
        width: scaledW,
        height: scaledH,
      }}
    />
  );
}
