import { useEffect } from "react";
import { useCanvasStore } from "@/stores/canvasStore";

/**
 * 편집 중(dirty) 상태에서 탭 종료/새로고침 시 경고.
 */
export function useBeforeUnload() {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const dirty = useCanvasStore.getState().dirty;
      if (dirty) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}
