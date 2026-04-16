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
  width: number,
  height: number,
  scale: number
): { x: number; y: number } | null {
  const localX = mouseX - canvasRect.left;
  const localY = mouseY - canvasRect.top;
  const x = Math.floor(localX / scale);
  const y = Math.floor(localY / scale);

  if (x < 0 || x >= width || y < 0 || y >= height) return null;
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

/** 이미지 전체를 (dx, dy)만큼 이동. 빈 영역은 투명. */
export function shiftImageData(
  src: ImageData,
  dx: number,
  dy: number
): ImageData {
  const w = src.width;
  const h = src.height;
  const dst = new ImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcX = x - dx;
      const srcY = y - dy;
      if (srcX < 0 || srcX >= w || srcY < 0 || srcY >= h) continue;
      const srcIdx = (srcY * w + srcX) * 4;
      const dstIdx = (y * w + x) * 4;
      dst.data[dstIdx] = src.data[srcIdx];
      dst.data[dstIdx + 1] = src.data[srcIdx + 1];
      dst.data[dstIdx + 2] = src.data[srcIdx + 2];
      dst.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }

  return dst;
}

/** Bresenham 라인: 두 점 사이를 채움 (빠른 드래그 시 점 누락 방지) */
export function drawLine(
  imageData: ImageData,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  brushSize: number,
  rgba: [number, number, number, number]
) {
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0;
  let cy = y0;

  while (true) {
    fillPixels(imageData, cx, cy, brushSize, rgba);

    if (cx === x1 && cy === y1) break;

    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
  }
}
