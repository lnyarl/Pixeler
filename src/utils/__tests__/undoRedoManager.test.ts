import { describe, it, expect, beforeEach } from "vitest";
import { UndoRedoManager } from "../undoRedoManager";

function makeImageData(fill: number): ImageData {
  const data = new Uint8ClampedArray(4 * 4 * 4);
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
    manager.pushSnapshot(makeImageData(100), "item-1");
    expect(manager.canUndo).toBe(true);
  });

  it("undo하면 이전 스냅샷(ImageData + activeItemId) 반환", () => {
    manager.pushSnapshot(makeImageData(10), "item-1");
    const result = manager.undo(makeImageData(20), "item-2");
    expect(result).not.toBeNull();
    expect(result!.imageData.data[0]).toBe(10);
    expect(result!.activeItemId).toBe("item-1");
  });

  it("undo 후 redo 가능", () => {
    manager.pushSnapshot(makeImageData(10), "item-1");
    manager.undo(makeImageData(20), "item-2");
    expect(manager.canRedo).toBe(true);
  });

  it("redo하면 되돌린 상태 반환", () => {
    manager.pushSnapshot(makeImageData(10), "item-1");
    manager.undo(makeImageData(20), "item-2");
    const restored = manager.redo(makeImageData(10), "item-1");
    expect(restored).not.toBeNull();
    expect(restored!.imageData.data[0]).toBe(20);
    expect(restored!.activeItemId).toBe("item-2");
  });

  it("새 동작 수행 시 redo 스택 클리어", () => {
    manager.pushSnapshot(makeImageData(10), null);
    manager.undo(makeImageData(20), null);
    expect(manager.canRedo).toBe(true);
    manager.pushSnapshot(makeImageData(30), null);
    expect(manager.canRedo).toBe(false);
  });

  it("50개 초과 시 오래된 스냅샷 폐기", () => {
    for (let i = 0; i < 55; i++) {
      manager.pushSnapshot(makeImageData(i), null);
    }
    expect(manager.undoCount).toBe(50);
  });

  it("clear 후 스택 초기화", () => {
    manager.pushSnapshot(makeImageData(10), "item-1");
    manager.clear();
    expect(manager.canUndo).toBe(false);
    expect(manager.canRedo).toBe(false);
  });

  it("스냅샷은 원본과 독립적 (deep copy)", () => {
    const original = makeImageData(10);
    manager.pushSnapshot(original, null);
    original.data[0] = 99;
    const result = manager.undo(makeImageData(20), null);
    expect(result!.imageData.data[0]).toBe(10);
  });
});
