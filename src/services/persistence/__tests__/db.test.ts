/**
 * IndexedDB wrapper — open/save/get/delete + C3 검증.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  openDB,
  saveProject,
  getProject,
  getProjects,
  deleteProject,
  _resetDBForTesting,
} from "../db";
import { serializeProject } from "../serialize";
import type { FullProject } from "../types";

function makeImage(
  w: number,
  h: number,
  fill: [number, number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return new ImageData(data, w, h);
}

function makeFull(id: string): FullProject {
  return {
    meta: {
      id,
      name: `name-${id}`,
      width: 8,
      height: 8,
      createdAt: 1,
      updatedAt: 2,
      lastPhase: "base",
      directionMode: 4,
      thumbnailBase64: null,
    },
    basePhase: {
      activeSpriteId: "s1",
      sprites: [
        {
          id: "s1",
          imageData: makeImage(8, 8, [255, 0, 0, 255]),
          palette: [],
          prompt: "p",
          thumbnail: "",
          parentId: null,
          type: "generate",
          timestamp: 0,
        },
      ],
    },
    directionsPhase: { mode: 4, sprites: {} },
    animationsPhase: { byDirection: {} },
  };
}

describe("db wrapper (C3)", () => {
  beforeEach(() => {
    // 각 테스트마다 fresh fake IDB.
    globalThis.indexedDB = new IDBFactory();
    _resetDBForTesting();
  });

  it("openDB가 store를 생성한다", async () => {
    const db = await openDB();
    const names = Array.from(db.objectStoreNames);
    expect(names).toContain("projects");
    expect(names).toContain("sprites");
    expect(names).toContain("animations");
    expect(names).toContain("frames");
  });

  it("saveProject(SerializedProject) → getProject 라운드트립", async () => {
    const full = makeFull("p1");
    const serialized = await serializeProject(full);
    await saveProject(serialized);
    const back = await getProject("p1");
    expect(back).not.toBeNull();
    expect(back!.meta.id).toBe("p1");
    expect(back!.baseSprites).toHaveLength(1);
    // fake-indexeddb는 Blob 인스턴스를 그대로 보존하지 않을 수 있음 (structured clone 한계).
    // 적어도 imageDataBlob 필드 자체는 존재해야 함.
    expect(back!.baseSprites[0].imageDataBlob).toBeDefined();
    expect(back!.baseActiveSpriteId).toBe("s1");
  });

  it("getProjects는 메타 목록만 반환 (썸네일 포함)", async () => {
    const fullA = makeFull("pa");
    const fullB = makeFull("pb");
    await saveProject(await serializeProject(fullA));
    await saveProject(await serializeProject(fullB));
    const list = await getProjects();
    expect(list.length).toBeGreaterThanOrEqual(2);
    const ids = list.map((p) => p.id);
    expect(ids).toContain("pa");
    expect(ids).toContain("pb");
  });

  it("deleteProject은 프로젝트와 sprite 모두 제거", async () => {
    const full = makeFull("p2");
    await saveProject(await serializeProject(full));
    await deleteProject("p2");
    const back = await getProject("p2");
    expect(back).toBeNull();
  });

  it("동일 id로 saveProject 재호출 시 sprite를 중복 누적하지 않음", async () => {
    const full = makeFull("p3");
    await saveProject(await serializeProject(full));
    // 같은 sprite 1개만 다시 저장.
    await saveProject(await serializeProject(full));
    const back = await getProject("p3");
    expect(back!.baseSprites).toHaveLength(1);
  });

  it("[C3] saveProject 함수 본문에 await 없음 (transaction 외부 await 필요)", async () => {
    // 함수 소스 검사 — transaction 내부에 await가 없는지 정적 검사.
    const src = saveProject.toString();
    // saveProject는 openDB().then(...) 패턴. transaction 콜백 안에서는 동기 put만.
    // 함수 자체에는 then이 있을 수 있지만 await는 없어야 함.
    expect(/\bawait\b/.test(src)).toBe(false);
  });
});
