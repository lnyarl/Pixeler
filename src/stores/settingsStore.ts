import { create } from "zustand";
import type { AIProviderType, ViewType } from "@/services/ai/types";

interface ApiKeys {
  openai: string;
  stability: string;
}

export interface SettingsState {
  apiKeys: ApiKeys;
  selectedProvider: AIProviderType;
  viewType: ViewType;
  paletteSize: number;
  setApiKey: (provider: AIProviderType, key: string) => void;
  removeApiKey: (provider: AIProviderType) => void;
  setSelectedProvider: (provider: AIProviderType) => void;
  setViewType: (viewType: ViewType) => void;
  setPaletteSize: (size: number) => void;
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
  viewType: "side",
  paletteSize: 16,

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
  setViewType: (viewType) => set({ viewType }),
  setPaletteSize: (size) => {
    if (size === 0 || (size >= 4 && size <= 64)) set({ paletteSize: size });
  },
}));
