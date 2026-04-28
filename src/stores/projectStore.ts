/**
 * projectStore — 현재 작업 중인 프로젝트의 in-memory 상태 (§4.3).
 *
 * - 베이스/방향/애니메이션 페이즈 슬롯 + dirty/save 액션.
 * - PR-α는 베이스 페이즈만 활성. 방향/애니메이션은 placeholder 데이터로 초기화.
 * - 자동 저장 정책 (§4.5): markDirty 후 5초 idle 시 flushSave. 즉시 저장 트리거(페이즈 전환·허브 복귀·수동·unload).
 */

import { create } from "zustand";
import { uuid } from "@/utils/uuid";
import type {
  ProjectMeta,
  BasePhaseState,
  DirectionsPhaseState,
  AnimationsPhaseState,
  FullProject,
  DirKey,
  BaseSprite,
  DirectionMode,
  DirectionSprite,
  LastPhase,
} from "@/services/persistence/types";
import {
  saveProject as dbSaveProject,
  getProject as dbGetProject,
} from "@/services/persistence/db";
import {
  serializeProject,
  deserializeProject,
} from "@/services/persistence/serialize";

const AUTO_SAVE_DEBOUNCE_MS = 5000;
const DIRTY_FLAG_KEY = "pixeler:dirtyProjectId";

export interface ProjectState {
  currentProjectId: string | null;
  meta: ProjectMeta | null;
  basePhase: BasePhaseState;
  directionsPhase: DirectionsPhaseState;
  animationsPhase: AnimationsPhaseState;
  /** 변경 누적 플래그 — auto save 트리거. */
  dirty: boolean;
  /** 마지막 저장 시각 (ms). 0이면 아직 저장된 적 없음. */
  lastSavedAt: number;

  /** 새 프로젝트 생성 후 currentProject로 진입. id 반환. */
  createProject: (
    name: string,
    width?: number,
    height?: number
  ) => Promise<string>;

  /** id로 프로젝트 로드 (IndexedDB → deserialize → store 반영). */
  loadProject: (id: string) => Promise<boolean>;

  /** 프로젝트 이름 변경 + dirty. */
  renameProject: (name: string) => void;

  /** 베이스 sprite 일괄 교체 (bridge가 호출). */
  replaceBaseSprites: (
    sprites: BaseSprite[],
    activeSpriteId: string | null
  ) => void;

  /** 베이스 활성 sprite 설정 + thumbnail 갱신. */
  setBaseActiveSprite: (id: string | null, thumbnail?: string | null) => void;

  /** 방향 모드 설정 (4 또는 8). */
  setDirectionMode: (mode: DirectionMode) => void;

  /** 단일 방향 sprite 갱신. */
  setDirectionSprite: (dir: DirKey, sprite: DirectionSprite | null) => void;

  /** 단일 방향 sprite 제거 (재생성 전 초기화 등). */
  clearDirectionSprite: (dir: DirKey) => void;

  /** AI가 만든 1024 원본 시트 base64 저장 (재분할 디버그용). */
  setDirectionSheetRaw: (rawBase64: string | undefined) => void;

  /** 마지막 활성 페이즈 갱신 (라우트 복원용). */
  setLastPhase: (phase: LastPhase) => void;

  /** dirty 마킹 + 자동 저장 debounce 시작. */
  markDirty: () => void;

  /** 저장 완료 — dirty=false + lastSavedAt 갱신 + dirty 플래그 clear. */
  markSaved: () => void;

  /**
   * 즉시 저장 (페이즈 전환·허브 복귀·수동·unload).
   * - dirty 무관, 호출 시 무조건 직렬화/저장.
   * - bridgeSerialize: 베이스 페이즈 종료 시 historyStore items를 sprites로 옮기는 hook.
   */
  flushSave: (bridgeSerialize?: () => void) => Promise<void>;

  /** 현재 프로젝트 unload — store 초기화. */
  reset: () => void;
}

const DEFAULT_META: ProjectMeta = {
  id: "",
  name: "",
  width: 32,
  height: 32,
  createdAt: 0,
  updatedAt: 0,
  lastPhase: "base",
  directionMode: 4,
  thumbnailBase64: null,
};

const INITIAL_BASE: BasePhaseState = {
  activeSpriteId: null,
  sprites: [],
};

const INITIAL_DIRECTIONS: DirectionsPhaseState = {
  mode: 4,
  sprites: {},
};

const INITIAL_ANIMATIONS: AnimationsPhaseState = {
  byDirection: {},
};

let _saveTimer: ReturnType<typeof setTimeout> | null = null;
/** flushSave 진행 중 플래그 (W5 — race 방지). 진행 중이면 새 호출은 noop. */
let _saving = false;

function setDirtyFlag(projectId: string | null) {
  try {
    if (projectId) localStorage.setItem(DIRTY_FLAG_KEY, projectId);
    else localStorage.removeItem(DIRTY_FLAG_KEY);
  } catch {
    /* localStorage 비활성 환경 — 무시 */
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProjectId: null,
  meta: null,
  basePhase: INITIAL_BASE,
  directionsPhase: INITIAL_DIRECTIONS,
  animationsPhase: INITIAL_ANIMATIONS,
  dirty: false,
  lastSavedAt: 0,

  createProject: async (name, width = 32, height = 32) => {
    const id = uuid();
    const now = Date.now();
    const meta: ProjectMeta = {
      id,
      name: name.trim() || "새 프로젝트",
      width,
      height,
      createdAt: now,
      updatedAt: now,
      lastPhase: "base",
      directionMode: 4,
      thumbnailBase64: null,
    };
    set({
      currentProjectId: id,
      meta,
      basePhase: { activeSpriteId: null, sprites: [] },
      directionsPhase: { mode: 4, sprites: {} },
      animationsPhase: { byDirection: {} },
      dirty: true, // 첫 저장이 필요 — flushSave()로 IndexedDB 등록.
      lastSavedAt: 0,
    });
    // 즉시 저장 시도. 호출자(Hub)가 await으로 결과 보장 가능.
    try {
      await get().flushSave();
    } catch {
      /* 실패해도 dirty 유지되어 다음 debounce에서 재시도 */
    }
    return id;
  },

  loadProject: async (id) => {
    const serialized = await dbGetProject(id);
    if (!serialized) return false;
    const full = await deserializeProject(serialized);
    set({
      currentProjectId: id,
      meta: full.meta,
      basePhase: full.basePhase,
      directionsPhase: full.directionsPhase,
      animationsPhase: full.animationsPhase,
      dirty: false,
      lastSavedAt: Date.now(),
    });
    return true;
  },

  renameProject: (name) => {
    const meta = get().meta;
    if (!meta) return;
    set({ meta: { ...meta, name: name.trim() || meta.name } });
    get().markDirty();
  },

  replaceBaseSprites: (sprites, activeSpriteId) => {
    set({ basePhase: { sprites, activeSpriteId } });
  },

  setBaseActiveSprite: (id, thumbnail) => {
    const meta = get().meta;
    if (!meta) return;
    set({
      basePhase: { ...get().basePhase, activeSpriteId: id },
      meta: {
        ...meta,
        thumbnailBase64:
          thumbnail !== undefined ? thumbnail : meta.thumbnailBase64,
      },
    });
    get().markDirty();
  },

  setDirectionMode: (mode) => {
    const meta = get().meta;
    set({
      directionsPhase: { ...get().directionsPhase, mode },
      meta: meta ? { ...meta, directionMode: mode } : meta,
    });
    get().markDirty();
  },

  setDirectionSprite: (dir, sprite) => {
    const sprites = { ...get().directionsPhase.sprites };
    if (sprite) sprites[dir] = sprite;
    else delete sprites[dir];
    set({ directionsPhase: { ...get().directionsPhase, sprites } });
    get().markDirty();
  },

  clearDirectionSprite: (dir) => {
    const sprites = { ...get().directionsPhase.sprites };
    if (!(dir in sprites)) return;
    delete sprites[dir];
    set({ directionsPhase: { ...get().directionsPhase, sprites } });
    get().markDirty();
  },

  setDirectionSheetRaw: (rawBase64) => {
    set({
      directionsPhase: { ...get().directionsPhase, sheetRawBase64: rawBase64 },
    });
    get().markDirty();
  },

  setLastPhase: (phase) => {
    const meta = get().meta;
    if (!meta) return;
    if (meta.lastPhase === phase) return;
    set({ meta: { ...meta, lastPhase: phase } });
    get().markDirty();
  },

  markDirty: () => {
    const { currentProjectId, dirty } = get();
    if (!currentProjectId) return;
    setDirtyFlag(currentProjectId);
    if (!dirty) set({ dirty: true });
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      _saveTimer = null;
      void get().flushSave();
    }, AUTO_SAVE_DEBOUNCE_MS);
  },

  markSaved: () => {
    set({ dirty: false, lastSavedAt: Date.now() });
    setDirtyFlag(null);
  },

  flushSave: async (bridgeSerialize) => {
    const projectId = get().currentProjectId;
    const meta = get().meta;
    if (!projectId || !meta) return;
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    // 이미 진행 중이면 fall-through (다음 markDirty의 debounce가 다시 트리거).
    if (_saving) return;
    _saving = true;
    try {
      // bridge 동기 호출 (베이스 페이즈 종료 시 history → projectStore sync).
      if (bridgeSerialize) bridgeSerialize();
      const state = get();
      if (!state.meta || state.currentProjectId !== projectId) return;
      const full: FullProject = {
        meta: { ...state.meta, updatedAt: Date.now() },
        basePhase: state.basePhase,
        directionsPhase: state.directionsPhase,
        animationsPhase: state.animationsPhase,
      };
      // ImageData → Blob 변환 (transaction 외부, await OK).
      const serialized = await serializeProject(full);
      // Transaction (내부에 await 없음 — C3).
      await dbSaveProject(serialized);
      if (get().currentProjectId === projectId) {
        set({
          meta: { ...full.meta },
          dirty: false,
          lastSavedAt: Date.now(),
        });
        setDirtyFlag(null);
      }
    } finally {
      _saving = false;
    }
  },

  reset: () => {
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    set({
      currentProjectId: null,
      meta: null,
      basePhase: INITIAL_BASE,
      directionsPhase: INITIAL_DIRECTIONS,
      animationsPhase: INITIAL_ANIMATIONS,
      dirty: false,
      lastSavedAt: 0,
    });
  },
}));

export const _testHelpers = {
  AUTO_SAVE_DEBOUNCE_MS,
  DIRTY_FLAG_KEY,
  resetTimer: () => {
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    _saving = false;
  },
};

export { DEFAULT_META };
