/**
 * 프로젝트 영속성 타입.
 *
 * - `FullProject`: in-memory 형태 (ImageData 보유). projectStore가 사용.
 * - `SerializedProject`: IndexedDB 입출력 형태 (Blob 보유). transaction에 await 없이
 *   동기 put을 위해 변환은 transaction 시작 전에 완료되어야 함 (C3).
 */

import type { HistoryItem } from "@/stores/historyStore";

export type DirKey =
  | "N"
  | "NE"
  | "E"
  | "SE"
  | "S"
  | "SW"
  | "W"
  | "NW";

export type DirectionMode = 4 | 8;

export type AnimationPresetKey = "idle" | "idle_wind" | "walk" | "attack";

export type LastPhase = "base" | "directions" | "animations" | "export";

export type RGB = readonly [number, number, number];

export interface ProjectMeta {
  id: string;
  name: string;
  width: number;
  height: number;
  createdAt: number;
  updatedAt: number;
  lastPhase: LastPhase;
  directionMode: DirectionMode;
  /** 애니메이션 페이즈에서 마지막으로 활성화된 방향 (m2 — 복원용) */
  lastAnimationDirection?: DirKey;
  /** 허브 카드용 썸네일 (베이스 활성 sprite) — base64 (작은 데이터) */
  thumbnailBase64: string | null;
}

/**
 * 베이스 페이즈 sprite (= historyItem 호환 + palette 추가).
 * imageData/rawBase64는 in-memory 형태에서만 보유.
 */
export interface BaseSprite {
  id: string;
  imageData: ImageData;
  rawBase64?: string;
  palette: RGB[];
  prompt: string;
  thumbnail: string;
  parentId: string | null;
  type: "generate" | "feedback" | "inpaint";
  timestamp: number;
}

/** 베이스 페이즈 sprite — 직렬화 형태 (Blob) */
export interface SerializedBaseSprite {
  id: string;
  imageDataBlob: Blob;
  rawBase64?: string;
  palette: RGB[];
  prompt: string;
  thumbnail: string;
  parentId: string | null;
  type: "generate" | "feedback" | "inpaint";
  timestamp: number;
}

export interface DirectionSprite {
  imageData: ImageData;
  rawBase64?: string;
  palette: RGB[];
  /** 시트에서 분할된 셀의 좌표 (재분할 디버그용) */
  sourceCellRect?: { x: number; y: number; width: number; height: number };
}

export interface SerializedDirectionSprite {
  imageDataBlob: Blob;
  rawBase64?: string;
  palette: RGB[];
  sourceCellRect?: { x: number; y: number; width: number; height: number };
}

/** 베이스 페이즈 — in-memory */
export interface BasePhaseState {
  activeSpriteId: string | null;
  sprites: BaseSprite[];
}

/** 방향 페이즈 — in-memory (PR-α: placeholder) */
export interface DirectionsPhaseState {
  mode: DirectionMode;
  /** AI가 만든 원본 시트 (재분할 디버그용) */
  sheetRawBase64?: string;
  sprites: Partial<Record<DirKey, DirectionSprite>>;
}

export interface AnimationFrame {
  imageData: ImageData;
  rawBase64?: string;
  palette: RGB[];
}

export interface SerializedAnimationFrame {
  id: string;
  animationId: string;
  projectId: string;
  frameIndex: number;
  imageDataBlob: Blob;
  rawBase64?: string;
  palette: RGB[];
}

export interface AnimationClip {
  id: string;
  name: string;
  presetKey?: AnimationPresetKey | null;
  descriptor: string;
  fps: number;
  frames: AnimationFrame[];
}

export interface SerializedAnimationClip {
  id: string;
  projectId: string;
  direction: DirKey;
  name: string;
  presetKey?: AnimationPresetKey | null;
  descriptor: string;
  fps: number;
  createdAt: number;
}

export interface AnimationsPerDirection {
  animations: AnimationClip[];
}

/** 애니메이션 페이즈 — in-memory (PR-α: placeholder) */
export interface AnimationsPhaseState {
  byDirection: Partial<Record<DirKey, AnimationsPerDirection>>;
}

/**
 * In-memory 프로젝트 전체 (ImageData 보유).
 * collectFullProject(state)로 projectStore에서 추출.
 */
export interface FullProject {
  meta: ProjectMeta;
  basePhase: BasePhaseState;
  directionsPhase: DirectionsPhaseState;
  animationsPhase: AnimationsPhaseState;
}

/**
 * 직렬화 완료된 프로젝트 (transaction 입력 형태). 모든 ImageData가 Blob.
 * `serializeProject(full)`로 변환. C3 강제: db.saveProject는 SerializedProject만 받음.
 */
export interface SerializedProject {
  meta: ProjectMeta;
  baseSprites: SerializedBaseSprite[];
  baseActiveSpriteId: string | null;
  directionSprites: Array<{ direction: DirKey } & SerializedDirectionSprite>;
  directionMode: DirectionMode;
  directionSheetRawBase64?: string;
  animations: SerializedAnimationClip[];
  frames: SerializedAnimationFrame[];
}

/** 허브 목록용 메타 요약 */
export type ProjectSummary = ProjectMeta;

/** historyItem ↔ BaseSprite 호환 헬퍼 타입 */
export type BaseHistoryItem = HistoryItem;
