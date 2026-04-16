/**
 * K-means 기반 팔레트 매핑.
 * 이미지의 색상 수를 targetColors개로 제한.
 * 안티앨리어싱 제거 효과도 포함 (모든 픽셀이 가장 가까운 팔레트 색으로 매핑되므로).
 */
export function paletteMap(
  src: ImageData,
  targetColors: number = 16
): ImageData {
  const dst = new ImageData(
    new Uint8ClampedArray(src.data),
    src.width,
    src.height
  );

  // 불투명 픽셀만 수집
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < src.data.length; i += 4) {
    if (src.data[i + 3] > 128) {
      pixels.push([src.data[i], src.data[i + 1], src.data[i + 2]]);
    }
  }

  // 거의 투명한 픽셀은 항상 완전 투명으로 처리
  for (let i = 0; i < dst.data.length; i += 4) {
    if (dst.data[i + 3] <= 128) {
      dst.data[i + 3] = 0;
    }
  }

  if (pixels.length === 0) return dst;

  // K-means 클러스터링으로 팔레트 추출
  const palette = kMeans(pixels, targetColors, 10);

  // 불투명 픽셀을 가장 가까운 팔레트 색으로 매핑
  for (let i = 0; i < dst.data.length; i += 4) {
    if (dst.data[i + 3] === 0) continue;

    const r = dst.data[i];
    const g = dst.data[i + 1];
    const b = dst.data[i + 2];

    const nearest = findNearest(r, g, b, palette);
    dst.data[i] = nearest[0];
    dst.data[i + 1] = nearest[1];
    dst.data[i + 2] = nearest[2];
    dst.data[i + 3] = 255;
  }

  return dst;
}

function kMeans(
  pixels: [number, number, number][],
  k: number,
  maxIter: number
): [number, number, number][] {
  // 초기 중심: 랜덤 샘플
  const centroids: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(pixels.length / k));
  for (let i = 0; i < k && i * step < pixels.length; i++) {
    centroids.push([...pixels[i * step]]);
  }

  for (let iter = 0; iter < maxIter; iter++) {
    // 각 픽셀을 가장 가까운 중심에 할당
    const clusters: [number, number, number][][] = centroids.map(() => []);

    for (const pixel of pixels) {
      let minDist = Infinity;
      let minIdx = 0;
      for (let j = 0; j < centroids.length; j++) {
        const dist = colorDist(pixel, centroids[j]);
        if (dist < minDist) {
          minDist = dist;
          minIdx = j;
        }
      }
      clusters[minIdx].push(pixel);
    }

    // 중심 업데이트
    let converged = true;
    for (let j = 0; j < centroids.length; j++) {
      if (clusters[j].length === 0) continue;
      const avg: [number, number, number] = [0, 0, 0];
      for (const p of clusters[j]) {
        avg[0] += p[0];
        avg[1] += p[1];
        avg[2] += p[2];
      }
      const newC: [number, number, number] = [
        Math.round(avg[0] / clusters[j].length),
        Math.round(avg[1] / clusters[j].length),
        Math.round(avg[2] / clusters[j].length),
      ];
      if (
        newC[0] !== centroids[j][0] ||
        newC[1] !== centroids[j][1] ||
        newC[2] !== centroids[j][2]
      ) {
        converged = false;
        centroids[j] = newC;
      }
    }

    if (converged) break;
  }

  return centroids;
}

function colorDist(
  a: [number, number, number],
  b: [number, number, number]
): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function findNearest(
  r: number,
  g: number,
  b: number,
  palette: [number, number, number][]
): [number, number, number] {
  let minDist = Infinity;
  let result = palette[0];
  for (const color of palette) {
    const dist = (r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2;
    if (dist < minDist) {
      minDist = dist;
      result = color;
    }
  }
  return result;
}
