import { create } from "zustand";
import { uuid } from "@/utils/uuid";

const MAX_HISTORY = 100;

export interface HistoryItem {
  id: string;
  prompt: string;
  thumbnail: string;
  imageData: ImageData;
  timestamp: number;
  type: "generate" | "inpaint" | "feedback";
  parentId: string | null;
  /** AI 원본 이미지 (후처리 전, base64) — DEV 모드 비교용 */
  rawBase64?: string;
}

export interface HistoryState {
  items: HistoryItem[];
  activeItemId: string | null;
  /** 항목 추가. 항상 activeItemId를 새 항목으로 갱신. 새 항목의 id를 반환. */
  addItem: (item: Omit<HistoryItem, "id" | "timestamp">) => string;
  /** 항목 삭제. 자식의 parentId를 삭제 항목의 부모로 승격. activeItemId를 스마트 폴백. */
  removeItem: (id: string) => void;
  setActiveItemId: (id: string | null) => void;
  clear: () => void;
  /**
   * 전체 items + activeItemId를 일괄 교체 (M1).
   *
   * - 트리 구조(parentId)는 호출자가 보장.
   * - items.length > MAX_HISTORY인 경우 trimLeaves 적용 (오래된 leaf부터).
   * - activeId가 trim 또는 items에 없으면 폴백 (또는 빈 배열이면 null).
   * - imageData/thumbnail/rawBase64는 caller 제공 그대로 (deep copy 안 함).
   */
  replaceAll: (items: HistoryItem[], activeId: string | null) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  activeItemId: null,

  addItem: (item) => {
    const newId = uuid();
    set((state) => {
      const newItem: HistoryItem = {
        ...item,
        id: newId,
        timestamp: Date.now(),
      };
      const updated = [newItem, ...state.items];

      // MAX_HISTORY: 리프 노드 중 가장 오래된 것부터 폐기
      if (updated.length > MAX_HISTORY) {
        trimLeaves(updated, MAX_HISTORY);
      }

      return { items: updated, activeItemId: newId };
    });
    return newId;
  },

  removeItem: (id) => {
    const state = get();
    const target = state.items.find((i) => i.id === id);
    if (!target) return;

    // 자식들의 parentId를 삭제 항목의 부모로 승격
    const updatedItems = state.items
      .filter((i) => i.id !== id)
      .map((i) =>
        i.parentId === id ? { ...i, parentId: target.parentId } : i
      );

    // activeItemId 스마트 폴백
    let newActiveId = state.activeItemId;
    if (state.activeItemId === id) {
      newActiveId = findFallbackActiveId(target, updatedItems);
    }

    set({ items: updatedItems, activeItemId: newActiveId });
  },

  setActiveItemId: (id) => set({ activeItemId: id }),

  clear: () => set({ items: [], activeItemId: null }),

  replaceAll: (items, activeId) => {
    if (items.length === 0) {
      set({ items: [], activeItemId: null });
      return;
    }
    const next = [...items];
    if (next.length > MAX_HISTORY) {
      trimLeaves(next, MAX_HISTORY);
    }
    // activeId가 items 안에 존재하지 않으면 폴백
    let nextActive: string | null = activeId;
    if (nextActive && !next.find((i) => i.id === nextActive)) {
      nextActive = next[0]?.id ?? null;
    }
    if (nextActive === null && next.length > 0) {
      nextActive = next[0].id;
    }
    set({ items: next, activeItemId: nextActive });
  },
}));

/** 삭제 시 activeItemId 폴백: 부모 → 자식 → 가까운 항목 → null */
function findFallbackActiveId(
  deleted: HistoryItem,
  remaining: HistoryItem[]
): string | null {
  if (remaining.length === 0) return null;

  // 1. 부모가 있으면 부모
  if (deleted.parentId) {
    const parent = remaining.find((i) => i.id === deleted.parentId);
    if (parent) return parent.id;
  }

  // 2. 자식 (승격 후 남아있는)
  const child = remaining.find((i) => i.parentId === deleted.parentId);
  if (child) return child.id;

  // 3. 시간순 가장 가까운 항목
  const sorted = [...remaining].sort(
    (a, b) =>
      Math.abs(a.timestamp - deleted.timestamp) -
      Math.abs(b.timestamp - deleted.timestamp)
  );
  return sorted[0]?.id ?? null;
}

/** 리프 노드 중 오래된 것부터 제거하여 maxSize 이하로 유지 */
function trimLeaves(items: HistoryItem[], maxSize: number) {
  while (items.length > maxSize) {
    const parentIds = new Set(items.map((i) => i.parentId).filter(Boolean));
    // 리프: 자식이 없는 노드
    const leaves = items.filter((i) => !parentIds.has(i.id));
    if (leaves.length === 0) break; // 전부 부모면 중단

    // 가장 오래된 리프 제거
    const oldest = leaves.reduce((a, b) =>
      a.timestamp < b.timestamp ? a : b
    );
    const idx = items.findIndex((i) => i.id === oldest.id);
    if (idx !== -1) items.splice(idx, 1);
  }
}
