/**
 * historyStore ↔ projectStore bridge (단방향, §4.3.1).
 *
 * 규칙:
 * - **historyStore = 베이스 페이즈 UI source of truth**.
 * - addItem / removeItem / setActiveItemId → bridge가 `projectStore.markDirty()`만 호출.
 *   즉, projectStore.basePhase.sprites는 즉시 변하지 않는다.
 * - 페이즈 종료 / 자동 저장 시 1회 `serializeHistoryToProject()` 호출 → projectStore.basePhase 갱신.
 *
 * 단방향이라 cycle 자체가 형성되지 않는다 (W13).
 */

import type { HistoryItem } from "@/stores/historyStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { extractPaletteFromImageData } from "@/utils/extractPalette";
import type { BaseSprite } from "@/services/persistence/types";

/**
 * BaseSprite[] → HistoryItem[] (replaceAll 입력 준비).
 * palette 필드는 drop.
 */
export function baseSpritesToHistoryItems(
  sprites: BaseSprite[]
): HistoryItem[] {
  return sprites.map((s) => ({
    id: s.id,
    prompt: s.prompt,
    thumbnail: s.thumbnail,
    imageData: s.imageData,
    timestamp: s.timestamp,
    type: s.type,
    parentId: s.parentId,
    rawBase64: s.rawBase64,
  }));
}

/**
 * HistoryItem[] → BaseSprite[] (페이즈 종료 직렬화).
 * palette는 새로 추출 (extractPaletteFromImageData).
 *
 * paletteSize는 settingsStore.paletteSize 사용. 설정값이 0이면 16 폴백.
 */
export function historyItemsToBaseSprites(
  items: HistoryItem[],
  paletteSize: number
): BaseSprite[] {
  return items.map((item) => ({
    id: item.id,
    imageData: item.imageData,
    rawBase64: item.rawBase64,
    palette: extractPaletteFromImageData(item.imageData, paletteSize || 16),
    prompt: item.prompt,
    thumbnail: item.thumbnail,
    parentId: item.parentId,
    type: item.type,
    timestamp: item.timestamp,
  }));
}

/**
 * 베이스 페이즈 진입 시 호출 — projectStore의 basePhase.sprites를 historyStore에 주입.
 */
export function loadBasePhaseToHistory(): void {
  const projectState = useProjectStore.getState();
  const items = baseSpritesToHistoryItems(projectState.basePhase.sprites);
  useHistoryStore
    .getState()
    .replaceAll(items, projectState.basePhase.activeSpriteId);
}

/**
 * 베이스 페이즈 종료 / flushSave 시점에 호출 (sync).
 * historyStore.items + activeItemId를 projectStore.basePhase에 1회 옮긴다.
 *
 * **C2 강제**: bridge는 historyStore만 read하고 projectStore에만 write. reverse-sync 없음.
 */
export function serializeHistoryToProject(): void {
  const historyState = useHistoryStore.getState();
  const settingsState = useSettingsStore.getState();
  const sprites = historyItemsToBaseSprites(
    historyState.items,
    settingsState.paletteSize ?? 16
  );
  useProjectStore
    .getState()
    .replaceBaseSprites(sprites, historyState.activeItemId);
}
