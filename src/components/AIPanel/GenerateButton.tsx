import { useGenerationStore } from "@/stores/generationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { createAdapter } from "@/services/ai/adapterFactory";
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import { base64ToImageData } from "@/utils/imageConvert";
import type { GeneratedImage } from "@/services/ai/types";

/** 후처리된 ImageData를 draft와 함께 보관 */
export interface ProcessedDraft {
  draft: GeneratedImage;
  imageData: ImageData;
}

interface GenerateButtonProps {
  onImageReady: (imageData: ImageData) => void;
  onDraftsReady?: (drafts: ProcessedDraft[]) => void;
}

export default function GenerateButton({
  onImageReady,
  onDraftsReady,
}: GenerateButtonProps) {
  const status = useGenerationStore((s) => s.status);
  const prompt = useGenerationStore((s) => s.prompt);
  const count = useGenerationStore((s) => s.count);
  const startGeneration = useGenerationStore((s) => s.startGeneration);
  const setDrafts = useGenerationStore((s) => s.setDrafts);
  const setError = useGenerationStore((s) => s.setError);
  const cancel = useGenerationStore((s) => s.cancel);

  const selectedProvider = useSettingsStore((s) => s.selectedProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const viewType = useSettingsStore((s) => s.viewType);

  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);

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
      const results = await adapter.generate({
        prompt,
        width,
        height,
        viewType,
        count,
        signal: controller.signal,
      });

      // 비동기 후처리
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

      // 1장이면 바로 캔버스에 로드
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

  if (status === "loading") {
    return (
      <button
        onClick={cancel}
        className="w-full px-3 py-2 text-sm bg-red-700 text-white rounded hover:bg-red-600 transition-colors"
      >
        취소
      </button>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
    >
      생성
    </button>
  );
}
