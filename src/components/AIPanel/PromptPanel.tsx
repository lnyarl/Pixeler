import { useState as useLocalState, useEffect, useRef } from "react";
import { useGenerationStore } from "@/stores/generationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { useHistoryStore } from "@/stores/historyStore";
import { createAdapter } from "@/services/ai/adapterFactory";
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import { base64ToImageData, imageDataToBase64 } from "@/utils/imageConvert";
import { compositeWithMask } from "@/utils/compositeWithMask";
import type { GeneratedImage } from "@/services/ai/types";

let devCounter = 0;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export interface ProcessedDraft {
  draft: GeneratedImage;
  imageData: ImageData;
  historyId: string;
  thumbnail: string;
  /** AI 원본 이미지 (후처리 전) — DEV 모드 비교용 */
  rawBase64: string;
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
  const historyItems = useHistoryStore((s) => s.items);
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);

  const maskData = useCanvasStore((s) => s.maskData);
  const clearMask = useCanvasStore((s) => s.clearMask);
  const canvasData = getCanvasImageData();
  const hasCanvasContent = canvasData !== null && hasVisiblePixels(canvasData);
  const hasMask = maskData !== null;

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

      if (hasMask && hasCanvasContent && adapter.inpaint) {
        // 마스크 있음 → inpainting
        const { buildGeneratePrompt } = await import("@/services/ai/promptBuilder");
        const inpaintPrompt = buildGeneratePrompt(prompt, width, height, viewType);

        console.log("[Pixeler] 부분 수정 요청:", {
          userPrompt: prompt,
          finalPrompt: inpaintPrompt,
          provider: selectedProvider,
          hasMask: true,
        });

        const imageBase64 = imageDataToBase64(canvasData!);
        const maskBase64 = imageDataToBase64(maskData!);

        const result = await adapter.inpaint({
          prompt: inpaintPrompt,
          image: imageBase64,
          mask: maskBase64,
          width,
          height,
          signal: controller.signal,
        });

        const rawImageData = await base64ToImageData(result.base64);
        const processed = runPostProcess(rawImageData, {
          targetWidth: width,
          targetHeight: height,
          providerType: selectedProvider,
          paletteSize,
        });
        const composited = compositeWithMask(canvasData!, processed, maskData!);

        onImageReady(composited);

        const thumbnail = imageDataToBase64(composited);
        const currentActiveId = useHistoryStore.getState().activeItemId;
        addHistoryItem({
          prompt: `[부분 수정] ${prompt}`,
          thumbnail,
          imageData: composited,
          type: "inpaint",
          parentId: currentActiveId,
          rawBase64: result.base64,
        });

        clearMask();
        setPrompt("");
        setDrafts([]);
        return;
      } else if (hasCanvasContent && adapter.regenerateWithFeedback) {
        // 이전 대화 맥락 구성 (최근 5개까지)
        const recentHistory = historyItems
          .slice(0, 5)
          .reverse()
          .map((h) => h.prompt)
          .join(" → ");

        const { buildFeedbackPrompt } = await import("@/services/ai/promptBuilder");
        console.log("[Pixeler] 수정 생성 요청:", {
          userPrompt: prompt,
          originalPrompt: recentHistory,
          finalPrompt: buildFeedbackPrompt(recentHistory, prompt, width, height, viewType),
          provider: selectedProvider,
          hasReferenceImage: true,
        });

        const referenceBase64 = imageDataToBase64(canvasData!);
        results = await adapter.regenerateWithFeedback({
          prompt,
          originalPrompt: recentHistory,
          referenceImage: referenceBase64,
          width,
          height,
          viewType,
          signal: controller.signal,
        });
      } else {
        const { buildGeneratePrompt } = await import("@/services/ai/promptBuilder");
        console.log("[Pixeler] 새 생성 요청:", {
          userPrompt: prompt,
          finalPrompt: buildGeneratePrompt(prompt, width, height, viewType),
          provider: selectedProvider,
          count,
        });

        results = await adapter.generate({
          prompt,
          width,
          height,
          viewType,
          count,
          signal: controller.signal,
        });
      }

      // parentId를 store에서 직접 읽어 stale closure 방지
      const currentActiveId = useHistoryStore.getState().activeItemId;
      const parentId = hasCanvasContent ? currentActiveId : null;
      const historyType = hasCanvasContent ? "feedback" : "generate";

      // 후처리
      const processedImages = await Promise.all(
        results.map(async (result) => {
          const rawImageData = await base64ToImageData(result.base64);
          const imageData = runPostProcess(rawImageData, {
            targetWidth: width,
            targetHeight: height,
            providerType: selectedProvider,
            paletteSize,
          });
          return { draft: result, imageData };
        })
      );

      // 1장이면 먼저 캔버스에 로드 (undo 스택에 이전 activeItemId 저장)
      if (processedImages.length === 1) {
        onImageReady(processedImages[0].imageData);
      }

      // 히스토리에 저장 (activeItemId가 이미 갱신된 후)
      const processed: ProcessedDraft[] = processedImages.map((item) => {
        const thumbnail = imageDataToBase64(item.imageData);
        const historyId = addHistoryItem({
          prompt,
          thumbnail,
          imageData: item.imageData,
          type: historyType,
          parentId,
          rawBase64: item.draft.base64,
        });
        return { ...item, historyId, thumbnail, rawBase64: item.draft.base64 };
      });

      setDrafts(results);
      onDraftsReady?.(processed);

      // 성공 후 프롬프트 초기화
      setPrompt("");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
    }
  }

  /** DEV: AI 호출 없이 순차 더미 이미지 생성 */
  function handleSkip() {
    devCounter++;
    const imgData = new ImageData(width, height);
    // 왼쪽 위부터 devCounter개의 점을 색을 바꿔가며 찍기
    const totalPixels = width * height;
    const pixelCount = Math.min(devCounter, totalPixels);
    for (let p = 0; p < pixelCount; p++) {
      const idx = p * 4;
      // HSL 기반으로 색 순환 (골든 앵글)
      const hue = (p * 137.508) % 360;
      const [r, g, b] = hslToRgb(hue, 80, 60);
      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = 255;
    }

    // store에서 직접 읽어 stale closure 방지
    const currentActiveId = useHistoryStore.getState().activeItemId;
    const canvasData2 = getCanvasImageData();
    const hasContent = canvasData2 !== null && hasVisiblePixels(canvasData2);
    const parentId = hasContent ? currentActiveId : null;

    console.log("[Pixeler DEV] 스킵 생성:", {
      prompt: prompt || "[DEV] 더미 이미지",
      hasContent,
      activeItemId: currentActiveId,
      parentId,
    });
    // onImageReady를 먼저 호출 → loadImageData에서 이전 activeItemId를 undo 스택에 저장
    onImageReady(imgData);

    const thumbnail = imageDataToBase64(imgData);
    const historyType = hasContent ? "feedback" : "generate";
    const historyId = addHistoryItem({
      prompt: prompt || "[DEV] 더미 이미지",
      thumbnail,
      imageData: imgData,
      type: historyType,
      parentId,
    });

    onDraftsReady?.([{ draft: { base64: thumbnail, metadata: { provider: "dev", model: "mock", prompt: prompt || "dev", timestamp: Date.now() } }, imageData: imgData, historyId, thumbnail, rawBase64: thumbnail }]);
    setPrompt("");
  }

  const buttonLabel = hasMask ? "부분 수정" : hasCanvasContent ? "수정 생성" : "생성";
  const currentApiKey = apiKeys[selectedProvider];

  return (
    <div className="flex flex-col gap-2">
      {!currentApiKey && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded p-2 text-xs text-yellow-300">
          API 키가 설정되지 않았습니다. 우측 상단 ⚙ 버튼에서 설정해주세요.
        </div>
      )}
      <label className="text-xs text-gray-400 font-medium">프롬프트</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            handleGenerate();
          }
        }}
        placeholder={
          hasMask
            ? "마스크 영역을 어떻게 수정할지 설명하세요... (Ctrl+Enter)"
            : hasCanvasContent
              ? "현재 이미지를 참조하여 수정합니다... (Ctrl+Enter)"
              : "만들고 싶은 스프라이트를 설명하세요... (Ctrl+Enter)"
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

      {hasMask && (
        <p className="text-xs text-purple-400">
          🎭 마스크 영역만 AI가 수정합니다
        </p>
      )}
      {hasCanvasContent && !hasMask && (
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
        <div className="flex gap-1">
          <button
            onClick={handleGenerate}
            className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
              hasMask
                ? "bg-purple-700 text-white hover:bg-purple-600"
                : hasCanvasContent
                  ? "bg-green-700 text-white hover:bg-green-600"
                  : "bg-blue-600 text-white hover:bg-blue-500"
            }`}
          >
            {buttonLabel}
          </button>
          {import.meta.env.DEV && (
            <button
              onClick={handleSkip}
              className="px-3 py-2 text-sm bg-yellow-800 text-yellow-200 rounded hover:bg-yellow-700 transition-colors"
              title="AI 호출 없이 더미 이미지로 테스트"
            >
              DEV
            </button>
          )}
        </div>
      )}

      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <ElapsedTime />
        </div>
      )}
    </div>
  );
}

/** 경과 시간 표시 */
function ElapsedTime() {
  const [seconds, setSeconds] = useLocalState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span>생성 중... {seconds}초</span>;
}

/** ImageData에 불투명 픽셀이 하나라도 있는지 확인 */
function hasVisiblePixels(imageData: ImageData): boolean {
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] > 0) return true;
  }
  return false;
}
