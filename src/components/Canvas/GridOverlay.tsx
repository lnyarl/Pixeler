import { useRef, useEffect } from "react";

const MAX_CANVAS_SIZE = 2048;

interface GridOverlayProps {
  width: number;
  height: number;
  scale: number;
  visible: boolean;
}

export default function GridOverlay({
  width,
  height,
  scale,
  visible,
}: GridOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scaledW = Math.min(width * scale, MAX_CANVAS_SIZE);
    const scaledH = Math.min(height * scale, MAX_CANVAS_SIZE);
    canvas.width = scaledW;
    canvas.height = scaledH;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, scaledW, scaledH);

    if (!visible || scale < 4) return;

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;

    const cellW = scaledW / width;
    const cellH = scaledH / height;

    for (let x = 0; x <= width; x++) {
      const px = Math.round(x * cellW) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, scaledH);
      ctx.stroke();
    }

    for (let y = 0; y <= height; y++) {
      const py = Math.round(y * cellH) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(scaledW, py);
      ctx.stroke();
    }
  }, [width, height, scale, visible]);

  const scaledW = Math.min(width * scale, MAX_CANVAS_SIZE);
  const scaledH = Math.min(height * scale, MAX_CANVAS_SIZE);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width: width * scale, height: height * scale }}
      width={scaledW}
      height={scaledH}
    />
  );
}
