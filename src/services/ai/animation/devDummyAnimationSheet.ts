/**
 * DEV 더미 애니메이션 시트 (§5.3.5.1 / M4) — AI 호출 없이 directionSprite 기반 더미 N프레임 시트 합성.
 *
 * - 1024×1024 캔버스에 directionSprite를 nearest-neighbor 업스케일하여 각 프레임 셀에 배치.
 * - 프레임마다 hue 회전 (+30° 누적)으로 시각적 식별.
 * - 셀 좌상단에 "F1", "F2", ... 라벨 텍스트.
 *
 * jsdom 환경(unit test)에서는 canvas.getContext('2d')가 미구현 — fallback 빈 ImageData 반환.
 */
import { frameCountToGrid } from "@/services/ai/promptBuilder/animation";

const SHEET_SIZE = 1024;

/** 방향 sprite를 N개 프레임으로 복제하여 1024 시트에 배치 (각 프레임 hue 회전 + 라벨). */
export function buildDevAnimationSheet(
  directionSprite: ImageData,
  frameCount: number
): ImageData {
  const { cols, rows } = frameCountToGrid(frameCount);

  const canvas = document.createElement("canvas");
  canvas.width = SHEET_SIZE;
  canvas.height = SHEET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new ImageData(SHEET_SIZE, SHEET_SIZE);
  }

  ctx.clearRect(0, 0, SHEET_SIZE, SHEET_SIZE);

  const baseW = Math.floor(SHEET_SIZE / cols);
  const baseH = Math.floor(SHEET_SIZE / rows);

  let frameIdx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (frameIdx >= frameCount) break;
      const cellW = c === cols - 1 ? SHEET_SIZE - baseW * (cols - 1) : baseW;
      const cellH = r === rows - 1 ? SHEET_SIZE - baseH * (rows - 1) : baseH;
      const cellX = c === cols - 1 ? SHEET_SIZE - cellW : baseW * c;
      const cellY = r === rows - 1 ? SHEET_SIZE - cellH : baseH * r;

      drawScaledImageWithHue(
        ctx,
        directionSprite,
        cellX,
        cellY,
        cellW,
        cellH,
        frameIdx * 30
      );

      // 프레임 라벨.
      ctx.fillStyle = "#000";
      ctx.fillRect(cellX + 4, cellY + 4, 40, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "14px monospace";
      ctx.fillText(`F${frameIdx + 1}`, cellX + 8, cellY + 18);

      frameIdx++;
    }
  }

  return ctx.getImageData(0, 0, SHEET_SIZE, SHEET_SIZE);
}

/** 단일 프레임 DEV 더미 — directionSprite를 nearest-neighbor 1024로 업스케일, frameIdx에 따른 hue. */
export function buildDevSingleAnimationFrame(
  directionSprite: ImageData,
  frameIdx: number
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET_SIZE;
  canvas.height = SHEET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new ImageData(SHEET_SIZE, SHEET_SIZE);
  ctx.clearRect(0, 0, SHEET_SIZE, SHEET_SIZE);
  drawScaledImageWithHue(
    ctx,
    directionSprite,
    0,
    0,
    SHEET_SIZE,
    SHEET_SIZE,
    frameIdx * 30
  );
  ctx.fillStyle = "#000";
  ctx.fillRect(8, 8, 96, 24);
  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText(`F${frameIdx + 1} REGEN`, 12, 26);
  return ctx.getImageData(0, 0, SHEET_SIZE, SHEET_SIZE);
}

function drawScaledImageWithHue(
  ctx: CanvasRenderingContext2D,
  src: ImageData,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  hueShift: number
): void {
  const tmp = document.createElement("canvas");
  tmp.width = src.width;
  tmp.height = src.height;
  const tmpCtx = tmp.getContext("2d");
  if (!tmpCtx) return;
  tmpCtx.putImageData(src, 0, 0);

  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  if (hueShift) {
    try {
      ctx.filter = `hue-rotate(${hueShift}deg)`;
    } catch {
      /* ignore */
    }
  }
  ctx.drawImage(tmp, 0, 0, src.width, src.height, dx, dy, dw, dh);
  ctx.restore();
  ctx.imageSmoothingEnabled = prevSmoothing;
}
