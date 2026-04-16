import { describe, it, expect, beforeEach } from "vitest";
import { UndoRedoManager } from "../undoRedoManager";

function makeImageData(fill: number): ImageData {
  const data = new Uint8ClampedArray(4 * 4 * 4); // 4x4
  data.fill(fill);
  return new ImageData(data, 4, 4);
}

describe("UndoRedoManager", () => {
  let manager: UndoRedoManager;

  beforeEach(() => {
    manager = new UndoRedoManager();
  });

  it("초기 상태에서 undo/redo 불가", () => {
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
  });

  it("스냅샷 push 후 undo 가능", () => {
    const snapshot = makeImageData(100);
    manager.pushSnapshot(snapshot);
    expect(manager.canUndo).toBe(true);
  });

  it("undo하면 이전 스냅샷 반환", () => {
    const first = makeImageData(10);
    manager.pushSnapshot(first);

    const current = makeImageData(20);
    const result = manager.undo(current);

    expect(result).not.toBeNull();
    expect(result!.data[0]).toBe(10);
  });

  it("undo 후 redo 가능", () => {
    manager.pushSnapshot(makeImageData(10));
    const current = makeImageData(20);
    manager.undo(current);

    expect(manager.canRedo).toBe(true);
  });

  it("redo하면 되돌린 상태 반환", () => {
    manager.pushSnapshot(makeImageData(10));
    const current = makeImageData(20);
    manager.undo(current);

    const restored = manager.redo(makeImageData(10));
    expect(restored).not.toBeNull();
    expect(restored!.data[0]).toBe(20);
  });

  it("새 동작 수행 시 redo 스택 클리어", () => {
    manager.pushSnapshot(makeImageData(10));
    manager.undo(makeImageData(20));
    expect(manager.canRedo).toBe(true);

    manager.pushSnapshot(makeImageData(30));
    expect(manager.canRedo).toBe(false);
  });

  it("50개 초과 시 오래된 스냅샷 폐기", () => {
    for (let i = 0; i < 55; i++) {
      manager.pushSnapshot(makeImageData(i));
    }
    expect(manager.undoCount).toBe(50);
  });

  it("clear 후 스택 초기화", () => {
    manager.pushSnapshot(makeImageData(10));
    manager.clear();
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
  });

  it("스냅샷은 원본과 독립적 (deep copy)", () => {
    const original = makeImageData(10);
    manager.pushSnapshot(original);

    // 원본 수정
    original.data[0] = 99;

    // undo로 꺼내면 수정 전 값
    const result = manager.undo(makeImageData(20));
    expect(result!.data[0]).toBe(10);
  });
});
