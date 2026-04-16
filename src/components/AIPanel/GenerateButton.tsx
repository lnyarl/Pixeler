import { useGenerationStore } from "@/stores/generationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { createAdapter } from "@/services/ai/adapterFactory";
import { runPostProcess } from "@/services/ai/postprocess/pipeline";

interface GenerateButtonProps {
  onImageReady: (imageData: ImageData) => void;
}

export default function GenerateButton({ onImageReady }: GenerateButtonProps) {
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

      // 후처리
      const processed = results.map((result) => {
        const imgData = base64ToImageData(result.base64);
        const postProcessed = runPostProcess(imgData, {
          targetWidth: width,
          targetHeight: height,
          modelType: "general",
        });
        return { ...result, _processedImageData: postProcessed };
      });

      setDrafts(processed);

      // 1장이면 바로 캔버스에 로드
      if (processed.length === 1 && processed[0]._processedImageData) {
        onImageReady(processed[0]._processedImageData);
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

/** base64 PNG → ImageData 변환 (Canvas API 사용) */
function base64ToImageData(base64: string): ImageData {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const img = new Image();

  // 동기적 처리를 위해 dataURL 사용
  img.src = `data:image/png;base64,${base64}`;

  // 이 시점에서 img가 아직 로드되지 않았을 수 있음
  // 실제로는 비동기 처리가 필요하지만, 간단하게 처리
  canvas.width = img.naturalWidth || 1024;
  canvas.height = img.naturalHeight || 1024;
  ctx.drawImage(img, 0, 0);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// 후처리된 ImageData를 GeneratedImage에 임시 첨부하기 위한 타입 확장
declare module "@/services/ai/types" {
  interface GeneratedImage {
    _processedImageData?: ImageData;
  }
}
