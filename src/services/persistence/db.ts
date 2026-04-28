/**
 * IndexedDB wrapper for Pixeler 프로젝트 영속성.
 *
 * **C3 강제**: `saveProject(p: SerializedProject)`는 SerializedProject(이미 Blob 형태)만 받는다.
 * 함수 본문에는 `await`가 없으며, transaction 콜백 안에서는 동기 put만 호출한다.
 * ImageData → Blob 변환은 호출자가 `serializeProject(full)`로 사전에 await 완료해야 한다.
 *
 * 의존성: 없음 (idb 패키지 미사용 — Tauri 마이그레이션 시 다른 storage로 갈아끼우기 쉽도록).
 */

import type {
  ProjectMeta,
  ProjectSummary,
  SerializedProject,
  SerializedBaseSprite,
  SerializedDirectionSprite,
  SerializedAnimationClip,
  SerializedAnimationFrame,
  DirKey,
} from "./types";

export const DB_NAME = "pixeler";
export const DB_VERSION = 1;

export const STORE_PROJECTS = "projects";
export const STORE_SPRITES = "sprites";
export const STORE_ANIMATIONS = "animations";
export const STORE_FRAMES = "frames";

/** Sprite store row 형태 (베이스/방향 통합) */
interface SpriteRow {
  id: string;
  projectId: string;
  kind: "base" | "direction";
  direction?: DirKey;
  imageDataBlob: Blob;
  rawBase64?: string;
  palette: number[][];
  prompt: string;
  thumbnail?: string;
  parentId: string | null;
  type: "generate" | "feedback" | "inpaint" | "direction-cell";
  timestamp: number;
  /** 방향 sprite의 분할 셀 좌표 (재분할 디버그용) */
  sourceCellRect?: { x: number; y: number; width: number; height: number };
}

/** Project store row (시트 raw도 함께 저장) */
interface ProjectRow extends ProjectMeta {
  /** 방향 페이즈의 AI 원본 시트 (재분할 디버그용) */
  directionSheetRawBase64?: string;
  baseActiveSpriteId: string | null;
}

let _db: IDBDatabase | null = null;

/**
 * DB 인스턴스 획득. 존재하지 않으면 onupgradeneeded로 store 생성.
 *
 * 주의: 캐시된 _db가 다른 IDBFactory(테스트 환경)에서 만들어진 경우
 * 트랜잭션 시도 시 InvalidStateError가 날 수 있어, factory 변화 시 자동 재open.
 */
export function openDB(): Promise<IDBDatabase> {
  if (_db) {
    // factory 검사 — 캐시된 db가 현재 indexedDB와 호환되는지.
    try {
      // 매우 가벼운 transaction 시도로 db 유효성 확인.
      _db.transaction(STORE_PROJECTS, "readonly");
      return Promise.resolve(_db);
    } catch {
      _db = null;
    }
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_SPRITES)) {
        const s = db.createObjectStore(STORE_SPRITES, { keyPath: "id" });
        s.createIndex("projectId", "projectId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_ANIMATIONS)) {
        const a = db.createObjectStore(STORE_ANIMATIONS, { keyPath: "id" });
        a.createIndex("projectId", "projectId", { unique: false });
        a.createIndex("direction", "direction", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_FRAMES)) {
        const f = db.createObjectStore(STORE_FRAMES, { keyPath: "id" });
        f.createIndex("animationId", "animationId", { unique: false });
        f.createIndex("projectId", "projectId", { unique: false });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

/** 테스트용 — 내부 캐시 리셋. */
export function _resetDBForTesting(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

function tx(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode
): IDBTransaction {
  return db.transaction(stores, mode);
}

function awaitRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function awaitTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * 모든 프로젝트 메타 목록을 반환 (썸네일 포함). 허브 카드용.
 */
export async function getProjects(): Promise<ProjectSummary[]> {
  const db = await openDB();
  const t = tx(db, [STORE_PROJECTS], "readonly");
  const store = t.objectStore(STORE_PROJECTS);
  const rows = await awaitRequest(store.getAll() as IDBRequest<ProjectRow[]>);
  rows.sort((a, b) => b.updatedAt - a.updatedAt);
  return rows.map((r) => stripProjectRow(r));
}

function stripProjectRow(r: ProjectRow): ProjectMeta {
  return {
    id: r.id,
    name: r.name,
    width: r.width,
    height: r.height,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    lastPhase: r.lastPhase,
    directionMode: r.directionMode,
    lastAnimationDirection: r.lastAnimationDirection,
    thumbnailBase64: r.thumbnailBase64,
  };
}

/**
 * 단일 프로젝트의 SerializedProject 형태로 로드. deserialize는 호출자 책임.
 */
export async function getProject(
  id: string
): Promise<SerializedProject | null> {
  const db = await openDB();
  const t = tx(
    db,
    [STORE_PROJECTS, STORE_SPRITES, STORE_ANIMATIONS, STORE_FRAMES],
    "readonly"
  );
  const projectsStore = t.objectStore(STORE_PROJECTS);
  const spritesStore = t.objectStore(STORE_SPRITES);
  const animationsStore = t.objectStore(STORE_ANIMATIONS);
  const framesStore = t.objectStore(STORE_FRAMES);

  const projectRow = await awaitRequest(
    projectsStore.get(id) as IDBRequest<ProjectRow | undefined>
  );
  if (!projectRow) return null;

  const sprites = await awaitRequest(
    spritesStore
      .index("projectId")
      .getAll(IDBKeyRange.only(id)) as IDBRequest<SpriteRow[]>
  );

  const animations = await awaitRequest(
    animationsStore
      .index("projectId")
      .getAll(IDBKeyRange.only(id)) as IDBRequest<SerializedAnimationClip[]>
  );

  const frames = await awaitRequest(
    framesStore
      .index("projectId")
      .getAll(IDBKeyRange.only(id)) as IDBRequest<SerializedAnimationFrame[]>
  );

  const baseSprites: SerializedBaseSprite[] = [];
  const directionSprites: Array<
    { direction: DirKey } & SerializedDirectionSprite
  > = [];
  for (const s of sprites) {
    if (s.kind === "base") {
      baseSprites.push({
        id: s.id,
        imageDataBlob: s.imageDataBlob,
        rawBase64: s.rawBase64,
        palette: s.palette as never,
        prompt: s.prompt,
        thumbnail: s.thumbnail ?? "",
        parentId: s.parentId,
        type:
          s.type === "direction-cell"
            ? "generate"
            : (s.type as "generate" | "feedback" | "inpaint"),
        timestamp: s.timestamp,
      });
    } else if (s.kind === "direction" && s.direction) {
      directionSprites.push({
        direction: s.direction,
        imageDataBlob: s.imageDataBlob,
        rawBase64: s.rawBase64,
        palette: s.palette as never,
        sourceCellRect: s.sourceCellRect,
      });
    }
  }

  return {
    meta: stripProjectRow(projectRow),
    baseSprites,
    baseActiveSpriteId: projectRow.baseActiveSpriteId,
    directionSprites,
    directionMode: projectRow.directionMode,
    directionSheetRawBase64: projectRow.directionSheetRawBase64,
    animations,
    frames,
  };
}

/**
 * 프로젝트 저장 (upsert).
 *
 * **C3 강제**:
 * - 입력은 SerializedProject (이미 Blob). FullProject 아님.
 * - 함수 본문에 await 없음. transaction 콜백 안에서는 동기 put만 호출.
 * - 단일 transaction에 4 store(projects/sprites/animations/frames)를 한 번에 write.
 * - 기존 sprite/animation/frame은 모두 삭제 후 재삽입 (단순화).
 */
export function saveProject(p: SerializedProject): Promise<void> {
  return openDB().then((db) => {
    const t = tx(
      db,
      [STORE_PROJECTS, STORE_SPRITES, STORE_ANIMATIONS, STORE_FRAMES],
      "readwrite"
    );
    const projectsStore = t.objectStore(STORE_PROJECTS);
    const spritesStore = t.objectStore(STORE_SPRITES);
    const animationsStore = t.objectStore(STORE_ANIMATIONS);
    const framesStore = t.objectStore(STORE_FRAMES);

    // 1) project row upsert
    const projectRow: ProjectRow = {
      ...p.meta,
      directionSheetRawBase64: p.directionSheetRawBase64,
      baseActiveSpriteId: p.baseActiveSpriteId,
    };
    projectsStore.put(projectRow);

    // 2) 기존 sprite/animation/frame 삭제 (cursor 기반 — index().openCursor)
    const projectId = p.meta.id;
    const spritesIndex = spritesStore.index("projectId");
    const spritesReq = spritesIndex.openCursor(IDBKeyRange.only(projectId));
    spritesReq.onsuccess = () => {
      const cursor = spritesReq.result;
      if (cursor) {
        spritesStore.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        // 삭제 완료 후 신규 sprite put
        for (const sb of p.baseSprites) {
          const row: SpriteRow = {
            id: sb.id,
            projectId,
            kind: "base",
            imageDataBlob: sb.imageDataBlob,
            rawBase64: sb.rawBase64,
            palette: sb.palette as never,
            prompt: sb.prompt,
            thumbnail: sb.thumbnail,
            parentId: sb.parentId,
            type: sb.type,
            timestamp: sb.timestamp,
          };
          spritesStore.put(row);
        }
        for (const ds of p.directionSprites) {
          const row: SpriteRow = {
            id: `${projectId}_dir_${ds.direction}`,
            projectId,
            kind: "direction",
            direction: ds.direction,
            imageDataBlob: ds.imageDataBlob,
            rawBase64: ds.rawBase64,
            palette: ds.palette as never,
            prompt: "",
            parentId: null,
            type: "direction-cell",
            timestamp: Date.now(),
            sourceCellRect: ds.sourceCellRect,
          };
          spritesStore.put(row);
        }
      }
    };

    const animationsIndex = animationsStore.index("projectId");
    const animationsReq = animationsIndex.openCursor(
      IDBKeyRange.only(projectId)
    );
    animationsReq.onsuccess = () => {
      const cursor = animationsReq.result;
      if (cursor) {
        animationsStore.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        for (const a of p.animations) animationsStore.put(a);
      }
    };

    const framesIndex = framesStore.index("projectId");
    const framesReq = framesIndex.openCursor(IDBKeyRange.only(projectId));
    framesReq.onsuccess = () => {
      const cursor = framesReq.result;
      if (cursor) {
        framesStore.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        for (const f of p.frames) framesStore.put(f);
      }
    };

    return awaitTransaction(t);
  });
}

/**
 * 프로젝트와 그 하위 sprite/animation/frame 모두 삭제.
 */
export function deleteProject(id: string): Promise<void> {
  return openDB().then((db) => {
    const t = tx(
      db,
      [STORE_PROJECTS, STORE_SPRITES, STORE_ANIMATIONS, STORE_FRAMES],
      "readwrite"
    );
    const projectsStore = t.objectStore(STORE_PROJECTS);
    const spritesStore = t.objectStore(STORE_SPRITES);
    const animationsStore = t.objectStore(STORE_ANIMATIONS);
    const framesStore = t.objectStore(STORE_FRAMES);

    projectsStore.delete(id);

    const spReq = spritesStore.index("projectId").openCursor(IDBKeyRange.only(id));
    spReq.onsuccess = () => {
      const c = spReq.result;
      if (c) {
        spritesStore.delete(c.primaryKey);
        c.continue();
      }
    };
    const anReq = animationsStore.index("projectId").openCursor(IDBKeyRange.only(id));
    anReq.onsuccess = () => {
      const c = anReq.result;
      if (c) {
        animationsStore.delete(c.primaryKey);
        c.continue();
      }
    };
    const frReq = framesStore.index("projectId").openCursor(IDBKeyRange.only(id));
    frReq.onsuccess = () => {
      const c = frReq.result;
      if (c) {
        framesStore.delete(c.primaryKey);
        c.continue();
      }
    };

    return awaitTransaction(t);
  });
}
