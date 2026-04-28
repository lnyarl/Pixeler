/**
 * DEV 더미 시트 생성 (M4) — AI 호출 없이 베이스 sprite 기반 더미 시트 합성.
 *
 * - 1024×1024 캔버스에 baseSprite를 nearest-neighbor 업스케일하여 각 셀에 배치.
 * - 셀별로 hue 회전을 살짝 적용하여 시각적 식별 가능 (방향 구분).
 * - 셀 좌상단에 방향 라벨 (N/E/S/W 등) 텍스트 그리기.
 *
 * jsdom 환경(unit test)에서는 canvas.getContext('2d')가 미구현 — 단위 테스트
 * 의존성이 있으면 fallback 빈 ImageData 반환. 실제 브라우저 e2e에서는 정상 동작.
 */
import type { DirKey, DirectionMode } from "@/services/persistence/types";
import { getDirectionLayout, getGridSize } from "./directionLayout";

const SHEET_SIZE = 1024;

/** 베이스 sprite (작은 ImageData)를 1024 시트의 각 셀에 nearest-neighbor 업스케일하여 합성. */
export function buildDevDirectionSheet(
  baseSprite: ImageData,
  mode: DirectionMode
): ImageData {
  const { cols, rows } = getGridSize(mode);
  const layout = getDirectionLayout(mode);

  // 출력 캔버스 (CanvasRenderingContext2D 사용 가능 시).
  const canvas = document.createElement("canvas");
  canvas.width = SHEET_SIZE;
  canvas.height = SHEET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // jsdom fallback — 빈 ImageData 반환.
    return new ImageData(SHEET_SIZE, SHEET_SIZE);
  }

  // 투명 초기화.
  ctx.clearRect(0, 0, SHEET_SIZE, SHEET_SIZE);

  const baseW = Math.floor(SHEET_SIZE / cols);
  const baseH = Math.floor(SHEET_SIZE / rows);

  // 각 방향 셀에 베이스를 업스케일하여 배치.
  for (const { direction, col, row } of layout) {
    const cellW = col === cols - 1 ? SHEET_SIZE - baseW * (cols - 1) : baseW;
    const cellH = row === rows - 1 ? SHEET_SIZE - baseH * (rows - 1) : baseH;
    const cellX = col === cols - 1 ? SHEET_SIZE - cellW : baseW * col;
    const cellY = row === rows - 1 ? SHEET_SIZE - cellH : baseH * row;

    drawScaledImageWithHue(
      ctx,
      baseSprite,
      cellX,
      cellY,
      cellW,
      cellH,
      hueShiftForDirection(direction)
    );

    // 라벨.
    ctx.fillStyle = "#000";
    ctx.fillRect(cellX + 4, cellY + 4, 32, 16);
    ctx.fillStyle = "#fff";
    ctx.font = "12px monospace";
    ctx.fillText(direction, cellX + 8, cellY + 16);
  }

  return ctx.getImageData(0, 0, SHEET_SIZE, SHEET_SIZE);
}

/** 방향별 hue 회전량 (시각 식별용). */
function hueShiftForDirection(dir: DirKey): number {
  const map: Record<DirKey, number> = {
    N: 0,
    NE: 30,
    E: 60,
    SE: 90,
    S: 120,
    SW: 150,
    W: 180,
    NW: 210,
  };
  return map[dir];
}

/** ImageData를 nearest-neighbor 스케일 + hue 회전 후 ctx에 그리기. */
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
    // CanvasRenderingContext2D filter 미지원 환경(jsdom)에서 안전하게 fallback.
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

/** 단일 셀 DEV 더미 — 베이스 sprite를 nearest-neighbor 1024로 업스케일, hue 약간 변형. */
export function buildDevSingleDirectionSheet(
  baseSprite: ImageData,
  direction: DirKey
): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET_SIZE;
  canvas.height = SHEET_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new ImageData(SHEET_SIZE, SHEET_SIZE);
  ctx.clearRect(0, 0, SHEET_SIZE, SHEET_SIZE);
  drawScaledImageWithHue(
    ctx,
    baseSprite,
    0,
    0,
    SHEET_SIZE,
    SHEET_SIZE,
    hueShiftForDirection(direction)
  );
  ctx.fillStyle = "#000";
  ctx.fillRect(8, 8, 64, 24);
  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText(`${direction} REGEN`, 12, 26);
  return ctx.getImageData(0, 0, SHEET_SIZE, SHEET_SIZE);
}
