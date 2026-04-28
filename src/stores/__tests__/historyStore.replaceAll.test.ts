/**
 * historyStore.replaceAll (M1) — 시그니처/동작 명세 검증.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useHistoryStore, type HistoryItem } from "../historyStore";

function makeItem(id: string, parentId: string | null = null, ts = id.charCodeAt(0)): HistoryItem {
  return {
    id,
    prompt: `prompt ${id}`,
    thumbnail: "",
    imageData: new ImageData(2, 2),
    timestamp: ts,
    type: "generate",
    parentId,
  };
}

describe("historyStore.replaceAll (M1)", () => {
  beforeEach(() => {
    useHistoryStore.setState({ items: [], activeItemId: null });
  });

  it("빈 store에 items=[3개] 주입 시 items.length=3, activeId 일치", () => {
    const items = [makeItem("a"), makeItem("b", "a"), makeItem("c", "b")];
    useHistoryStore.getState().replaceAll(items, "b");
    const s = useHistoryStore.getState();
    expect(s.items).toHaveLength(3);
    expect(s.activeItemId).toBe("b");
  });

  it("기존 items 5개 → replaceAll(items=[2개]) 시 정확히 2개로 대체", () => {
    for (const id of ["x", "y", "z", "w", "v"]) {
      useHistoryStore.getState().addItem({
        prompt: id,
        thumbnail: "",
        imageData: new ImageData(2, 2),
        type: "generate",
        parentId: null,
      });
    }
    expect(useHistoryStore.getState().items).toHaveLength(5);
    const items = [makeItem("a"), makeItem("b")];
    useHistoryStore.getState().replaceAll(items, "a");
    expect(useHistoryStore.getState().items).toHaveLength(2);
  });

  it("items.length > MAX_HISTORY → trim 동작 (오래된 leaf부터)", () => {
    const items: HistoryItem[] = [];
    for (let i = 0; i < 105; i++) {
      items.push(makeItem(`i${i}`, null, i));
    }
    useHistoryStore.getState().replaceAll(items, "i104");
    expect(useHistoryStore.getState().items.length).toBeLessThanOrEqual(100);
    // 가장 오래된 것이 빠짐 (i0 등)
    const ids = useHistoryStore.getState().items.map((i) => i.id);
    expect(ids).toContain("i104");
    expect(ids).not.toContain("i0");
  });

  it("activeId가 items에 없으면 → 폴백", () => {
    const items = [makeItem("a"), makeItem("b")];
    useHistoryStore.getState().replaceAll(items, "ghost");
    const s = useHistoryStore.getState();
    expect(s.items).toHaveLength(2);
    expect(s.activeItemId).toBe("a"); // 첫 번째로 폴백
  });

  it("빈 배열이면 activeId 무시하고 null로 설정", () => {
    useHistoryStore.getState().replaceAll([], "anything");
    expect(useHistoryStore.getState().activeItemId).toBeNull();
    expect(useHistoryStore.getState().items).toHaveLength(0);
  });
});
