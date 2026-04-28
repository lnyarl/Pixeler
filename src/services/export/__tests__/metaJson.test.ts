/**
 * metaJson 단위 테스트 (PR-δ / δ-N2 / m5).
 *
 * 검증:
 * - 베이스만 → base = { x, y }, directions = {}, animations = [].
 * - 베이스 없음 → base: null, directions only (m5).
 * - 부분 방향 (4방향 중 2개만) → 채워진 방향만 directions key에 포함 (m5).
 * - 애니메이션 포함 → animations[].frames와 placement 좌표 일관성.
 * - duration_ms = 1000 / fps 반올림.
 */

import { describe, it, expect } from "vitest";
import { buildExportMeta, serializeExportMeta } from "../metaJson";
import { composeSpriteSheet } from "../spriteSheet";
import type { CellInput } from "../spriteSheet";
import type {
  ProjectMeta,
  DirectionsPhaseState,
  AnimationsPhaseState,
  AnimationClip,
} from "@/services/persistence/types";

function makeImageData(w: number, h: number): ImageData {
  return new ImageData(new Uint8ClampedArray(w * h * 4), w, h);
}

function makeMeta(name = "Hero"): ProjectMeta {
  return {
    id: "p1",
    name,
    width: 32,
    height: 32,
    createdAt: 0,
    updatedAt: 0,
    lastPhase: "export",
    directionMode: 4,
    thumbnailBase64: null,
  };
}

describe("buildExportMeta — m5 케이스", () => {
  it("베이스만 → base = { x, y }, directions = {}, animations = []", async () => {
    const cells: CellInput[] = [
      { imageData: makeImageData(8, 8), type: "base" },
    ];
    const result = await composeSpriteSheet(cells);
    const directionsPhase: DirectionsPhaseState = {
      mode: 4,
      sprites: {},
    };
    const animationsPhase: AnimationsPhaseState = { byDirection: {} };
    const meta = buildExportMeta({
      meta: makeMeta(),
      directionsPhase,
      animationsPhase,
      layout: result.layout,
      placements: result.placements,
    });
    expect(meta.version).toBe(1);
    expect(meta.base).toEqual({ x: 0, y: 0 });
    expect(meta.directions).toEqual({});
    expect(meta.animations).toEqual([]);
  });

  it("베이스 없음 (m5) → base: null, directions only", async () => {
    const cells: CellInput[] = [
      {
        imageData: makeImageData(8, 8),
        type: "direction",
        direction: "N",
      },
      {
        imageData: makeImageData(8, 8),
        type: "direction",
        direction: "S",
      },
    ];
    const result = await composeSpriteSheet(cells);
    const meta = buildExportMeta({
      meta: makeMeta(),
      directionsPhase: { mode: 4, sprites: {} },
      animationsPhase: { byDirection: {} },
      layout: result.layout,
      placements: result.placements,
    });
    expect(meta.base).toBeNull();
    expect(Object.keys(meta.directions)).toEqual(
      expect.arrayContaining(["N", "S"])
    );
    expect(meta.directions.N).toBeDefined();
    expect(meta.directions.S).toBeDefined();
  });

  it("부분 방향 (4방향 중 2개만, m5) → 채워진 방향만 key", async () => {
    const cells: CellInput[] = [
      {
        imageData: makeImageData(8, 8),
        type: "direction",
        direction: "N",
      },
      {
        imageData: makeImageData(8, 8),
        type: "direction",
        direction: "E",
      },
    ];
    const result = await composeSpriteSheet(cells);
    const meta = buildExportMeta({
      meta: makeMeta(),
      directionsPhase: { mode: 4, sprites: {} },
      animationsPhase: { byDirection: {} },
      layout: result.layout,
      placements: result.placements,
    });
    expect(Object.keys(meta.directions).sort()).toEqual(["E", "N"]);
    // 빈 방향(S, W)은 key 없음.
    expect(meta.directions.S).toBeUndefined();
    expect(meta.directions.W).toBeUndefined();
  });
});

describe("buildExportMeta — 애니메이션 포함", () => {
  it("애니메이션 frames의 좌표가 placement와 일치, duration_ms = round(1000/fps)", async () => {
    const cells: CellInput[] = [
      {
        imageData: makeImageData(8, 8),
        type: "direction",
        direction: "S",
      },
      {
        imageData: makeImageData(8, 8),
        type: "animation-frame",
        direction: "S",
        animationId: "clip-1",
        frameIndex: 0,
      },
      {
        imageData: makeImageData(8, 8),
        type: "animation-frame",
        direction: "S",
        animationId: "clip-1",
        frameIndex: 1,
      },
    ];
    const result = await composeSpriteSheet(cells);
    const clip: AnimationClip = {
      id: "clip-1",
      name: "walk",
      presetKey: "walk",
      descriptor: "walk cycle",
      fps: 12,
      frames: [
        { imageData: makeImageData(8, 8), palette: [] },
        { imageData: makeImageData(8, 8), palette: [] },
      ],
    };
    const animationsPhase: AnimationsPhaseState = {
      byDirection: { S: { animations: [clip] } },
    };
    const meta = buildExportMeta({
      meta: makeMeta(),
      directionsPhase: { mode: 4, sprites: {} },
      animationsPhase,
      layout: result.layout,
      placements: result.placements,
    });
    expect(meta.animations.length).toBe(1);
    const anim = meta.animations[0];
    expect(anim.name).toBe("walk");
    expect(anim.preset).toBe("walk");
    expect(anim.direction).toBe("S");
    expect(anim.fps).toBe(12);
    expect(anim.frames.length).toBe(2);
    // duration_ms = round(1000/12) = 83.
    expect(anim.frames[0].duration_ms).toBe(83);
    expect(anim.frames[1].duration_ms).toBe(83);
    // 좌표 일관성: placement의 (x, y)와 일치.
    const frame0Placement = result.placements.find(
      (p) => p.type === "animation-frame" && p.frameIndex === 0
    )!;
    expect(anim.frames[0].x).toBe(frame0Placement.x);
    expect(anim.frames[0].y).toBe(frame0Placement.y);
  });

  it("preset이 null인 custom 클립도 직렬화", async () => {
    const cells: CellInput[] = [
      {
        imageData: makeImageData(8, 8),
        type: "animation-frame",
        direction: "N",
        animationId: "c2",
        frameIndex: 0,
      },
    ];
    const result = await composeSpriteSheet(cells);
    const clip: AnimationClip = {
      id: "c2",
      name: "custom",
      presetKey: null,
      descriptor: "wave",
      fps: 8,
      frames: [{ imageData: makeImageData(8, 8), palette: [] }],
    };
    const meta = buildExportMeta({
      meta: makeMeta(),
      directionsPhase: { mode: 4, sprites: {} },
      animationsPhase: {
        byDirection: { N: { animations: [clip] } },
      },
      layout: result.layout,
      placements: result.placements,
    });
    expect(meta.animations[0].preset).toBeNull();
    expect(meta.animations[0].name).toBe("custom");
  });
});

describe("buildExportMeta — sheet 메타", () => {
  it("sheet width/height/padding/background가 layout과 일치", async () => {
    const cells: CellInput[] = [
      { imageData: makeImageData(8, 8), type: "base" },
    ];
    const result = await composeSpriteSheet(cells, {
      padding: 2,
      background: "#abcdef",
    });
    const meta = buildExportMeta({
      meta: makeMeta(),
      directionsPhase: { mode: 8, sprites: {} },
      animationsPhase: { byDirection: {} },
      layout: result.layout,
      placements: result.placements,
    });
    expect(meta.sheet.padding).toBe(2);
    expect(meta.sheet.background).toBe("#abcdef");
    expect(meta.sheet.width).toBe(result.layout.sheetWidth);
    expect(meta.sheet.height).toBe(result.layout.sheetHeight);
    expect(meta.directionMode).toBe(8);
  });
});

describe("serializeExportMeta", () => {
  it("ExportMeta → JSON 파싱 가능", async () => {
    const cells: CellInput[] = [
      { imageData: makeImageData(8, 8), type: "base" },
    ];
    const result = await composeSpriteSheet(cells);
    const meta = buildExportMeta({
      meta: makeMeta(),
      directionsPhase: { mode: 4, sprites: {} },
      animationsPhase: { byDirection: {} },
      layout: result.layout,
      placements: result.placements,
    });
    const json = serializeExportMeta(meta);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.project.name).toBe("Hero");
    expect(parsed.base).toEqual({ x: 0, y: 0 });
  });
});
