/**
 * ImageData를 PNG 파일로 다운로드.
 * 투명 배경 유지, 원본 해상도 그대로.
 */
export function downloadPng(
  imageData: ImageData,
  filename?: string
): void {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.putImageData(imageData, 0, 0);

  const defaultName = `pixeler_${imageData.width}x${imageData.height}_${formatDate()}.png`;

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? defaultName;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

function formatDate(): string {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** ImageData에 불투명 픽셀이 있는지 확인 */
export function hasContent(imageData: ImageData): boolean {
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] > 0) return true;
  }
  return false;
}
