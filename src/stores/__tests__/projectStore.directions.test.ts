/**
 * projectStore — 방향 페이즈 액션 단위 테스트 (β-N — directions slice).
 *
 * setDirectionMode, setDirectionSprite, clearDirectionSprite, setDirectionSheetRaw.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { useProjectStore, _testHelpers } from "../projectStore";
import { _resetDBForTesting } from "@/services/persistence/db";
import type { DirectionSprite } from "@/services/persistence/types";

function dummyDirectionSprite(): DirectionSprite {
  // 1x1 ImageData (jsdom에서 안전한 최소 픽셀).
  const img = new ImageData(new Uint8ClampedArray([255, 0, 0, 255]), 1, 1);
  return {
    imageData: img,
    palette: [[255, 0, 0]],
  };
}

describe("projectStore — 방향 페이즈 액션 (β)", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    _resetDBForTesting();
    _testHelpers.resetTimer();
    useProjectStore.getState().reset();
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    _testHelpers.resetTimer();
    useProjectStore.getState().reset();
  });

  it("setDirectionMode 4↔8 전환 시 meta.directionMode + dirty 업데이트", async () => {
    await useProjectStore.getState().createProject("dir-mode");
    useProjectStore.getState().markSaved();
    expect(useProjectStore.getState().directionsPhase.mode).toBe(4);
    useProjectStore.getState().setDirectionMode(8);
    expect(useProjectStore.getState().directionsPhase.mode).toBe(8);
    expect(useProjectStore.getState().meta?.directionMode).toBe(8);
    expect(useProjectStore.getState().dirty).toBe(true);
  });

  it("setDirectionSprite로 단일 방향 추가 + sprites 객체에 반영", async () => {
    await useProjectStore.getState().createProject("dir-set");
    useProjectStore.getState().markSaved();
    const s = dummyDirectionSprite();
    useProjectStore.getState().setDirectionSprite("N", s);
    expect(useProjectStore.getState().directionsPhase.sprites.N).toBeDefined();
    expect(useProjectStore.getState().directionsPhase.sprites.N).toBe(s);
    expect(useProjectStore.getState().dirty).toBe(true);
  });

  it("setDirectionSprite(dir, null)로 sprite 제거", async () => {
    await useProjectStore.getState().createProject("dir-null");
    useProjectStore.getState().setDirectionSprite("E", dummyDirectionSprite());
    useProjectStore.getState().markSaved();
    useProjectStore.getState().setDirectionSprite("E", null);
    expect(useProjectStore.getState().directionsPhase.sprites.E).toBeUndefined();
    expect(useProjectStore.getState().dirty).toBe(true);
  });

  it("clearDirectionSprite — 존재하는 방향 제거", async () => {
    await useProjectStore.getState().createProject("dir-clear");
    useProjectStore.getState().setDirectionSprite("S", dummyDirectionSprite());
    useProjectStore.getState().markSaved();
    useProjectStore.getState().clearDirectionSprite("S");
    expect(useProjectStore.getState().directionsPhase.sprites.S).toBeUndefined();
    expect(useProjectStore.getState().dirty).toBe(true);
  });

  it("clearDirectionSprite — 없는 방향 → noop, dirty 변경 안 됨", async () => {
    await useProjectStore.getState().createProject("dir-noop");
    useProjectStore.getState().markSaved();
    useProjectStore.getState().clearDirectionSprite("W");
    expect(useProjectStore.getState().dirty).toBe(false);
  });

  it("setDirectionSheetRaw — base64 저장 + dirty", async () => {
    await useProjectStore.getState().createProject("sheet-raw");
    useProjectStore.getState().markSaved();
    useProjectStore.getState().setDirectionSheetRaw("RAW_B64");
    expect(useProjectStore.getState().directionsPhase.sheetRawBase64).toBe(
      "RAW_B64"
    );
    expect(useProjectStore.getState().dirty).toBe(true);
  });

  it("여러 방향 동시 보유 — 4개 추가 후 sprites 객체 길이 4", async () => {
    await useProjectStore.getState().createProject("multi-dir");
    const dirs = ["N", "E", "W", "S"] as const;
    dirs.forEach((d) =>
      useProjectStore.getState().setDirectionSprite(d, dummyDirectionSprite())
    );
    expect(
      Object.keys(useProjectStore.getState().directionsPhase.sprites)
    ).toHaveLength(4);
  });

  it("flushSave 후 loadProject로 directionsPhase mode + sheetRawBase64 복원", async () => {
    // sprite imageData 직렬화/복원은 jsdom Blob 한계로 별도 통합테스트에서 검증.
    // 여기서는 transactional persist만 확인.
    const id = await useProjectStore.getState().createProject("dir-persist");
    useProjectStore.getState().setDirectionMode(8);
    useProjectStore.getState().setDirectionSheetRaw("RAW_B64");
    await useProjectStore.getState().flushSave();
    useProjectStore.getState().reset();

    const ok = await useProjectStore.getState().loadProject(id);
    expect(ok).toBe(true);
    expect(useProjectStore.getState().directionsPhase.mode).toBe(8);
    expect(useProjectStore.getState().directionsPhase.sheetRawBase64).toBe(
      "RAW_B64"
    );
  });
});
