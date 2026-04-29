import { create } from "zustand";

export type DownscaleAlgorithm = "mode" | "nearest";

/** AI 제공자 선택 */
export type ProviderType = "stability" | "localSD";

/** Local SD 연결 설정 */
export interface LocalSDSettings {
  url: string;
  loraName: string;
  loraWeight: number;
}

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
  /** Stability AI API 키. */
  apiKey: string;
  /** 활성 AI 제공자. */
  provider: ProviderType;
  /** Local SD 연결 설정. */
  localSD: LocalSDSettings;
  paletteSize: number;
  postProcess: PostProcessConfig;
  /**
   * AI 프롬프트에 1픽셀 다크 외곽선 힌트를 추가할지 여부.
   * buildStyleLine이 이 값을 받아 외곽선 텍스트를 append (default: false → 기존 동작 동일).
   */
  requireEdges: boolean;
  setApiKey: (key: string) => void;
  removeApiKey: () => void;
  setProvider: (provider: ProviderType) => void;
  setLocalSD: (patch: Partial<LocalSDSettings>) => void;
  setPaletteSize: (size: number) => void;
  setPostProcess: (patch: Partial<PostProcessConfig>) => void;
  setRequireEdges: (v: boolean) => void;
}

const STORAGE_KEY = "pixeler_api_keys";
const LOCAL_SD_STORAGE_KEY = "pixeler_local_sd";
const PROVIDER_STORAGE_KEY = "pixeler_provider";

/**
 * 마이그레이션:
 *   기존 스키마 { openai: string, stability: string } → stability 키만 사용.
 *   openai 필드는 무시. 새 단일 키 스키마 { apiKey: string }로도 호환.
 */
function loadApiKey(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return "";
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.apiKey === "string") return obj.apiKey;
      if (typeof obj.stability === "string") return obj.stability;
    }
  } catch {
    // 파싱 실패 시 기본값
  }
  return "";
}

function saveApiKey(key: string) {
  // 단일 키 스키마로 저장. 기존 openai/stability 필드는 덮어쓰며 자연 마이그레이션.
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey: key }));
}

function loadLocalSD(): LocalSDSettings {
  const defaults: LocalSDSettings = {
    url: "http://localhost:7861",
    loraName: "",
    loraWeight: 0.8,
  };
  try {
    const stored = localStorage.getItem(LOCAL_SD_STORAGE_KEY);
    if (!stored) return defaults;
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      return {
        url: typeof obj.url === "string" ? obj.url : defaults.url,
        loraName:
          typeof obj.loraName === "string" ? obj.loraName : defaults.loraName,
        loraWeight:
          typeof obj.loraWeight === "number"
            ? obj.loraWeight
            : defaults.loraWeight,
      };
    }
  } catch {
    // 파싱 실패 시 기본값
  }
  return defaults;
}

function saveLocalSD(settings: LocalSDSettings) {
  localStorage.setItem(LOCAL_SD_STORAGE_KEY, JSON.stringify(settings));
}

function loadProvider(): ProviderType {
  try {
    const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (stored === "localSD") return "localSD";
  } catch {
    // 파싱 실패 시 기본값
  }
  return "stability";
}

function saveProvider(provider: ProviderType) {
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
}

export const useSettingsStore = create<SettingsState>((set) => ({
  apiKey: loadApiKey(),
  provider: loadProvider(),
  localSD: loadLocalSD(),
  paletteSize: 16,
  postProcess: {
    downscale: "mode",
    transparentBg: true,
    paletteMap: true,
    outlinePreserve: false,
  },
  requireEdges: false,

  setApiKey: (key) => {
    saveApiKey(key);
    set({ apiKey: key });
  },

  removeApiKey: () => {
    saveApiKey("");
    set({ apiKey: "" });
  },

  setProvider: (provider) => {
    saveProvider(provider);
    set({ provider });
  },

  setLocalSD: (patch) =>
    set((state) => {
      const next = { ...state.localSD, ...patch };
      saveLocalSD(next);
      return { localSD: next };
    }),

  setPaletteSize: (size) => {
    if (size === 0 || (size >= 4 && size <= 64)) set({ paletteSize: size });
  },
  setPostProcess: (patch) =>
    set((state) => ({ postProcess: { ...state.postProcess, ...patch } })),
  setRequireEdges: (v) => set({ requireEdges: v }),
}));
