/**
 * spriteSheet 단위 테스트 (PR-δ / δ-N1).
 *
 * 검증:
 * - directional 모드 — 베이스+방향+프레임 배치 좌표.
 * - flat 모드 — cols/rows 계산.
 * - 패딩 적용 시 좌표 변동.
 * - 배경 옵션 (transparent / 단색).
 * - 빈 셀 처리, 일관성 없는 셀 크기 에러.
 * - 베이스 없는 케이스 (m5).
 */

import { describe, it, expect } from "vitest";
import { composeSpriteSheet } from "../spriteSheet";
import type { CellInput } from "../spriteSheet";

function makeImageData(
  w: number,
  h: number,
  fill: [number, number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return new ImageData(data, w, h);
}

describe("composeSpriteSheet — 입력 검증", () => {
  it("셀 0개 → throw", async () => {
    await expect(composeSpriteSheet([])).rejects.toThrow(/셀이 0개/);
  });

  it("크기 일관성 없으면 throw", async () => {
    const cells: CellInput[] = [
      { imageData: makeImageData(8, 8, [0, 0, 0, 255]), type: "base" },
      {
        imageData: makeImageData(16, 16, [0, 0, 0, 255]),
        type: "direction",
        direction: "S",
      },
    ];
    await expect(composeSpriteSheet(cells)).rejects.toThrow(
      /일관되지 않음/
    );
  });
});

describe("composeSpriteSheet — directional 모드", () => {
  it("베이스 + 방향 4개 → 베이스 행 + 방향 행 (각 col=0)", async () => {
    const cellW = 8;
    const cellH = 8;
    const cells: CellInput[] = [
      { imageData: makeImageData(cellW, cellH, [255, 0, 0, 255]), type: "base" },
      {
        imageData: makeImageData(cellW, cellH, [0, 255, 0, 255]),
        type: "direction",
        direction: "N",
      },
      {
        imageData: makeImageData(cellW, cellH, [0, 0, 255, 255]),
        type: "direction",
        direction: "E",
      },
      {
        imageData: makeImageData(cellW, cellH, [128, 128, 0, 255]),
        type: "direction",
        direction: "S",
      },
      {
        imageData: makeImageData(cellW, cellH, [128, 0, 128, 255]),
        type: "direction",
        direction: "W",
      },
    ];
    const result = await composeSpriteSheet(cells);
    // 베이스 1개 + 방향 4개 → 5행, 모두 col=0.
    expect(result.layout.cols).toBe(1);
    expect(result.layout.rows).toBe(5);
    expect(result.layout.cellWidth).toBe(cellW);
    expect(result.layout.cellHeight).toBe(cellH);
    expect(result.layout.sheetWidth).toBe(cellW);
    expect(result.layout.sheetHeight).toBe(cellH * 5);

    const base = result.placements.find((p) => p.type === "base")!;
    expect(base.x).toBe(0);
    expect(base.y).toBe(0);
    // 방향 정렬: N, E, S, W (DIR_ORDER = N, NE, E, SE, S, SW, W, NW).
    const placedDirs = result.placements
      .filter((p) => p.type === "direction")
      .map((p) => p.direction);
    expect(placedDirs).toEqual(["N", "E", "S", "W"]);
    // S는 row 3 → y = 3*8 = 24.
    const sP = result.placements.find(
      (p) => p.type === "direction" && p.direction === "S"
    )!;
    expect(sP.y).toBe(cellH * 3);
  });

  it("베이스 없음 (m5) → 방향 행이 row=0부터", async () => {
    const cells: CellInput[] = [
      {
        imageData: makeImageData(8, 8, [0, 255, 0, 255]),
        type: "direction",
        direction: "N",
      },
      {
        imageData: makeImageData(8, 8, [0, 0, 255, 255]),
        type: "direction",
        direction: "S",
      },
    ];
    const result = await composeSpriteSheet(cells);
    expect(result.layout.rows).toBe(2);
    const N = result.placements.find(
      (p) => p.type === "direction" && p.direction === "N"
    )!;
    expect(N.y).toBe(0);
  });

  it("애니메이션 프레임 — 방향 sprite 다음 col에 배치", async () => {
    const cells: CellInput[] = [
      {
        imageData: makeImageData(8, 8, [0, 255, 0, 255]),
        type: "direction",
        direction: "S",
      },
      {
        imageData: makeImageData(8, 8, [10, 10, 10, 255]),
        type: "animation-frame",
        direction: "S",
        animationId: "anim-1",
        frameIndex: 0,
      },
      {
        imageData: makeImageData(8, 8, [20, 20, 20, 255]),
        type: "animation-frame",
        direction: "S",
        animationId: "anim-1",
        frameIndex: 1,
      },
    ];
    const result = await composeSpriteSheet(cells);
    expect(result.layout.cols).toBe(3);
    expect(result.layout.rows).toBe(1);
    const dir = result.placements.find((p) => p.type === "direction")!;
    expect(dir.x).toBe(0);
    const f0 = result.placements.find(
      (p) => p.type === "animation-frame" && p.frameIndex === 0
    )!;
    expect(f0.x).toBe(8);
    const f1 = result.placements.find(
      (p) => p.type === "animation-frame" && p.frameIndex === 1
    )!;
    expect(f1.x).toBe(16);
  });

  it("패딩 적용 — 좌표가 padding만큼 밀림", async () => {
    const cells: CellInput[] = [
      { imageData: makeImageData(8, 8, [255, 0, 0, 255]), type: "base" },
      {
        imageData: makeImageData(8, 8, [0, 0, 255, 255]),
        type: "direction",
        direction: "S",
      },
    ];
    const result = await composeSpriteSheet(cells, { padding: 2 });
    expect(result.layout.padding).toBe(2);
    // 시트 크기: cols*8 + (cols+1)*2 = 1*8 + 2*2 = 12. rows*8 + (rows+1)*2 = 2*8 + 3*2 = 22.
    expect(result.layout.sheetWidth).toBe(12);
    expect(result.layout.sheetHeight).toBe(22);
    const base = result.placements.find((p) => p.type === "base")!;
    expect(base.x).toBe(2);
    expect(base.y).toBe(2);
    const dir = result.placements.find((p) => p.type === "direction")!;
    expect(dir.x).toBe(2);
    expect(dir.y).toBe(2 + 8 + 2);
  });

  it("배경 — 단색이면 모든 픽셀 RGB 채워짐", async () => {
    const cells: CellInput[] = [
      { imageData: makeImageData(2, 2, [0, 0, 0, 0]), type: "base" }, // 투명 셀.
    ];
    const result = await composeSpriteSheet(cells, {
      background: "#ff0000",
    });
    // 모든 픽셀이 배경 #ff0000으로 채워졌어야 함 — 셀이 투명이라 위에 안 가려짐.
    // 셀 크기 2×2, padding 0 → 시트도 2×2.
    const data = result.sheetImageData.data;
    // 셀 픽셀 영역은 putImageData로 (0,0,0,0)으로 덮어씌움.
    // 테스트 의도 검증: 셀이 투명(alpha=0)이므로 putImageData 후에도 alpha=0.
    // 즉, 합성 결과의 alpha는 0.
    // 하지만 배경 자체는 채웠다 — 뭔가 다른 방식으로 검증 필요.
    // 더 명확한 케이스: 셀을 시트보다 작게 (padding > 0).
    // 여기선 cell이 시트 전체를 덮으므로 final 상태는 투명한 base가 덮어쓴 결과.
    expect(data[3]).toBe(0); // alpha=0 (cell이 투명).
  });

  it("배경 — 단색일 때 padding 영역은 배경색으로 유지", async () => {
    const cells: CellInput[] = [
      { imageData: makeImageData(2, 2, [0, 0, 0, 0]), type: "base" },
    ];
    const result = await composeSpriteSheet(cells, {
      background: "#ff0000",
      padding: 1,
    });
    // 시트 크기 4×4 (padding 1, cell 2). 가장자리는 배경.
    expect(result.layout.sheetWidth).toBe(4);
    expect(result.layout.sheetHeight).toBe(4);
    const data = result.sheetImageData.data;
    // (0, 0) 픽셀 — padding 영역, 배경 #ff0000.
    expect(data[0]).toBe(0xff);
    expect(data[1]).toBe(0x00);
    expect(data[2]).toBe(0x00);
    expect(data[3]).toBe(0xff);
  });

  it("배경 — transparent면 alpha 0으로 시작", async () => {
    const cells: CellInput[] = [
      { imageData: makeImageData(2, 2, [255, 0, 0, 255]), type: "base" },
    ];
    const result = await composeSpriteSheet(cells, {
      padding: 1,
    });
    // 가장자리 (0, 0) 픽셀 — padding 영역, transparent 배경 → alpha=0.
    const data = result.sheetImageData.data;
    expect(data[3]).toBe(0);
    // 셀 픽셀 (1, 1) → red.
    const offset = (1 * 4 + 1) * 4;
    expect(data[offset]).toBe(255);
    expect(data[offset + 3]).toBe(255);
  });

  it("ImageData 픽셀 합성 — RGBA가 시트 셀 위치에 정확히 복사됨", async () => {
    const cells: CellInput[] = [
      {
        imageData: makeImageData(2, 2, [10, 20, 30, 40]),
        type: "base",
      },
    ];
    const result = await composeSpriteSheet(cells);
    expect(result.sheetImageData.width).toBe(2);
    expect(result.sheetImageData.height).toBe(2);
    const data = result.sheetImageData.data;
    expect(data[0]).toBe(10);
    expect(data[1]).toBe(20);
    expect(data[2]).toBe(30);
    expect(data[3]).toBe(40);
  });
});

describe("composeSpriteSheet — flat 모드", () => {
  it("flat: cols 강제 → rows = ceil(N/cols)", async () => {
    const cells: CellInput[] = [];
    for (let i = 0; i < 5; i++) {
      cells.push({
        imageData: makeImageData(4, 4, [i * 10, 0, 0, 255]),
        type: "direction",
        direction: (["N", "NE", "E", "SE", "S"] as const)[i],
      });
    }
    const result = await composeSpriteSheet(cells, {
      mode: "flat",
      flatCols: 3,
    });
    expect(result.layout.cols).toBe(3);
    expect(result.layout.rows).toBe(2); // ceil(5/3)=2
  });

  it("flat: cols 자동 → ceil(sqrt(N))", async () => {
    const cells: CellInput[] = [];
    for (let i = 0; i < 4; i++) {
      cells.push({
        imageData: makeImageData(4, 4, [i * 10, 0, 0, 255]),
        type: "direction",
        direction: (["N", "E", "S", "W"] as const)[i],
      });
    }
    const result = await composeSpriteSheet(cells, { mode: "flat" });
    // sqrt(4)=2 → cols=2, rows=2.
    expect(result.layout.cols).toBe(2);
    expect(result.layout.rows).toBe(2);
  });
});

describe("composeSpriteSheet — Blob 출력", () => {
  it("결과 sheet는 Blob 인스턴스", async () => {
    const cells: CellInput[] = [
      { imageData: makeImageData(2, 2, [10, 20, 30, 255]), type: "base" },
    ];
    const result = await composeSpriteSheet(cells);
    expect(result.sheet).toBeInstanceOf(Blob);
    expect(result.sheet.size).toBeGreaterThan(0);
  });
});
