/**
 * spriteSheet.ts — export 페이즈의 시트 합성 (PR-δ / §5.4).
 *
 * 프로젝트의 모든 sprite (베이스, 방향, 애니메이션 프레임)를 단일 PNG 시트로 합성한다.
 *
 * 레이아웃:
 * - "directional": 행=방향, 열=프레임 (방향마다 한 행, 베이스/방향 셀은 0번 열).
 *   행 0: 베이스 (있으면, col=0). 베이스 없으면 0행이 없고 방향 행이 row=0부터 시작.
 *   행 1+: 방향 — col=0이 방향 sprite, col=1+가 해당 방향의 애니메이션 프레임.
 * - "flat": 평면 나열 — 베이스 → 방향 → 애니메이션 프레임 순서로 cols당 채움.
 *
 * 옵션:
 * - cellPadding: 셀 사이의 픽셀 패딩 (0~4).
 * - background: "transparent" | "#rrggbb" — 시트 배경색.
 *
 * 출력:
 * - sheet: PNG Blob (image/png) — 가능하면 PNG, 테스트 환경(jsdom)에서는 raw RGBA 폴백.
 * - layout: 시트 메타 (cellWidth/cellHeight/cols/rows/padding/background/sheetWidth/sheetHeight).
 * - placements: 각 셀의 (x, y, type, direction?, animationId?, frameIndex?).
 *
 * 합성 전략:
 * - 1차: ImageData를 Uint8ClampedArray 픽셀 버퍼에 직접 합성 (jsdom 호환, putImageData 의존 X).
 * - 2차: 합성된 ImageData를 canvas.toBlob("image/png")로 Blob 변환. 실패 시 raw 폴백 (테스트 환경).
 *
 * Tauri 호환: document.createElement("canvas") 기반.
 */

import type { DirKey } from "@/services/persistence/types";

export type ExportLayoutMode = "directional" | "flat";
export type ExportBackground = "transparent" | string; // "#rrggbb"

export interface ExportLayout {
  cellWidth: number;
  cellHeight: number;
  cols: number;
  rows: number;
  padding: number;
  background: ExportBackground;
  sheetWidth: number;
  sheetHeight: number;
}

export interface CellPlacement {
  /** 시트에서의 픽셀 좌표 (좌상단). 패딩 포함 위치. */
  x: number;
  y: number;
  type: "base" | "direction" | "animation-frame";
  direction?: DirKey;
  animationId?: string;
  frameIndex?: number;
}

export interface CellInput {
  imageData: ImageData;
  type: "base" | "direction" | "animation-frame";
  direction?: DirKey;
  animationId?: string;
  frameIndex?: number;
}

export interface ComposeOptions {
  /** 시트 합성 모드. 기본: "directional". */
  mode?: ExportLayoutMode;
  /** 셀 사이 패딩 (px). 기본: 0. */
  padding?: number;
  /** 배경. 기본: "transparent". */
  background?: ExportBackground;
  /** flat 모드의 cols 강제 (없으면 ceil(sqrt(N))). */
  flatCols?: number;
}

export interface ComposeResult {
  sheet: Blob;
  /** 시트의 합성된 픽셀 데이터 (UI 미리보기에 활용 가능). */
  sheetImageData: ImageData;
  layout: ExportLayout;
  placements: CellPlacement[];
}

const DIR_ORDER: DirKey[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/**
 * directional 모드 셀 배치 — 행/열 인덱스 결정.
 *
 * 베이스 1개, 방향 N개, 애니메이션 프레임 K개를 받아서:
 * - 베이스 행 1개 (있으면 row 0).
 * - 방향당 한 행 — col 0 = 방향 sprite, col 1+ = 애니메이션 프레임 (animationId 순, frameIndex 순).
 * - cols = 최대 col + 1.
 */
function planDirectional(cells: CellInput[]): {
  placements: Omit<CellPlacement, "x" | "y">[];
  rowAssignments: number[];
  colAssignments: number[];
  rows: number;
  cols: number;
} {
  const base = cells.filter((c) => c.type === "base");
  const directionCells = cells.filter((c) => c.type === "direction");
  const frameCells = cells.filter((c) => c.type === "animation-frame");

  const allDirsSet = new Set<DirKey>();
  for (const c of directionCells) {
    if (c.direction) allDirsSet.add(c.direction);
  }
  for (const c of frameCells) {
    if (c.direction) allDirsSet.add(c.direction);
  }
  const dirsSorted = DIR_ORDER.filter((d) => allDirsSet.has(d));

  const placements: Omit<CellPlacement, "x" | "y">[] = [];
  const rowAssignments: number[] = [];
  const colAssignments: number[] = [];

  let row = 0;
  let maxCol = 0;

  if (base.length > 0) {
    placements.push({ type: "base" });
    rowAssignments.push(row);
    colAssignments.push(0);
    maxCol = Math.max(maxCol, 0);
    row += 1;
  }

  for (const dir of dirsSorted) {
    let col = 0;
    const dirSprite = directionCells.find((c) => c.direction === dir);
    if (dirSprite) {
      placements.push({ type: "direction", direction: dir });
      rowAssignments.push(row);
      colAssignments.push(col);
      maxCol = Math.max(maxCol, col);
      col += 1;
    } else {
      // 방향 sprite 없으면 col 0 비워둠 — 시각적 일관성을 위해 col 1부터 프레임 배치.
      col = 1;
    }

    const dirFrames = frameCells.filter((c) => c.direction === dir);
    const animIds = Array.from(
      new Set(dirFrames.map((f) => f.animationId ?? ""))
    ).sort();
    for (const animId of animIds) {
      const groupFrames = dirFrames
        .filter((f) => (f.animationId ?? "") === animId)
        .sort((a, b) => (a.frameIndex ?? 0) - (b.frameIndex ?? 0));
      for (const f of groupFrames) {
        placements.push({
          type: "animation-frame",
          direction: dir,
          animationId: f.animationId,
          frameIndex: f.frameIndex,
        });
        rowAssignments.push(row);
        colAssignments.push(col);
        maxCol = Math.max(maxCol, col);
        col += 1;
      }
    }

    row += 1;
  }

  const cols = placements.length === 0 ? 0 : maxCol + 1;
  const rows = row;
  return { placements, rowAssignments, colAssignments, rows, cols };
}

/** flat 모드 — cols 단위로 좌→우, 상→하 채움. */
function planFlat(
  cells: CellInput[],
  flatCols?: number
): {
  placements: Omit<CellPlacement, "x" | "y">[];
  rowAssignments: number[];
  colAssignments: number[];
  rows: number;
  cols: number;
} {
  const dirRank = (d?: DirKey): number => (d ? DIR_ORDER.indexOf(d) : -1);
  const sorted = [...cells].sort((a, b) => {
    const typeRank: Record<CellInput["type"], number> = {
      base: 0,
      direction: 1,
      "animation-frame": 2,
    };
    if (typeRank[a.type] !== typeRank[b.type]) {
      return typeRank[a.type] - typeRank[b.type];
    }
    if (a.type === "direction" || a.type === "animation-frame") {
      const aDir = dirRank(a.direction);
      const bDir = dirRank(b.direction);
      if (aDir !== bDir) return aDir - bDir;
    }
    if (a.type === "animation-frame") {
      const aId = a.animationId ?? "";
      const bId = b.animationId ?? "";
      if (aId !== bId) return aId < bId ? -1 : 1;
      return (a.frameIndex ?? 0) - (b.frameIndex ?? 0);
    }
    return 0;
  });

  const N = sorted.length;
  const cols =
    flatCols && flatCols > 0
      ? flatCols
      : Math.max(1, Math.ceil(Math.sqrt(N)));
  const rows = N === 0 ? 0 : Math.ceil(N / cols);

  const placements: Omit<CellPlacement, "x" | "y">[] = [];
  const rowAssignments: number[] = [];
  const colAssignments: number[] = [];
  for (let i = 0; i < N; i++) {
    const c = sorted[i];
    placements.push({
      type: c.type,
      direction: c.direction,
      animationId: c.animationId,
      frameIndex: c.frameIndex,
    });
    rowAssignments.push(Math.floor(i / cols));
    colAssignments.push(i % cols);
  }
  return { placements, rowAssignments, colAssignments, rows, cols };
}

/** "#rrggbb" → [r, g, b]. 잘못된 포맷이면 [0, 0, 0]. */
function parseHexColor(hex: string): [number, number, number] {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

/** 시트 ImageData를 픽셀 버퍼 합성으로 생성. canvas 의존 없음 (jsdom 호환). */
function compositePixels(
  cells: CellInput[],
  plan: {
    placements: Omit<CellPlacement, "x" | "y">[];
    rowAssignments: number[];
    colAssignments: number[];
    rows: number;
    cols: number;
  },
  cellWidth: number,
  cellHeight: number,
  padding: number,
  background: ExportBackground
): { sheetImageData: ImageData; placements: CellPlacement[] } {
  const sheetWidth = plan.cols * cellWidth + (plan.cols + 1) * padding;
  const sheetHeight = plan.rows * cellHeight + (plan.rows + 1) * padding;
  const buf = new Uint8ClampedArray(sheetWidth * sheetHeight * 4);

  // 배경 채우기.
  if (background !== "transparent") {
    const [r, g, b] = parseHexColor(background);
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = 255;
    }
  }

  const placements: CellPlacement[] = [];
  for (let i = 0; i < plan.placements.length; i++) {
    const p = plan.placements[i];
    const row = plan.rowAssignments[i];
    const col = plan.colAssignments[i];
    const x = padding + col * (cellWidth + padding);
    const y = padding + row * (cellHeight + padding);
    const matched = cells.find((c) => sameKey(c, p));
    if (!matched) {
      throw new Error(
        `composeSpriteSheet: cell 매칭 실패 (type=${p.type}, dir=${p.direction ?? ""}, anim=${p.animationId ?? ""}, frame=${p.frameIndex ?? ""})`
      );
    }
    // putImageData 등가: src를 dst의 (x,y) 기준에 단순 복사 (덮어쓰기, alpha 보존).
    const src = matched.imageData;
    for (let ry = 0; ry < cellHeight; ry++) {
      const srcRow = ry * cellWidth * 4;
      const dstRow = ((y + ry) * sheetWidth + x) * 4;
      // 알파 합성이 아닌 단순 복사 (putImageData와 동일 — alpha 그대로 기록).
      buf.set(src.data.subarray(srcRow, srcRow + cellWidth * 4), dstRow);
    }
    placements.push({
      x,
      y,
      type: p.type,
      direction: p.direction,
      animationId: p.animationId,
      frameIndex: p.frameIndex,
    });
  }

  const sheetImageData = new ImageData(buf, sheetWidth, sheetHeight);
  return { sheetImageData, placements };
}

/** ImageData → PNG Blob. canvas 사용. 실패 시 raw 폴백. */
async function imageDataToPngBlob(img: ImageData): Promise<Blob> {
  // 1) DOM canvas 시도.
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx && typeof canvas.toBlob === "function") {
        ctx.putImageData(img, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (blob) return blob;
      }
    } catch {
      /* fall through */
    }
  }

  // 2) Fallback — raw RGBA Blob (테스트 환경 호환).
  return new Blob([img.data.buffer as ArrayBuffer], {
    type: "application/octet-stream",
  });
}

/**
 * cells 배열을 받아 단일 PNG 시트로 합성.
 *
 * @param cells — 베이스 sprite, 방향 sprite, 애니메이션 프레임을 섞어서 전달.
 * @param opts — 합성 옵션.
 * @returns sheet (Blob), sheetImageData, layout, placements.
 *
 * @throws 셀이 0개이거나, ImageData 크기가 일관되지 않으면 Error.
 */
export async function composeSpriteSheet(
  cells: CellInput[],
  opts: ComposeOptions = {}
): Promise<ComposeResult> {
  if (cells.length === 0) {
    throw new Error("composeSpriteSheet: 셀이 0개입니다");
  }

  const cellWidth = cells[0].imageData.width;
  const cellHeight = cells[0].imageData.height;
  for (const c of cells) {
    if (
      c.imageData.width !== cellWidth ||
      c.imageData.height !== cellHeight
    ) {
      throw new Error(
        `composeSpriteSheet: 셀 크기가 일관되지 않음 (기대 ${cellWidth}×${cellHeight}, 발견 ${c.imageData.width}×${c.imageData.height})`
      );
    }
  }

  const mode: ExportLayoutMode = opts.mode ?? "directional";
  const padding = Math.max(0, Math.floor(opts.padding ?? 0));
  const background = opts.background ?? "transparent";

  const plan =
    mode === "flat" ? planFlat(cells, opts.flatCols) : planDirectional(cells);

  if (plan.rows === 0 || plan.cols === 0) {
    throw new Error("composeSpriteSheet: 배치할 셀이 없습니다");
  }

  const { sheetImageData, placements } = compositePixels(
    cells,
    plan,
    cellWidth,
    cellHeight,
    padding,
    background
  );

  const sheet = await imageDataToPngBlob(sheetImageData);

  const layout: ExportLayout = {
    cellWidth,
    cellHeight,
    cols: plan.cols,
    rows: plan.rows,
    padding,
    background,
    sheetWidth: sheetImageData.width,
    sheetHeight: sheetImageData.height,
  };

  return { sheet, sheetImageData, layout, placements };
}

function sameKey(
  a: CellInput,
  b: Omit<CellPlacement, "x" | "y">
): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "base") return true;
  if (a.direction !== b.direction) return false;
  if (a.type === "direction") return true;
  return a.animationId === b.animationId && a.frameIndex === b.frameIndex;
}
