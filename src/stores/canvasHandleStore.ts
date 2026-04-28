import { create } from "zustand";
import type { PixelCanvasHandle } from "@/components/Canvas/PixelCanvas";

/**
 * 캔버스 핸들(imperative ref) 보관 store.
 *
 * 책임 분리 (canvasStore와 분리된 이유):
 * - canvasStore: 픽셀 도구/색상/해상도 등 declarative state
 * - canvasHandleStore: PixelCanvas의 imperative 메서드(loadImageData/getImageData) 위임
 *
 * 호출 패턴:
 * - PixelCanvas: useEffect 안에서 setHandle({ loadImageData, getImageData }) + cleanup setHandle(null)
 * - 호출자(PromptPanel/DraftGrid/HistoryPanel/PostProcessSelector/ExportButton):
 *   selector로 메서드만 받아 사용 — `useCanvasHandleStore((s) => s.loadImageData)`
 */
export interface CanvasHandleState {
  handle: PixelCanvasHandle | null;
  setHandle: (h: PixelCanvasHandle | null) => void;
  /** 캔버스에 ImageData를 로드. handle 미준비 시 noop. */
  loadImageData: (img: ImageData) => void;
  /** 현재 캔버스 ImageData(deep copy). handle 미준비 시 null. */
  getImageData: () => ImageData | null;
}

export const useCanvasHandleStore = create<CanvasHandleState>((set, get) => ({
  handle: null,
  setHandle: (handle) => set({ handle }),
  loadImageData: (img) => {
    const h = get().handle;
    if (!h) return; // noop — 핸들 미준비 상태에서도 안전
    h.loadImageData(img);
  },
  getImageData: () => {
    const h = get().handle;
    return h ? h.getImageData() : null;
  },
}));
