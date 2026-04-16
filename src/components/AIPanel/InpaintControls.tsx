import { useState } from "react";
import { useCanvasStore } from "@/stores/canvasStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useHistoryStore } from "@/stores/historyStore";
import { createAdapter } from "@/services/ai/adapterFactory";
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import { base64ToImageData, imageDataToBase64 } from "@/utils/imageConvert";
import { compositeWithMask } from "@/utils/compositeWithMask";
import { getProviderCapabilities } from "@/components/Settings/ProviderSelector";

interface InpaintControlsProps {
  getCanvasImageData: () => ImageData | null;
  onImageReady: (imageData: ImageData) => void;
}

export default function InpaintControls({
  getCanvasImageData,
  onImageReady,
}: InpaintControlsProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const maskData = useCanvasStore((s) => s.maskData);
  const clearMask = useCanvasStore((s) => s.clearMask);
  const currentTool = useCanvasStore((s) => s.currentTool);
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);

  const selectedProvider = useSettingsStore((s) => s.selectedProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const addHistoryItem = useHistoryStore((s) => s.addItem);
  const activeItemId = useHistoryStore((s) => s.activeItemId);

  const capabilities = getProviderCapabilities(selectedProvider);
  const hasMask = maskData !== null;
  const showControls = currentTool === "mask" || hasMask;

  if (!showControls) return null;
  if (!capabilities.supportsInpainting) {
    return (
      <p className="text-xs text-yellow-400">
        ⚠ 현재 AI 제공자는 부분 수정(inpainting)을 지원하지 않습니다.
      </p>
    );
  }

  async function handleInpaint() {
    if (!prompt.trim()) {
      setError("수정할 내용을 입력해주세요.");
      return;
    }
    if (!maskData) {
      setError("마스크 도구로 수정할 영역을 표시해주세요.");
      return;
    }
    const canvasData = getCanvasImageData();
    if (!canvasData) {
      setError("캔버스에 이미지가 없습니다.");
      return;
    }
    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setError("API 키를 설정해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const adapter = createAdapter(selectedProvider, apiKey);
      if (!adapter.inpaint) {
        setError("현재 제공자는 inpainting을 지원하지 않습니다.");
        setLoading(false);
        return;
      }

      const imageBase64 = imageDataToBase64(canvasData);
      const maskBase64 = imageDataToBase64(maskData);

      const result = await adapter.inpaint({
        prompt,
        image: imageBase64,
        mask: maskBase64,
        width,
        height,
      });

      const rawImageData = await base64ToImageData(result.base64);
      const processed = runPostProcess(rawImageData, {
        targetWidth: width,
        targetHeight: height,
        providerType: selectedProvider,
        paletteSize,
      });

      // 마스크 기반 합성: 마스킹 영역만 새 이미지, 나머지는 원본 유지
      const composited = compositeWithMask(canvasData, processed, maskData);

      addHistoryItem({
        prompt: `[부분 수정] ${prompt}`,
        thumbnail: result.base64,
        imageData: composited,
        type: "inpaint",
        parentId: activeItemId,
      });

      onImageReady(composited);
      clearMask();
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">
        부분 수정 (Inpainting)
      </label>
      {hasMask && (
        <>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="마스크된 영역을 어떻게 수정할지 설명하세요..."
            rows={2}
            className="px-2 py-1.5 text-sm bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          <div className="flex gap-1">
            <button
              onClick={handleInpaint}
              disabled={loading}
              className={`flex-1 px-3 py-1.5 text-xs rounded transition-colors ${
                loading
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-purple-700 text-white hover:bg-purple-600"
              }`}
            >
              {loading ? "수정 중..." : "부분 수정"}
            </button>
            <button
              onClick={clearMask}
              className="px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
            >
              마스크 지우기
            </button>
          </div>
        </>
      )}
      {!hasMask && (
        <p className="text-xs text-gray-500">
          마스크 도구로 수정할 영역을 표시하세요.
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
