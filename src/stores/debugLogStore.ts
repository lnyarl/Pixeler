import { create } from "zustand";
import { uuid } from "@/utils/uuid";

export type GenerationMode =
  | "generate"
  | "feedback"
  | "inpaint"
  | "dev-skip"
  /** PR-β: 방향 페이즈 시트 1번 호출 */
  | "direction-sheet"
  /** PR-β: 방향 페이즈 셀별 재생성 */
  | "direction-cell"
  /** PR-γ: 애니메이션 페이즈 시트 호출 */
  | "animation-sheet"
  /** PR-γ: 애니메이션 페이즈 단일 프레임 재생성 */
  | "animation-frame";

export interface DebugLogEntry {
  id: string;
  timestamp: number;
  mode: GenerationMode;
  /** 사용자가 입력한 프롬프트 (가공 전) */
  userPrompt: string;
  /** AI에 실제로 전달된 최종 프롬프트 (시스템 컨텍스트 포함) */
  finalPrompt: string;
  /** 참조 이미지 base64 (수정/부분수정 시) */
  referenceImage?: string;
  /** 마스크 이미지 base64 (부분 수정 시) */
  maskImage?: string;
  /** AI 원본 응답 base64 */
  rawOutput?: string;
  /** 후처리 결과 base64 */
  processedOutput?: string;
  /** 부분 수정 합성 결과 base64 */
  compositedOutput?: string;
  /** 에러 메시지 (실패 시) */
  error?: string;
  /** 추가 메타데이터 */
  meta: {
    provider: string;
    width: number;
    height: number;
    paletteSize?: number;
    count?: number;
    durationMs?: number;
  };
}

const MAX_LOG_ENTRIES = 50;

interface DebugLogState {
  entries: DebugLogEntry[];
  /** 새 레코드를 시작하고 id를 반환. 이후 update로 채워나감. */
  startEntry: (entry: Omit<DebugLogEntry, "id" | "timestamp">) => string;
  /** 기존 레코드를 부분 업데이트 */
  updateEntry: (
    id: string,
    patch: Partial<Omit<DebugLogEntry, "meta">> & {
      meta?: Partial<DebugLogEntry["meta"]>;
    }
  ) => void;
  clear: () => void;
}

export const useDebugLogStore = create<DebugLogState>((set) => ({
  entries: [],

  startEntry: (entry) => {
    const id = uuid();
    set((state) => {
      const newEntry: DebugLogEntry = {
        ...entry,
        id,
        timestamp: Date.now(),
      };
      const updated = [newEntry, ...state.entries];
      if (updated.length > MAX_LOG_ENTRIES) {
        updated.length = MAX_LOG_ENTRIES;
      }
      return { entries: updated };
    });
    return id;
  },

  updateEntry: (id, patch) => {
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, ...patch, meta: { ...e.meta, ...(patch.meta ?? {}) } } : e
      ),
    }));
  },

  clear: () => set({ entries: [] }),
}));
