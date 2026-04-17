import { useSettingsStore } from "@/stores/settingsStore";
import { paletteMap } from "@/services/ai/postprocess/paletteMap";
import { makeTransparentBackground } from "@/services/ai/postprocess/transparentBackground";

interface ApplyPostProcessProps {
  getCanvasImageData: () => ImageData | null;
  onImageReady: (imageData: ImageData) => void;
}

/**
 * 현재 캔버스 이미지에 후처리 단계를 수동 적용하는 도구.
 * 다운스케일은 이미 캔버스가 목표 해상도이므로 불필요.
 */
export default function ApplyPostProcess({
  getCanvasImageData,
  onImageReady,
}: ApplyPostProcessProps) {
  const paletteSize = useSettingsStore((s) => s.paletteSize);

  function applyTransparent() {
    const img = getCanvasImageData();
    if (!img) return;
    onImageReady(makeTransparentBackground(img));
  }

  function applyPalette() {
    const img = getCanvasImageData();
    if (!img) return;
    const size = paletteSize > 0 ? paletteSize : 16;
    onImageReady(paletteMap(img, size));
  }

  function applyAll() {
    const img = getCanvasImageData();
    if (!img) return;
    let result = makeTransparentBackground(img);
    const size = paletteSize > 0 ? paletteSize : 16;
    result = paletteMap(result, size);
    onImageReady(result);
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-gray-500">현재 캔버스에 후처리 적용</label>
      <div className="flex gap-1">
        <button
          onClick={applyTransparent}
          className="flex-1 px-2 py-1 text-[10px] bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          title="배경색을 투명으로"
        >
          투명화
        </button>
        <button
          onClick={applyPalette}
          className="flex-1 px-2 py-1 text-[10px] bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          title="팔레트 색상 수 제한"
        >
          팔레트
        </button>
        <button
          onClick={applyAll}
          className="flex-1 px-2 py-1 text-[10px] bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
          title="투명화 + 팔레트"
        >
          전체
        </button>
      </div>
    </div>
  );
}
