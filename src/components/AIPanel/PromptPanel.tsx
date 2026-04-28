import { useState as useLocalState, useEffect, useRef } from "react";
import { useGenerationStore } from "@/stores/generationStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useDebugLogStore } from "@/stores/debugLogStore";
import { useCanvasHandleStore } from "@/stores/canvasHandleStore";
import { StabilityAdapter } from "@/services/ai/providers/stability";
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import {
  buildGeneratePrompt,
  buildFeedbackPrompt,
  buildMaskedFeedbackPrompt,
} from "@/services/ai/promptBuilder";
import { base64ToImageData, imageDataToBase64 } from "@/utils/imageConvert";
import { overlayMaskOnImage } from "@/utils/overlayMask";
import type { GeneratedImage } from "@/services/ai/types";

let devCounter = 0;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export interface ProcessedDraft {
  draft: GeneratedImage;
  imageData: ImageData;
  historyId: string;
  thumbnail: string;
  rawBase64: string;
}

interface PromptPanelProps {
  onDraftsReady?: (drafts: ProcessedDraft[]) => void;
}

export default function PromptPanel({ onDraftsReady }: PromptPanelProps) {
  const getImageData = useCanvasHandleStore((s) => s.getImageData);
  const loadImageData = useCanvasHandleStore((s) => s.loadImageData);
  const status = useGenerationStore((s) => s.status);
  const prompt = useGenerationStore((s) => s.prompt);
  const count = useGenerationStore((s) => s.count);
  const setPrompt = useGenerationStore((s) => s.setPrompt);
  const setCount = useGenerationStore((s) => s.setCount);
  const startGeneration = useGenerationStore((s) => s.startGeneration);
  const setDrafts = useGenerationStore((s) => s.setDrafts);
  const setError = useGenerationStore((s) => s.setError);
  const cancel = useGenerationStore((s) => s.cancel);

  const apiKey = useSettingsStore((s) => s.apiKey);
  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const requireEdges = useSettingsStore((s) => s.requireEdges);
  const postProcess = useSettingsStore((s) => s.postProcess);
  const addHistoryItem = useHistoryStore((s) => s.addItem);
  const historyItems = useHistoryStore((s) => s.items);
  const width = useCanvasStore((s) => s.width);
  const height = useCanvasStore((s) => s.height);

  const maskData = useCanvasStore((s) => s.maskData);
  const clearMask = useCanvasStore((s) => s.clearMask);
  const canvasData = getImageData();
  const hasCanvasContent = canvasData !== null && hasVisiblePixels(canvasData);
  const hasMask = maskData !== null;

  const startLog = useDebugLogStore((s) => s.startEntry);
  const updateLog = useDebugLogStore((s) => s.updateEntry);

  /** 이전 대화 맥락 (최근 5개 프롬프트 체인) */
  function buildRecentHistory(): string {
    return historyItems
      .slice(0, 5)
      .reverse()
      .map((h) => h.prompt)
      .join(" → ");
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("프롬프트를 입력해주세요.");
      return;
    }

    if (!apiKey) {
      setError("API 키를 설정해주세요. (설정 버튼 ⚙)");
      return;
    }

    const controller = startGeneration();
    const startTime = Date.now();

    try {
      const adapter = new StabilityAdapter(apiKey);
      let results: GeneratedImage[];

      if (hasMask && hasCanvasContent && adapter.regenerateWithFeedback) {
        // === 부분 수정 (마스크 오버레이 + img2img) ===
        const recentHistory = buildRecentHistory();
        const finalPrompt = buildMaskedFeedbackPrompt(
          recentHistory,
          prompt,
          width,
          height,
          paletteSize,
          requireEdges
        );

        // 참조 이미지에 마스크를 반투명 빨강으로 오버레이
        const overlaidImage = overlayMaskOnImage(canvasData!, maskData!);
        const referenceBase64 = imageDataToBase64(overlaidImage);
        const maskBase64 = imageDataToBase64(maskData!);

        const logId = startLog({
          mode: "inpaint",
          userPrompt: prompt,
          finalPrompt,
          referenceImage: referenceBase64,
          maskImage: maskBase64,
          meta: {
            provider: "stability",
            width,
            height,
            paletteSize,
          },
        });

        try {
          const maskResults = await adapter.regenerateWithFeedback({
            prompt,
            originalPrompt: recentHistory,
            referenceImage: referenceBase64,
            width,
            height,
            paletteSize,
            requireEdges,
            masked: true,
            signal: controller.signal,
          });

          updateLog(logId, {
            rawOutput: maskResults[0]?.base64,
            meta: { durationMs: Date.now() - startTime },
          });
          await finalizeResults(maskResults, "inpaint", logId);
          clearMask();
        } catch (err) {
          updateLog(logId, {
            error: err instanceof Error ? err.message : String(err),
            meta: { durationMs: Date.now() - startTime },
          });
          throw err;
        }
        return;
      } else if (hasCanvasContent && adapter.regenerateWithFeedback) {
        // === 수정 생성 (참조 이미지 + 텍스트) ===
        const recentHistory = buildRecentHistory();
        const finalPrompt = buildFeedbackPrompt(
          recentHistory,
          prompt,
          width,
          height,
          paletteSize,
          requireEdges
        );
        const referenceBase64 = imageDataToBase64(canvasData!);

        const logId = startLog({
          mode: "feedback",
          userPrompt: prompt,
          finalPrompt,
          referenceImage: referenceBase64,
          meta: {
            provider: "stability",
            width,
            height,
            paletteSize,
          },
        });

        try {
          results = await adapter.regenerateWithFeedback({
            prompt,
            originalPrompt: recentHistory,
            referenceImage: referenceBase64,
            width,
            height,
            paletteSize,
            requireEdges,
            signal: controller.signal,
          });
          // 첫 결과를 로그에 기록 (1장 기준, 다중일 때는 첫 장만)
          updateLog(logId, {
            rawOutput: results[0]?.base64,
            meta: { durationMs: Date.now() - startTime },
          });
          await finalizeResults(results, "feedback", logId);
        } catch (err) {
          updateLog(logId, {
            error: err instanceof Error ? err.message : String(err),
            meta: { durationMs: Date.now() - startTime },
          });
          throw err;
        }
        return;
      } else {
        // === 새 생성 (텍스트만) ===
        const finalPrompt = buildGeneratePrompt(
          prompt,
          width,
          height,
          paletteSize,
          requireEdges
        );

        const logId = startLog({
          mode: "generate",
          userPrompt: prompt,
          finalPrompt,
          meta: {
            provider: "stability",
            width,
            height,
            paletteSize,
            count,
          },
        });

        try {
          results = await adapter.generate({
            prompt,
            width,
            height,
            count,
            paletteSize,
            requireEdges,
            signal: controller.signal,
          });
          updateLog(logId, {
            rawOutput: results[0]?.base64,
            meta: { durationMs: Date.now() - startTime },
          });
          await finalizeResults(results, "generate", logId);
        } catch (err) {
          updateLog(logId, {
            error: err instanceof Error ? err.message : String(err),
            meta: { durationMs: Date.now() - startTime },
          });
          throw err;
        }
        return;
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
    }
  }

  /** 후처리 + 캔버스 로드 + 히스토리 저장 (generate/feedback/inpaint 공용) */
  async function finalizeResults(
    results: GeneratedImage[],
    historyType: "generate" | "feedback" | "inpaint",
    logId: string
  ) {
    const currentActiveId = useHistoryStore.getState().activeItemId;
    const parentId = hasCanvasContent ? currentActiveId : null;

    const processedImages = await Promise.all(
      results.map(async (result) => {
        const rawImageData = await base64ToImageData(result.base64);
        const imageData: ImageData = await runPostProcess(rawImageData, {
          targetWidth: width,
          targetHeight: height,
          paletteSize,
          config: postProcess,
        });
        return { draft: result, imageData };
      })
    );

    if (processedImages.length > 0) {
      updateLog(logId, {
        processedOutput: imageDataToBase64(processedImages[0].imageData),
      });
    }

    if (processedImages.length === 1) {
      loadImageData(processedImages[0].imageData);
    }

    const historyPromptLabel =
      historyType === "inpaint" ? `[부분 수정] ${prompt}` : prompt;

    const processed: ProcessedDraft[] = processedImages.map((item) => {
      const thumbnail = imageDataToBase64(item.imageData);
      const historyId = addHistoryItem({
        prompt: historyPromptLabel,
        thumbnail,
        imageData: item.imageData,
        type: historyType,
        parentId,
        rawBase64: item.draft.base64,
      });
      return {
        ...item,
        historyId,
        thumbnail,
        rawBase64: item.draft.base64,
      };
    });

    setDrafts(results);
    onDraftsReady?.(processed);
    setPrompt("");
  }

  /** DEV: AI 호출 없이 순차 더미 이미지 생성 */
  function handleSkip() {
    devCounter++;
    const imgData = new ImageData(width, height);
    const totalPixels = width * height;
    const pixelCount = Math.min(devCounter, totalPixels);
    for (let p = 0; p < pixelCount; p++) {
      const idx = p * 4;
      const hue = (p * 137.508) % 360;
      const [r, g, b] = hslToRgb(hue, 80, 60);
      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = 255;
    }

    const currentActiveId = useHistoryStore.getState().activeItemId;
    const canvasData2 = getImageData();
    const hasContent = canvasData2 !== null && hasVisiblePixels(canvasData2);
    const parentId = hasContent ? currentActiveId : null;
    const thumbnail = imageDataToBase64(imgData);
    const historyType = hasContent ? "feedback" : "generate";

    startLog({
      mode: "dev-skip",
      userPrompt: prompt || "[DEV] 더미 이미지",
      finalPrompt: prompt || "[DEV] 더미 이미지",
      processedOutput: thumbnail,
      meta: {
        provider: "dev",
        width,
        height,
        durationMs: 0,
      },
    });

    loadImageData(imgData);

    const historyId = addHistoryItem({
      prompt: prompt || "[DEV] 더미 이미지",
      thumbnail,
      imageData: imgData,
      type: historyType,
      parentId,
    });

    onDraftsReady?.([
      {
        draft: {
          base64: thumbnail,
          metadata: {
            provider: "dev",
            model: "mock",
            prompt: prompt || "dev",
            timestamp: Date.now(),
          },
        },
        imageData: imgData,
        historyId,
        thumbnail,
        rawBase64: thumbnail,
      },
    ]);
    setPrompt("");
  }

  const buttonLabel = hasMask ? "부분 수정" : hasCanvasContent ? "수정 생성" : "생성";
  const currentApiKey = apiKey;

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
          🎭 마스크 영역을 주목하여 수정 — 주변도 자연스럽게 바뀔 수 있음
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

function hasVisiblePixels(imageData: ImageData): boolean {
  for (let i = 3; i < imageData.data.length; i += 4) {
    if (imageData.data[i] > 0) return true;
  }
  return false;
}
