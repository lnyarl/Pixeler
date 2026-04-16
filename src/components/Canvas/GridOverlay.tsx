import { useRef, useEffect } from "react";

interface GridOverlayProps {
  resolution: number;
  scale: number;
  visible: boolean;
}

export default function GridOverlay({
  resolution,
  scale,
  visible,
}: GridOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scaledSize = resolution * scale;
    canvas.width = scaledSize;
    canvas.height = scaledSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, scaledSize, scaledSize);

    if (!visible || scale < 4) return; // 줌이 작으면 그리드 안 보여줌

    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;

    const cellSize = scale;

    for (let x = 0; x <= resolution; x++) {
      const px = Math.round(x * cellSize) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, scaledSize);
      ctx.stroke();
    }

    for (let y = 0; y <= resolution; y++) {
      const py = Math.round(y * cellSize) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(scaledSize, py);
      ctx.stroke();
    }
  }, [resolution, scale, visible]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 pointer-events-none"
      style={{
        width: resolution * scale,
        height: resolution * scale,
      }}
    />
  );
}
