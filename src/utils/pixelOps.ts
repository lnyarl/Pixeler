/** hex color (#rrggbb) -> [r, g, b, a] */
export function hexToRgba(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, 255];
}

/** 화면 좌표 → 픽셀 좌표 변환 */
export function screenToPixel(
  mouseX: number,
  mouseY: number,
  canvasRect: DOMRect,
  resolution: number,
  scale: number
): { x: number; y: number } | null {
  const localX = mouseX - canvasRect.left;
  const localY = mouseY - canvasRect.top;
  const x = Math.floor(localX / scale);
  const y = Math.floor(localY / scale);

  if (x < 0 || x >= resolution || y < 0 || y >= resolution) return null;
  return { x, y };
}

/** ImageData에 NxN 브러시로 픽셀 채우기 */
export function fillPixels(
  imageData: ImageData,
  cx: number,
  cy: number,
  brushSize: number,
  rgba: [number, number, number, number]
) {
  const half = Math.floor(brushSize / 2);
  const w = imageData.width;
  const h = imageData.height;
  const data = imageData.data;

  for (let dy = -half; dy < brushSize - half; dy++) {
    for (let dx = -half; dx < brushSize - half; dx++) {
      const px = cx + dx;
      const py = cy + dy;
      if (px < 0 || px >= w || py < 0 || py >= h) continue;
      const idx = (py * w + px) * 4;
      data[idx] = rgba[0];
      data[idx + 1] = rgba[1];
      data[idx + 2] = rgba[2];
      data[idx + 3] = rgba[3];
    }
  }
}
