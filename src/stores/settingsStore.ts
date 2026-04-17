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
}

export interface SettingsState {
  apiKeys: ApiKeys;
  selectedProvider: AIProviderType;
  paletteSize: number;
  postProcess: PostProcessConfig;
  setApiKey: (provider: AIProviderType, key: string) => void;
  removeApiKey: (provider: AIProviderType) => void;
  setSelectedProvider: (provider: AIProviderType) => void;
  setPaletteSize: (size: number) => void;
  setPostProcess: (patch: Partial<PostProcessConfig>) => void;
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
  },

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
}));
