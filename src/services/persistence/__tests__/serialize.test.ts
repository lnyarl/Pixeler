/**
 * serialize 라운드트립 + C3 검증 (모든 imageData가 Blob, transaction 외부 await).
 */

import { describe, it, expect } from "vitest";
import {
  imageDataToBlob,
  blobToImageData,
  serializeProject,
  deserializeProject,
} from "../serialize";
import type { FullProject } from "../types";

function makeImageData(
  w: number,
  h: number,
  fillRgba: [number, number, number, number]
): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = fillRgba[0];
    data[i * 4 + 1] = fillRgba[1];
    data[i * 4 + 2] = fillRgba[2];
    data[i * 4 + 3] = fillRgba[3];
  }
  return new ImageData(data, w, h);
}

describe("serialize / blob 변환", () => {
  it("ImageData → Blob → ImageData 라운드트립 (raw fallback 경로)", async () => {
    const src = makeImageData(4, 4, [10, 20, 30, 200]);
    const blob = await imageDataToBlob(src);
    expect(blob).toBeInstanceOf(Blob);
    const back = await blobToImageData(blob);
    expect(back.width).toBe(4);
    expect(back.height).toBe(4);
    // 모든 픽셀의 RGBA 일치.
    for (let i = 0; i < src.data.length; i++) {
      expect(back.data[i]).toBe(src.data[i]);
    }
  });

  it("serializeProject 결과의 모든 imageData 필드가 Blob 인스턴스", async () => {
    const full: FullProject = {
      meta: {
        id: "p1",
        name: "test",
        width: 16,
        height: 16,
        createdAt: 0,
        updatedAt: 0,
        lastPhase: "base",
        directionMode: 4,
        thumbnailBase64: null,
      },
      basePhase: {
        activeSpriteId: "s1",
        sprites: [
          {
            id: "s1",
            imageData: makeImageData(16, 16, [255, 0, 0, 255]),
            palette: [],
            prompt: "p",
            thumbnail: "",
            parentId: null,
            type: "generate",
            timestamp: 0,
          },
          {
            id: "s2",
            imageData: makeImageData(16, 16, [0, 255, 0, 255]),
            palette: [],
            prompt: "p2",
            thumbnail: "",
            parentId: "s1",
            type: "generate",
            timestamp: 0,
          },
        ],
      },
      directionsPhase: {
        mode: 4,
        sprites: {
          N: {
            imageData: makeImageData(16, 16, [0, 0, 255, 255]),
            palette: [],
          },
        },
      },
      animationsPhase: {
        byDirection: {
          N: {
            animations: [
              {
                id: "anim1",
                name: "idle",
                presetKey: "idle",
                descriptor: "",
                fps: 4,
                frames: [
                  {
                    imageData: makeImageData(16, 16, [128, 128, 128, 255]),
                    palette: [],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    const serialized = await serializeProject(full);
    expect(serialized.baseSprites).toHaveLength(2);
    for (const s of serialized.baseSprites) {
      expect(s.imageDataBlob).toBeInstanceOf(Blob);
    }
    expect(serialized.directionSprites).toHaveLength(1);
    expect(serialized.directionSprites[0].imageDataBlob).toBeInstanceOf(Blob);
    expect(serialized.frames).toHaveLength(1);
    expect(serialized.frames[0].imageDataBlob).toBeInstanceOf(Blob);
    expect(serialized.animations).toHaveLength(1);
    expect(serialized.baseActiveSpriteId).toBe("s1");
    expect(serialized.directionMode).toBe(4);
  });

  it("serializeProject → deserializeProject 라운드트립", async () => {
    const full: FullProject = {
      meta: {
        id: "p2",
        name: "rt",
        width: 4,
        height: 4,
        createdAt: 1,
        updatedAt: 2,
        lastPhase: "base",
        directionMode: 8,
        thumbnailBase64: null,
      },
      basePhase: {
        activeSpriteId: "s1",
        sprites: [
          {
            id: "s1",
            imageData: makeImageData(4, 4, [10, 20, 30, 255]),
            palette: [[10, 20, 30]],
            prompt: "p",
            thumbnail: "",
            parentId: null,
            type: "generate",
            timestamp: 5,
          },
        ],
      },
      directionsPhase: { mode: 8, sprites: {} },
      animationsPhase: { byDirection: {} },
    };

    const serialized = await serializeProject(full);
    const back = await deserializeProject(serialized);
    expect(back.meta.id).toBe("p2");
    expect(back.meta.directionMode).toBe(8);
    expect(back.basePhase.sprites).toHaveLength(1);
    expect(back.basePhase.sprites[0].imageData.width).toBe(4);
    expect(back.basePhase.sprites[0].imageData.data[0]).toBe(10);
    expect(back.basePhase.activeSpriteId).toBe("s1");
  });
});
