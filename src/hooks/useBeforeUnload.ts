import { useEffect } from "react";
import { useProjectStore } from "@/stores/projectStore";

/**
 * 편집 중(dirty) 상태에서 탭 종료/새로고침 시 경고.
 *
 * **C1 적용**: dirty 출처를 `projectStore.dirty`로 일원화 (canvasStore.dirty는 PR-α에서 제거).
 * 사용자가 confirm dialog를 reject(머무름)하면 자동 저장 debounce(5초)가 발화하여 안전망.
 */
export function useBeforeUnload() {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const dirty = useProjectStore.getState().dirty;
      if (dirty) {
        // 가능한 한 즉시 flushSave 시도 (브라우저는 비동기 종료를 강행할 수 있음).
        void useProjectStore.getState().flushSave();
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}
