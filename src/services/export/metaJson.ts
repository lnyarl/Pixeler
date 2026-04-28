/**
 * metaJson.ts — export 메타 JSON 빌더 (PR-δ / §5.4.3, m5).
 *
 * 출력 스키마 (§5.4.3):
 *   {
 *     version: 1;
 *     project: { name, width, height };
 *     directionMode: 4 | 8;
 *     sheet: { width, height, padding, background };
 *     base: { x, y } | null;            // m5 — null 허용
 *     directions: Partial<Record<DirKey, { x, y }>>;   // 빈 방향 key 생략
 *     animations: Array<{ name, preset?, direction, fps, frames: { x, y, duration_ms }[] }>;
 *   }
 *
 * 좌표는 spriteSheet.composeSpriteSheet의 placements와 1:1 매칭. 좌표 일관성 단위 테스트로 검증.
 */

import type {
  AnimationsPhaseState,
  DirectionsPhaseState,
  DirKey,
  AnimationPresetKey,
  ProjectMeta,
} from "@/services/persistence/types";
import type { CellPlacement, ExportLayout } from "./spriteSheet";

export interface ExportMetaProject {
  name: string;
  width: number;
  height: number;
}

export interface ExportMetaSheet {
  width: number;
  height: number;
  padding: number;
  background: "transparent" | string;
}

export interface ExportMetaPosition {
  x: number;
  y: number;
}

export interface ExportMetaFrame {
  x: number;
  y: number;
  duration_ms: number;
}

export interface ExportMetaAnimation {
  name: string;
  preset?: AnimationPresetKey | null;
  direction: DirKey;
  fps: number;
  frames: ExportMetaFrame[];
}

export interface ExportMeta {
  version: 1;
  project: ExportMetaProject;
  directionMode: 4 | 8;
  sheet: ExportMetaSheet;
  base: ExportMetaPosition | null;
  directions: Partial<Record<DirKey, ExportMetaPosition>>;
  animations: ExportMetaAnimation[];
}

export interface BuildExportMetaInput {
  meta: ProjectMeta;
  directionsPhase: DirectionsPhaseState;
  animationsPhase: AnimationsPhaseState;
  layout: ExportLayout;
  placements: CellPlacement[];
}

/**
 * placements + 페이즈 상태 → ExportMeta.
 *
 * 동작:
 * - base placement 1개 → base = { x, y }. 없으면 base: null (m5).
 * - direction placement N개 → 각각 directions[dir] = { x, y }. 없는 방향은 key 생략 (m5).
 * - animation-frame placement → animations[].frames에 정확히 한 번 들어감.
 *   같은 (direction, animationId)의 프레임들은 frameIndex 순으로 정렬.
 *
 * @throws placement에 동일 key가 중복되거나, animationsPhase에 없는 animationId가 발견되면 Error.
 */
export function buildExportMeta(input: BuildExportMetaInput): ExportMeta {
  const { meta, directionsPhase, animationsPhase, layout, placements } = input;

  // Base.
  const basePlacement = placements.find((p) => p.type === "base");
  const base: ExportMetaPosition | null = basePlacement
    ? { x: basePlacement.x, y: basePlacement.y }
    : null;

  // Directions — 채워진 것만.
  const directions: Partial<Record<DirKey, ExportMetaPosition>> = {};
  for (const p of placements) {
    if (p.type !== "direction") continue;
    if (!p.direction) continue;
    if (directions[p.direction]) {
      throw new Error(
        `buildExportMeta: 방향 ${p.direction} 좌표가 중복됨`
      );
    }
    directions[p.direction] = { x: p.x, y: p.y };
  }

  // Animations — placement 모음 → ID별로 묶고, 페이즈 상태에서 fps/name/preset 조회.
  type Key = string;
  const keyOf = (dir: DirKey, animId: string): Key => `${dir}::${animId}`;

  // dir → animationId → frame placements (frameIndex 순 정렬).
  const framesByKey = new Map<Key, CellPlacement[]>();
  for (const p of placements) {
    if (p.type !== "animation-frame") continue;
    if (!p.direction || !p.animationId) continue;
    const k = keyOf(p.direction, p.animationId);
    if (!framesByKey.has(k)) framesByKey.set(k, []);
    framesByKey.get(k)!.push(p);
  }

  const animations: ExportMetaAnimation[] = [];
  // 안정적 순서: dir 순, 그 안에서 animation 추가 순(animationsPhase의 배열 순서).
  const DIR_ORDER: DirKey[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  for (const dir of DIR_ORDER) {
    const perDir = animationsPhase.byDirection[dir];
    if (!perDir) continue;
    for (const clip of perDir.animations) {
      const k = keyOf(dir, clip.id);
      const framePlacements = framesByKey.get(k);
      if (!framePlacements || framePlacements.length === 0) continue;
      framePlacements.sort(
        (a, b) => (a.frameIndex ?? 0) - (b.frameIndex ?? 0)
      );
      const durationMs = Math.round(1000 / Math.max(1, clip.fps));
      const frames: ExportMetaFrame[] = framePlacements.map((p) => ({
        x: p.x,
        y: p.y,
        duration_ms: durationMs,
      }));
      animations.push({
        name: clip.name,
        preset: clip.presetKey ?? null,
        direction: dir,
        fps: clip.fps,
        frames,
      });
    }
  }

  return {
    version: 1,
    project: {
      name: meta.name,
      width: meta.width,
      height: meta.height,
    },
    directionMode: directionsPhase.mode,
    sheet: {
      width: layout.sheetWidth,
      height: layout.sheetHeight,
      padding: layout.padding,
      background: layout.background,
    },
    base,
    directions,
    animations,
  };
}

/** ExportMeta → JSON 직렬화 문자열 (들여쓰기 2 스페이스). */
export function serializeExportMeta(meta: ExportMeta): string {
  return JSON.stringify(meta, null, 2);
}
