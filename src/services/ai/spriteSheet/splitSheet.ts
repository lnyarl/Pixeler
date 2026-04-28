/**
 * splitSpriteSheet — 시트 ImageData를 cols × rows로 분할 (§5.2.5 / m3).
 *
 * - 잔여 픽셀 흡수: cellW = floor(W/cols), 마지막 열은 W - cellW*(cols-1).
 *   같은 식 height에도 적용. 이렇게 해야 1024÷3=341.33 케이스에서
 *   col0=341, col1=341, col2=342이 되어 픽셀 손실 없음.
 * - skipCells에 해당하는 셀은 결과 배열에서 제외 (8방향 mid-center).
 * - 출력 순서: row 0부터 col 0..cols-1, 다음 row...
 */

export interface SplitSheetOptions {
  /** 결과에서 제외할 셀 좌표 (예: 8방향 mid-center = {col:1,row:1}) */
  skipCells?: ReadonlyArray<{ col: number; row: number }>;
}

export function splitSpriteSheet(
  image: ImageData,
  cols: number,
  rows: number,
  options: SplitSheetOptions = {}
): ImageData[] {
  if (cols <= 0 || rows <= 0) {
    throw new Error(`splitSpriteSheet: cols/rows는 양수여야 합니다 (got ${cols}, ${rows}).`);
  }
  const { skipCells = [] } = options;

  const W = image.width;
  const H = image.height;
  const baseW = Math.floor(W / cols);
  const baseH = Math.floor(H / rows);

  // 셀 폭/높이 배열 (마지막 열/행은 잔여 흡수).
  const widths: number[] = [];
  for (let c = 0; c < cols; c++) {
    widths.push(c === cols - 1 ? W - baseW * (cols - 1) : baseW);
  }
  const heights: number[] = [];
  for (let r = 0; r < rows; r++) {
    heights.push(r === rows - 1 ? H - baseH * (rows - 1) : baseH);
  }

  // 셀의 시작 x/y 좌표.
  const xStarts: number[] = [];
  let cumX = 0;
  for (let c = 0; c < cols; c++) {
    xStarts.push(cumX);
    cumX += widths[c];
  }
  const yStarts: number[] = [];
  let cumY = 0;
  for (let r = 0; r < rows; r++) {
    yStarts.push(cumY);
    cumY += heights[r];
  }

  const skipKeys = new Set(skipCells.map((c) => `${c.col},${c.row}`));
  const result: ImageData[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (skipKeys.has(`${c},${r}`)) continue;
      const x0 = xStarts[c];
      const y0 = yStarts[r];
      const w = widths[c];
      const h = heights[r];
      result.push(extractRegion(image, x0, y0, w, h));
    }
  }

  return result;
}

/** 입력 ImageData의 특정 영역을 새 ImageData로 복사. */
function extractRegion(
  src: ImageData,
  x0: number,
  y0: number,
  w: number,
  h: number
): ImageData {
  const out = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    const srcRow = (y0 + y) * src.width + x0;
    const dstRow = y * w;
    for (let x = 0; x < w; x++) {
      const si = (srcRow + x) * 4;
      const di = (dstRow + x) * 4;
      out.data[di] = src.data[si];
      out.data[di + 1] = src.data[si + 1];
      out.data[di + 2] = src.data[si + 2];
      out.data[di + 3] = src.data[si + 3];
    }
  }
  return out;
}
