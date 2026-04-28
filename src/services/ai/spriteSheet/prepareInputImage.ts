/**
 * prepareInputImage — ImageData를 1024×1024 nearest-neighbor 업스케일 후 base64 PNG.
 *
 * - 시트 호출/단일 셀 재생성 모두 동일 입력(1024) 사용 (M3 — 동일 후처리 보장).
 * - jsdom 환경에서는 canvas 미구현 — 단위 테스트는 직접 호출하지 않음.
 */

const TARGET = 1024;

export function prepareInputImageBase64(src: ImageData): string {
  const canvas = document.createElement("canvas");
  canvas.width = TARGET;
  canvas.height = TARGET;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("prepareInputImageBase64: canvas context unavailable");
  }
  ctx.imageSmoothingEnabled = false;

  // src를 임시 캔버스에 그린 뒤 nearest-neighbor 업스케일.
  const tmp = document.createElement("canvas");
  tmp.width = src.width;
  tmp.height = src.height;
  const tmpCtx = tmp.getContext("2d");
  if (!tmpCtx) throw new Error("prepareInputImageBase64: tmp ctx unavailable");
  tmpCtx.putImageData(src, 0, 0);

  ctx.clearRect(0, 0, TARGET, TARGET);
  ctx.drawImage(tmp, 0, 0, src.width, src.height, 0, 0, TARGET, TARGET);

  return canvas
    .toDataURL("image/png")
    .replace("data:image/png;base64,", "");
}
