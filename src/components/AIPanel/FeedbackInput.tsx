import { useState } from "react";
import { useGenerationStore } from "@/stores/generationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { useHistoryStore } from "@/stores/historyStore";
import { createAdapter } from "@/services/ai/adapterFactory";
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import { base64ToImageData, imageDataToBase64 } from "@/utils/imageConvert";

interface FeedbackInputProps {
  /** 현재 캔버스의 ImageData를 가져오는 함수 */
  getCanvasImageData: () => ImageData | null;
  onImageReady: (imageData: ImageData) => void;
}

export default function FeedbackInput({
  getCanvasImageData,
  onImageReady,
}: FeedbackInputProps) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const prompt = useGenerationStore((s) => s.prompt);
  const selectedProvider = useSettingsStore((s) => s.selectedProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const viewType = useSettingsStore((s) => s.viewType);
  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);
  const addHistoryItem = useHistoryStore((s) => s.addItem);

  async function handleFeedback() {
    if (!feedback.trim()) {
      setError("피드백을 입력해주세요.");
      return;
    }

    const canvasData = getCanvasImageData();
    if (!canvasData) {
      setError("캔버스에 이미지가 없습니다. 먼저 생성해주세요.");
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

      if (!adapter.regenerateWithFeedback) {
        setError("현재 AI 제공자는 피드백 재생성을 지원하지 않습니다.");
        setLoading(false);
        return;
      }

      const referenceBase64 = imageDataToBase64(canvasData);
      const results = await adapter.regenerateWithFeedback({
        prompt: feedback,
        originalPrompt: prompt,
        referenceImage: referenceBase64,
        width,
        height,
        viewType,
      } as Parameters<typeof adapter.regenerateWithFeedback>[0]);

      if (results.length > 0) {
        const rawImageData = await base64ToImageData(results[0].base64);
        const processed = runPostProcess(rawImageData, {
          targetWidth: width,
          targetHeight: height,
          providerType: selectedProvider,
          paletteSize,
        });

        addHistoryItem({
          prompt: `[피드백] ${feedback}`,
          thumbnail: results[0].base64,
          imageData: processed,
          type: "feedback",
        });

        onImageReady(processed);
        setFeedback("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-gray-400 font-medium">수정 요청</label>
      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="수정하고 싶은 부분을 설명하세요..."
        rows={2}
        className="px-2 py-1.5 text-sm bg-gray-700 rounded border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
      />
      <button
        onClick={handleFeedback}
        disabled={loading}
        className={`w-full px-3 py-1.5 text-xs rounded transition-colors ${
          loading
            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
            : "bg-green-700 text-white hover:bg-green-600"
        }`}
      >
        {loading ? "수정 중..." : "수정 요청"}
      </button>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
