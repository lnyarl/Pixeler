/**
 * historyProjectBridge — 단방향 동기화 (C2) + palette 추출 검증.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  baseSpritesToHistoryItems,
  historyItemsToBaseSprites,
  loadBasePhaseToHistory,
  serializeHistoryToProject,
} from "../historyProjectBridge";
import { useHistoryStore } from "@/stores/historyStore";
import { useProjectStore } from "@/stores/projectStore";
import { _resetDBForTesting } from "@/services/persistence/db";

function makeImage(
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

describe("historyProjectBridge (C2 / α-N14)", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    _resetDBForTesting();
    useHistoryStore.setState({ items: [], activeItemId: null });
    useProjectStore.getState().reset();
  });

  it("baseSpritesToHistoryItems → palette 필드 drop", () => {
    const items = baseSpritesToHistoryItems([
      {
        id: "a",
        imageData: makeImage(4, 4, [255, 0, 0, 255]),
        palette: [
          [255, 0, 0],
          [0, 0, 0],
        ],
        prompt: "p",
        thumbnail: "",
        parentId: null,
        type: "generate",
        timestamp: 0,
      },
    ]);
    expect(items).toHaveLength(1);
    expect("palette" in items[0]).toBe(false);
    expect(items[0].id).toBe("a");
  });

  it("historyItemsToBaseSprites → palette 새로 추출", () => {
    const sprites = historyItemsToBaseSprites(
      [
        {
          id: "a",
          imageData: makeImage(4, 4, [128, 64, 200, 255]),
          prompt: "p",
          thumbnail: "",
          timestamp: 1,
          type: "generate",
          parentId: null,
        },
      ],
      4
    );
    expect(sprites).toHaveLength(1);
    // 단색이라 palette는 1개의 cluster이지만 paletteMap이 4개를 만들 수 있음 (k>=1).
    expect(sprites[0].palette.length).toBeGreaterThan(0);
    // 추출된 색상이 입력 색에 매우 가까움.
    const c = sprites[0].palette[0];
    expect(c[0]).toBeGreaterThan(100);
    expect(c[2]).toBeGreaterThan(100);
  });

  it("loadBasePhaseToHistory → projectStore.basePhase를 historyStore로 일괄 주입", async () => {
    await useProjectStore.getState().createProject("bridge-test");
    // projectStore.basePhase에 sprite 2개 직접 설정.
    useProjectStore.getState().replaceBaseSprites(
      [
        {
          id: "a",
          imageData: makeImage(4, 4, [255, 0, 0, 255]),
          palette: [],
          prompt: "p1",
          thumbnail: "",
          parentId: null,
          type: "generate",
          timestamp: 0,
        },
        {
          id: "b",
          imageData: makeImage(4, 4, [0, 255, 0, 255]),
          palette: [],
          prompt: "p2",
          thumbnail: "",
          parentId: "a",
          type: "feedback",
          timestamp: 1,
        },
      ],
      "b"
    );
    loadBasePhaseToHistory();
    const h = useHistoryStore.getState();
    expect(h.items).toHaveLength(2);
    expect(h.activeItemId).toBe("b");
  });

  it("[C2] historyStore.addItem 호출 후 projectStore.basePhase는 즉시 변하지 않음", async () => {
    await useProjectStore.getState().createProject("c2-test");
    expect(useProjectStore.getState().basePhase.sprites).toHaveLength(0);

    useHistoryStore.getState().addItem({
      prompt: "p",
      thumbnail: "",
      imageData: makeImage(4, 4, [10, 10, 10, 255]),
      type: "generate",
      parentId: null,
    });
    // bridge는 markDirty만 호출. basePhase.sprites는 그대로.
    expect(useProjectStore.getState().basePhase.sprites).toHaveLength(0);
  });

  it("serializeHistoryToProject → historyStore의 items가 projectStore.basePhase로 1회 옮김", async () => {
    await useProjectStore.getState().createProject("serialize-test");
    useHistoryStore.getState().addItem({
      prompt: "p",
      thumbnail: "",
      imageData: makeImage(4, 4, [10, 10, 10, 255]),
      type: "generate",
      parentId: null,
    });
    serializeHistoryToProject();
    expect(useProjectStore.getState().basePhase.sprites).toHaveLength(1);
    expect(useProjectStore.getState().basePhase.activeSpriteId).toBeTruthy();
    // palette 필드가 새로 채워짐.
    expect(useProjectStore.getState().basePhase.sprites[0].palette).toBeDefined();
  });

  it("[W13] projectStore.basePhase 변경 후 historyStore는 reverse-sync 안 됨", async () => {
    await useProjectStore.getState().createProject("nocycle");
    useHistoryStore.setState({ items: [], activeItemId: null });
    // 직접 projectStore.basePhase 변경.
    useProjectStore.getState().replaceBaseSprites(
      [
        {
          id: "z",
          imageData: makeImage(4, 4, [0, 0, 0, 255]),
          palette: [],
          prompt: "z",
          thumbnail: "",
          parentId: null,
          type: "generate",
          timestamp: 0,
        },
      ],
      "z"
    );
    // historyStore는 그대로 (reverse-sync 없음).
    expect(useHistoryStore.getState().items).toHaveLength(0);
  });
});
