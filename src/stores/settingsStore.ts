import { create } from "zustand";
import type { AIProviderType } from "@/services/ai/types";

interface ApiKeys {
  openai: string;
  stability: string;
}

export type DownscaleAlgorithm = "mode" | "nearest";

/** 후처리 단계별 on/off */
export interface PostProcessConfig {
  downscale: DownscaleAlgorithm;
  transparentBg: boolean;
  paletteMap: boolean;
  /**
   * 외곽선 보존 (downscale="mode"일 때만 적용).
   * 블록 내 가장 어두운 α>128 픽셀이 mode 후보보다 luminance가 임계치(64) 이상 작으면 그 픽셀로 대체.
   * 기본 false → 기존 동작 100% 동일.
   */
  outlinePreserve: boolean;
}

export interface SettingsState {
  apiKeys: ApiKeys;
  selectedProvider: AIProviderType;
  paletteSize: number;
  postProcess: PostProcessConfig;
  /**
   * AI 프롬프트에 1픽셀 다크 외곽선 힌트를 추가할지 여부.
   * buildStyleLine이 이 값을 받아 외곽선 텍스트를 append (default: false → 기존 동작 동일).
   */
  requireEdges: boolean;
  setApiKey: (provider: AIProviderType, key: string) => void;
  removeApiKey: (provider: AIProviderType) => void;
  setSelectedProvider: (provider: AIProviderType) => void;
  setPaletteSize: (size: number) => void;
  setPostProcess: (patch: Partial<PostProcessConfig>) => void;
  setRequireEdges: (v: boolean) => void;
}

const STORAGE_KEY = "pixeler_api_keys";

function loadApiKeys(): ApiKeys {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // 파싱 실패 시 기본값
  }
  return { openai: "", stability: "" };
}

function saveApiKeys(keys: ApiKeys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKeys: loadApiKeys(),
  selectedProvider: "openai",
  paletteSize: 16,
  postProcess: {
    downscale: "mode",
    transparentBg: true,
    paletteMap: true,
    outlinePreserve: false,
  },
  requireEdges: false,

  setApiKey: (provider, key) => {
    const updated = { ...get().apiKeys, [provider]: key };
    saveApiKeys(updated);
    set({ apiKeys: updated });
  },

  removeApiKey: (provider) => {
    const updated = { ...get().apiKeys, [provider]: "" };
    saveApiKeys(updated);
    set({ apiKeys: updated });
  },

  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setPaletteSize: (size) => {
    if (size === 0 || (size >= 4 && size <= 64)) set({ paletteSize: size });
  },
  setPostProcess: (patch) =>
    set((state) => ({ postProcess: { ...state.postProcess, ...patch } })),
  setRequireEdges: (v) => set({ requireEdges: v }),
}));
