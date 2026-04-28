/**
 * ImageData ↔ Blob 변환 + 프로젝트 직렬화.
 *
 * **C3 강제**: `serializeProject`는 transaction 시작 *전*에 await로 모든 Blob 변환을 완료한다.
 * `db.saveProject`는 SerializedProject만 받으며, transaction 콜백 내부에는 await가 없다.
 */

import type {
  FullProject,
  SerializedProject,
  SerializedBaseSprite,
  SerializedDirectionSprite,
  SerializedAnimationClip,
  SerializedAnimationFrame,
  DirKey,
  AnimationFrame,
} from "./types";

/**
 * ImageData → PNG Blob.
 *
 * - 일반 환경 (브라우저/Tauri): `OffscreenCanvas` 또는 `HTMLCanvasElement`.toBlob 사용.
 * - 테스트 환경 (jsdom): canvas.toBlob이 없을 수 있어 fallback으로 raw RGBA Blob 생성.
 *   해당 fallback은 `blobToImageData`가 raw 헤더를 인식하여 역변환할 수 있도록 magic header 사용.
 */
export async function imageDataToBlob(img: ImageData): Promise<Blob> {
  // 1) 모던 브라우저: OffscreenCanvas
  if (typeof OffscreenCanvas !== "undefined") {
    try {
      const oc = new OffscreenCanvas(img.width, img.height);
      const ctx = oc.getContext("2d");
      if (ctx) {
        ctx.putImageData(img, 0, 0);
        return await oc.convertToBlob({ type: "image/png" });
      }
    } catch {
      // fall through
    }
  }

  // 2) DOM canvas
  if (typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx && typeof canvas.toBlob === "function") {
        ctx.putImageData(img, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (blob) return blob;
      }
    } catch {
      // fall through
    }
  }

  // 3) Fallback: raw RGBA buffer (테스트 환경 호환 — magic prefix로 식별)
  return rawImageDataToBlob(img);
}

/**
 * Blob → ImageData. raw 폴백 형식을 우선 검사하고, 그 외에는 createImageBitmap → canvas.
 */
export async function blobToImageData(blob: Blob): Promise<ImageData> {
  // raw fallback 우선 (테스트 환경).
  // 일부 jsdom 환경에서 fake-indexeddb를 거치며 blob.slice가 제대로 동작 안 할 수 있어 try/catch.
  try {
    if (typeof blob.slice === "function") {
      const head = await blob.slice(0, RAW_HEADER.length).text();
      if (head === RAW_HEADER) {
        return await rawBlobToImageData(blob);
      }
    } else {
      // slice 없이 arrayBuffer를 직접 검사 (fallback).
      const buf = await blob.arrayBuffer();
      const head = new TextDecoder().decode(buf.slice(0, RAW_HEADER.length));
      if (head === RAW_HEADER) {
        return await rawBlobToImageData(blob);
      }
    }
  } catch {
    // slice/arrayBuffer 실패 — PNG 경로로 fall through.
  }

  // PNG → createImageBitmap → canvas → getImageData
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const w = bitmap.width;
    const h = bitmap.height;
    if (typeof OffscreenCanvas !== "undefined") {
      const oc = new OffscreenCanvas(w, h);
      const ctx = oc.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, w, h);
      }
    }
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, w, h);
      }
    }
  }

  throw new Error("blobToImageData: 환경에서 디코딩 경로를 찾을 수 없음");
}

const RAW_HEADER = "PIXELER_RAW_RGBA_V1\n";

async function rawImageDataToBlob(img: ImageData): Promise<Blob> {
  // 헤더 + width(4) + height(4) + RGBA bytes
  const header = new TextEncoder().encode(
    `${RAW_HEADER}${img.width},${img.height}\n`
  );
  const blob = new Blob([header, img.data.buffer as ArrayBuffer], {
    type: "application/octet-stream",
  });
  return blob;
}

async function rawBlobToImageData(blob: Blob): Promise<ImageData> {
  const buf = await blob.arrayBuffer();
  const text = new TextDecoder().decode(buf.slice(0, 64));
  const lines = text.split("\n");
  if (lines[0] !== RAW_HEADER.replace(/\n$/, "")) {
    throw new Error("rawBlobToImageData: invalid header");
  }
  const dimsLine = lines[1];
  const [wStr, hStr] = dimsLine.split(",");
  const width = parseInt(wStr, 10);
  const height = parseInt(hStr, 10);
  // raw 데이터 시작 오프셋 = 헤더 + dims + 두 번째 \n
  const headerByteLen =
    RAW_HEADER.length + dimsLine.length + 1; // 두 번째 \n
  const rgba = new Uint8ClampedArray(buf.slice(headerByteLen));
  return new ImageData(rgba, width, height);
}

/**
 * `FullProject` → `SerializedProject`. 모든 ImageData를 Blob으로 일괄 변환 (병렬).
 * **반드시 transaction 시작 전에 호출** — C3.
 */
export async function serializeProject(
  full: FullProject
): Promise<SerializedProject> {
  const baseSpritesPromise = Promise.all(
    full.basePhase.sprites.map(async (s): Promise<SerializedBaseSprite> => ({
      id: s.id,
      imageDataBlob: await imageDataToBlob(s.imageData),
      rawBase64: s.rawBase64,
      palette: s.palette,
      prompt: s.prompt,
      thumbnail: s.thumbnail,
      parentId: s.parentId,
      type: s.type,
      timestamp: s.timestamp,
    }))
  );

  const dirEntries: Array<
    Promise<{ direction: DirKey } & SerializedDirectionSprite>
  > = [];
  for (const dirKey of Object.keys(full.directionsPhase.sprites) as DirKey[]) {
    const sprite = full.directionsPhase.sprites[dirKey];
    if (!sprite) continue;
    dirEntries.push(
      (async () => ({
        direction: dirKey,
        imageDataBlob: await imageDataToBlob(sprite.imageData),
        rawBase64: sprite.rawBase64,
        palette: sprite.palette,
        sourceCellRect: sprite.sourceCellRect,
      }))()
    );
  }

  const animations: SerializedAnimationClip[] = [];
  const framePromises: Array<Promise<SerializedAnimationFrame>> = [];
  for (const dirKey of Object.keys(full.animationsPhase.byDirection) as DirKey[]) {
    const perDir = full.animationsPhase.byDirection[dirKey];
    if (!perDir) continue;
    for (const clip of perDir.animations) {
      animations.push({
        id: clip.id,
        projectId: full.meta.id,
        direction: dirKey,
        name: clip.name,
        presetKey: clip.presetKey ?? null,
        descriptor: clip.descriptor,
        fps: clip.fps,
        createdAt: clip.frames.length > 0 ? Date.now() : Date.now(),
      });
      clip.frames.forEach((frame: AnimationFrame, idx) => {
        framePromises.push(
          (async (): Promise<SerializedAnimationFrame> => ({
            id: `${clip.id}_${idx}`,
            animationId: clip.id,
            projectId: full.meta.id,
            frameIndex: idx,
            imageDataBlob: await imageDataToBlob(frame.imageData),
            rawBase64: frame.rawBase64,
            palette: frame.palette,
          }))()
        );
      });
    }
  }

  const [baseSprites, directionSprites, frames] = await Promise.all([
    baseSpritesPromise,
    Promise.all(dirEntries),
    Promise.all(framePromises),
  ]);

  return {
    meta: full.meta,
    baseSprites,
    baseActiveSpriteId: full.basePhase.activeSpriteId,
    directionSprites,
    directionMode: full.directionsPhase.mode,
    directionSheetRawBase64: full.directionsPhase.sheetRawBase64,
    animations,
    frames,
  };
}

/**
 * `SerializedProject` → `FullProject`. Blob을 ImageData로 역변환.
 */
export async function deserializeProject(
  s: SerializedProject
): Promise<FullProject> {
  const baseSprites = await Promise.all(
    s.baseSprites.map(async (sb) => ({
      id: sb.id,
      imageData: await blobToImageData(sb.imageDataBlob),
      rawBase64: sb.rawBase64,
      palette: sb.palette,
      prompt: sb.prompt,
      thumbnail: sb.thumbnail,
      parentId: sb.parentId,
      type: sb.type,
      timestamp: sb.timestamp,
    }))
  );

  const dirSprites: Partial<
    Record<DirKey, import("./types").DirectionSprite>
  > = {};
  await Promise.all(
    s.directionSprites.map(async (d) => {
      dirSprites[d.direction] = {
        imageData: await blobToImageData(d.imageDataBlob),
        rawBase64: d.rawBase64,
        palette: d.palette,
        sourceCellRect: d.sourceCellRect,
      };
    })
  );

  const byDirection: import("./types").AnimationsPhaseState["byDirection"] = {};
  for (const clip of s.animations) {
    if (!byDirection[clip.direction]) {
      byDirection[clip.direction] = { animations: [] };
    }
    const clipFrames = s.frames
      .filter((f) => f.animationId === clip.id)
      .sort((a, b) => a.frameIndex - b.frameIndex);
    const frames: AnimationFrame[] = [];
    for (const f of clipFrames) {
      frames.push({
        imageData: await blobToImageData(f.imageDataBlob),
        rawBase64: f.rawBase64,
        palette: f.palette,
      });
    }
    byDirection[clip.direction]!.animations.push({
      id: clip.id,
      name: clip.name,
      presetKey: clip.presetKey,
      descriptor: clip.descriptor,
      fps: clip.fps,
      frames,
    });
  }

  return {
    meta: s.meta,
    basePhase: {
      activeSpriteId: s.baseActiveSpriteId,
      sprites: baseSprites,
    },
    directionsPhase: {
      mode: s.directionMode,
      sheetRawBase64: s.directionSheetRawBase64,
      sprites: dirSprites,
    },
    animationsPhase: {
      byDirection,
    },
  };
}
