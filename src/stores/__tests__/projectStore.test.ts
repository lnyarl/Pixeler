/**
 * projectStore — α-N4 / α-N9 / α-N17.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  useProjectStore,
  _testHelpers,
  DEFAULT_META,
} from "../projectStore";
import { _resetDBForTesting } from "@/services/persistence/db";

describe("projectStore (α-N4)", () => {
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
    // hang 방지를 위해 강제 reset (진행 중인 promise는 그대로 두지만 다음 test는 깨끗).
    _testHelpers.resetTimer();
    useProjectStore.getState().reset();
  });

  it("createProject은 프로젝트 id 반환 + meta 설정", async () => {
    const id = await useProjectStore.getState().createProject("Hero");
    expect(id).toBeTruthy();
    const meta = useProjectStore.getState().meta;
    expect(meta?.id).toBe(id);
    expect(meta?.name).toBe("Hero");
    expect(meta?.lastPhase).toBe("base");
  });

  it("loadProject은 저장된 프로젝트 복원 + 없으면 false", async () => {
    const id = await useProjectStore.getState().createProject("X");
    useProjectStore.getState().reset();
    const ok = await useProjectStore.getState().loadProject(id);
    expect(ok).toBe(true);
    expect(useProjectStore.getState().meta?.id).toBe(id);

    const ok2 = await useProjectStore.getState().loadProject("nonexistent");
    expect(ok2).toBe(false);
  });

  it("markDirty는 dirty=true + localStorage 플래그 + 5초 debounce 타이머 (α-N17)", async () => {
    const id = await useProjectStore.getState().createProject("dirty-test");
    // 첫 createProject의 flushSave가 markDirty=false로 만들었을 수 있어 명시적으로 markSaved.
    useProjectStore.getState().markSaved();

    vi.useFakeTimers();
    try {
      useProjectStore.getState().markDirty();
      expect(useProjectStore.getState().dirty).toBe(true);
      expect(localStorage.getItem(_testHelpers.DIRTY_FLAG_KEY)).toBe(id);
      // 5초 미만이면 아직 발화 안 함.
      vi.advanceTimersByTime(_testHelpers.AUTO_SAVE_DEBOUNCE_MS - 1);
      expect(useProjectStore.getState().dirty).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("markSaved는 dirty=false + lastSavedAt 갱신 + 플래그 clear", async () => {
    await useProjectStore.getState().createProject("save-test");
    useProjectStore.getState().markDirty();
    useProjectStore.getState().markSaved();
    expect(useProjectStore.getState().dirty).toBe(false);
    expect(useProjectStore.getState().lastSavedAt).toBeGreaterThan(0);
    expect(localStorage.getItem(_testHelpers.DIRTY_FLAG_KEY)).toBeNull();
  });

  it("flushSave는 dirty 무관 즉시 저장 + 다음 loadProject로 복원 가능", async () => {
    const id = await useProjectStore.getState().createProject("flush-test");
    useProjectStore.getState().renameProject("renamed");
    await useProjectStore.getState().flushSave();
    expect(useProjectStore.getState().dirty).toBe(false);

    useProjectStore.getState().reset();
    await useProjectStore.getState().loadProject(id);
    expect(useProjectStore.getState().meta?.name).toBe("renamed");
  });

  it("reset은 store를 초기 상태로 되돌림", async () => {
    await useProjectStore.getState().createProject("X");
    useProjectStore.getState().reset();
    expect(useProjectStore.getState().currentProjectId).toBeNull();
    expect(useProjectStore.getState().meta).toBeNull();
    expect(useProjectStore.getState().dirty).toBe(false);
  });

  it("setLastPhase는 변경 시에만 dirty 마킹", async () => {
    await useProjectStore.getState().createProject("lp");
    useProjectStore.getState().markSaved();
    useProjectStore.getState().setLastPhase("base"); // 동일 — noop
    expect(useProjectStore.getState().dirty).toBe(false);
    useProjectStore.getState().setLastPhase("directions");
    expect(useProjectStore.getState().dirty).toBe(true);
  });

  it("DEFAULT_META export 형태 검증", () => {
    expect(DEFAULT_META.lastPhase).toBe("base");
    expect(DEFAULT_META.directionMode).toBe(4);
  });
});
