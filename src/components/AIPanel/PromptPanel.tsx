import { useGenerationStore } from "@/stores/generationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { useHistoryStore } from "@/stores/historyStore";
import { createAdapter } from "@/services/ai/adapterFactory";
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import { base64ToImageData, imageDataToBase64 } from "@/utils/imageConvert";
import type { GeneratedImage } from "@/services/ai/types";

export interface ProcessedDraft {
  draft: GeneratedImage;
  imageData: ImageData;
}

interface PromptPanelProps {
  getCanvasImageData: () => ImageData | null;
  onImageReady: (imageData: ImageData) => void;
  onDraftsReady?: (drafts: ProcessedDraft[]) => void;
}

export default function PromptPanel({
  getCanvasImageData,
  onImageReady,
  onDraftsReady,
}: PromptPanelProps) {
  const status = useGenerationStore((s) => s.status);
  const prompt = useGenerationStore((s) => s.prompt);
  const count = useGenerationStore((s) => s.count);
  const setPrompt = useGenerationStore((s) => s.setPrompt);
  const setCount = useGenerationStore((s) => s.setCount);
  const startGeneration = useGenerationStore((s) => s.startGeneration);
  const setDrafts = useGenerationStore((s) => s.setDrafts);
  const setError = useGenerationStore((s) => s.setError);
  const cancel = useGenerationStore((s) => s.cancel);

  const selectedProvider = useSettingsStore((s) => s.selectedProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const viewType = useSettingsStore((s) => s.viewType);
  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const addHistoryItem = useHistoryStore((s) => s.addItem);
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);

  const canvasData = getCanvasImageData();
  const hasCanvasContent = canvasData !== null && hasVisiblePixels(canvasData);

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("프롬프트를 입력해주세요.");
      return;
    }

    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setError("API 키를 설정해주세요. (설정 버튼 ⚙)");
      return;
    }

    const controller = startGeneration();

    try {
      const adapter = createAdapter(selectedProvider, apiKey);
      let results: GeneratedImage[];

      if (hasCanvasContent && adapter.regenerateWithFeedback) {
        // 캔버스에 이미지가 있으면 참조 이미지로 첨부
        const referenceBase64 = imageDataToBase64(canvasData!);
        results = await adapter.regenerateWithFeedback({
          prompt,
          originalPrompt: "",
          referenceImage: referenceBase64,
          width,
          height,
          viewType,
          signal: controller.signal,
        });
      } else {
        // 캔버스가 비어있으면 텍스트만으로 생성
        results = await adapter.generate({
          prompt,
          width,
          height,
          viewType,
          count,
          signal: controller.signal,
        });
      }

      const processed: ProcessedDraft[] = await Promise.all(
        results.map(async (draft) => {
          const rawImageData = await base64ToImageData(draft.base64);
          const imageData = runPostProcess(rawImageData, {
            targetWidth: width,
            targetHeight: height,
            providerType: selectedProvider,
            paletteSize,
          });
          return { draft, imageData };
        })
      );

      setDrafts(results);
      onDraftsReady?.(processed);

      const historyType = hasCanvasContent ? "feedback" : "generate";
      for (const item of processed) {
        addHistoryItem({
          prompt,
          thumbnail: item.draft.base64,
          imageData: item.imageData,
          type: historyType,
        });
      }

      if (processed.length === 1) {
        onImageReady(processed[0].imageData);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
    }
  }

  const buttonLabel = hasCanvasContent ? "수정 생성" : "생성";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">프롬프트</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={
          hasCanvasContent
            ? "현재 이미지를 참조하여 수정합니다..."
            : "만들고 싶은 스프라이트를 설명하세요..."
        }
        rows={3}
        className="px-2 py-1.5 text-sm bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
      />

      {!hasCanvasContent && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">초안 수:</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-6 h-6 text-xs rounded transition-colors ${
                  count === n
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasCanvasContent && (
        <p className="text-xs text-gray-500">
          📎 현재 캔버스 이미지가 참조로 첨부됩니다
        </p>
      )}

      {status === "loading" ? (
        <button
          onClick={cancel}
          className="w-full px-3 py-2 text-sm bg-red-700 text-white rounded hover:bg-red-600 transition-colors"
        >
          취소
        </button>
      ) : (
        <button
          onClick={handleGenerate}
          className={`w-full px-3 py-2 text-sm rounded transition-colors ${
            hasCanvasContent
              ? "bg-green-700 text-white hover:bg-green-600"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {buttonLabel}
        </button>
      )}

      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>생성 중...</span>
        </div>
      )}
    </div>
  );
}

/** ImageData에 불투명 픽셀이 하나라도 있는지 확인 */
function hasVisiblePixels(imageData: ImageData): boolean {
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] > 0) return true;
  }
  return false;
}
