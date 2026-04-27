/**
 * 면적평균 다운스케일.
 *
 * 1순위 구현: OffscreenCanvas + createImageBitmap + drawImage
 *           (imageSmoothingEnabled=true, quality='high'). 브라우저 bilinear/bicubic으로
 *           면적평균 효과. 비정수 비율도 drawImage가 정확히 처리.
 *
 * 폴백: OffscreenCanvas/createImageBitmap 미지원 환경(jsdom 등)에서 영역 적분 평균을
 *      직접 계산. nearest 폴백은 사용하지 않음 (기획서 §5 / NF9 / M6).
 *
 * 알파 처리: drawImage는 premultiplied alpha로 평균하므로 alpha=0 픽셀의 RGB는 가중치 0.
 *           즉 호출 전에 Step A'(transparentBg 1차)로 alpha를 0/255 이진화한 입력에서는
 *           가장자리 픽셀 RGB가 배경색으로 오염되지 않는다. boxAverage 자체는 별도의
 *           premultiplied/unpremultiplied 변환을 하지 않으며, 폴백도 동일한 의미론을
 *           유지하기 위해 RGB 합산 시 alpha를 가중치로 사용한다.
 *
 * 입력 해상도와 출력 해상도가 동일하면 입력을 그대로 반환 (참조 동일).
 */
export async function boxAverage(
  src: ImageData,
  targetWidth: number,
  targetHeight: number
): Promise<ImageData> {
  if (src.width === targetWidth && src.height === targetHeight) {
    return src;
  }

  // OffscreenCanvas 미지원(테스트 jsdom 등) → 폴백
  if (
    typeof OffscreenCanvas === "undefined" ||
    typeof createImageBitmap === "undefined"
  ) {
    return boxAverageFallback(src, targetWidth, targetHeight);
  }

  const srcBitmap = await createImageBitmap(src);
  const canvas = new OffscreenCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // 컨텍스트 획득 실패 시 폴백
    srcBitmap.close();
    return boxAverageFallback(src, targetWidth, targetHeight);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(srcBitmap, 0, 0, src.width, src.height, 0, 0, targetWidth, targetHeight);
  srcBitmap.close();

  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

/**
 * OffscreenCanvas 미지원 환경 전용 폴백.
 *
 * 알고리즘: 출력 픽셀 (x, y)가 커버하는 입력의 연속 영역
 *          [x*ratioX, (x+1)*ratioX) × [y*ratioY, (y+1)*ratioY)을
 *          픽셀 단위 면적 가중치로 적분 평균한다.
 *
 *          - 비정수 비율도 분수 가중치로 정확히 처리 (M6 / NF9).
 *          - RGB는 premultiplied alpha 의미론을 따라 alpha를 가중치로 합산한 뒤
 *            unpremultiply한다. 이로써 alpha=0 픽셀의 RGB가 결과를 오염시키지 않아
 *            OffscreenCanvas drawImage와 동일한 가장자리 동작을 모사.
 *          - alpha 자체는 단순 면적 가중 평균.
 */
function boxAverageFallback(
  src: ImageData,
  targetWidth: number,
  targetHeight: number
): ImageData {
  const dst = new ImageData(targetWidth, targetHeight);
  const ratioX = src.width / targetWidth;
  const ratioY = src.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    const sy0 = y * ratioY;
    const sy1 = (y + 1) * ratioY;
    const iy0 = Math.floor(sy0);
    const iy1 = Math.min(src.height, Math.ceil(sy1));

    for (let x = 0; x < targetWidth; x++) {
      const sx0 = x * ratioX;
      const sx1 = (x + 1) * ratioX;
      const ix0 = Math.floor(sx0);
      const ix1 = Math.min(src.width, Math.ceil(sx1));

      let sumPR = 0; // premultiplied R 누적
      let sumPG = 0;
      let sumPB = 0;
      let sumA = 0; // alpha × area 누적
      let sumArea = 0;

      for (let by = iy0; by < iy1; by++) {
        // 현재 행이 (sy0, sy1) 영역에서 차지하는 세로 길이 (0~1 분수 가능)
        const yTop = Math.max(sy0, by);
        const yBot = Math.min(sy1, by + 1);
        const yFrac = yBot - yTop;
        if (yFrac <= 0) continue;

        for (let bx = ix0; bx < ix1; bx++) {
          const xLeft = Math.max(sx0, bx);
          const xRight = Math.min(sx1, bx + 1);
          const xFrac = xRight - xLeft;
          if (xFrac <= 0) continue;

          const area = xFrac * yFrac;
          const idx = (by * src.width + bx) * 4;
          const r = src.data[idx];
          const g = src.data[idx + 1];
          const b = src.data[idx + 2];
          const a = src.data[idx + 3];
          // alpha는 0~255 정수. premultiplied 가중치는 (alpha/255) × area.
          // 합산 단계에서는 alpha 자체를 곱한 뒤 마지막에 정규화.
          const aw = a * area;
          sumPR += r * aw;
          sumPG += g * aw;
          sumPB += b * aw;
          sumA += aw;
          sumArea += area;
        }
      }

      const dstIdx = (y * targetWidth + x) * 4;
      // alpha 평균: sumA / sumArea / 255 의 역수가 아니라, alpha 0~255 평균이므로
      // alpha_avg = (sumA / sumArea). sumA는 alpha × area 합이므로 그냥 area로 나눔.
      const alphaAvg = sumArea > 0 ? sumA / sumArea : 0;

      if (sumA > 0) {
        // unpremultiply: 누적 RGB는 premultiplied weight로 가중되어 있어
        // sumA(=alpha × area의 합)로 나누면 정상 RGB 평균.
        dst.data[dstIdx] = Math.round(sumPR / sumA);
        dst.data[dstIdx + 1] = Math.round(sumPG / sumA);
        dst.data[dstIdx + 2] = Math.round(sumPB / sumA);
      } else {
        // 영역 내 모든 픽셀이 alpha=0 → RGB 결과는 0 (drawImage와 동일하게 의미 없는 RGB).
        dst.data[dstIdx] = 0;
        dst.data[dstIdx + 1] = 0;
        dst.data[dstIdx + 2] = 0;
      }
      dst.data[dstIdx + 3] = Math.round(alphaAvg);
    }
  }

  return dst;
}
