import { create } from "zustand";

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
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  activeItemId: null,

  addItem: (item) => {
    const newId = crypto.randomUUID();
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
