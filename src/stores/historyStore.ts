import { create } from "zustand";

const MAX_HISTORY = 100;

export interface HistoryItem {
  id: string;
  prompt: string;
  /** base64 PNG 썸네일 */
  thumbnail: string;
  /** 후처리된 ImageData (캔버스 복원용) */
  imageData: ImageData;
  timestamp: number;
  /** 생성 타입 */
  type: "generate" | "inpaint" | "feedback";
}

export interface HistoryState {
  items: HistoryItem[];
  addItem: (item: Omit<HistoryItem, "id" | "timestamp">) => void;
  clear: () => void;
}

let nextId = 0;

export const useHistoryStore = create<HistoryState>((set) => ({
  items: [],

  addItem: (item) =>
    set((state) => {
      const newItem: HistoryItem = {
        ...item,
        id: `hist-${nextId++}`,
        timestamp: Date.now(),
      };
      const updated = [newItem, ...state.items];
      if (updated.length > MAX_HISTORY) {
        updated.length = MAX_HISTORY;
      }
      return { items: updated };
    }),

  clear: () => set({ items: [] }),
}));
