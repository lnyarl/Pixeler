/**
 * SheetGenerationPanel — 시트 생성 (1차 호출) + DEV 분기 (M4) 전용 패널.
 *
 * 셀별 재생성은 부모(DirectionsPhase)가 DirectionGrid에 직접 핸들러를 전달.
 *
 * - 시트 생성: baseSprite 기반 controlStructure → splitSheet → 후처리 → 4/8 방향 채움.
 * - DEV: 더미 시트 합성 (AI 호출 없음, M4).
 * - debugLog mode: direction-sheet (M8).
 */
import { useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDebugLogStore } from "@/stores/debugLogStore";
import { useHistoryStore } from "@/stores/historyStore";
import { createAdapter } from "@/services/ai/adapterFactory";
import { buildDirectionSheetPrompt } from "@/services/ai/promptBuilder/direction";
import { processSheetToDirections } from "@/services/ai/spriteSheet/processSheet";
import { buildDevDirectionSheet } from "@/services/ai/spriteSheet/devDummySheet";
import { extractPaletteFromImageData } from "@/utils/extractPalette";
import { prepareInputImageBase64 } from "@/services/ai/spriteSheet/prepareInputImage";
import { base64ToImageData, imageDataToBase64 } from "@/utils/imageConvert";

interface SheetGenerationPanelProps {
  busy: boolean;
  setBusy: (b: boolean) => void;
  userExtra: string;
  setUserExtra: (s: string) => void;
}

export default function SheetGenerationPanel({
  busy,
  setBusy,
  userExtra,
  setUserExtra,
}: SheetGenerationPanelProps) {
  const meta = useProjectStore((s) => s.meta);
  const directionsPhase = useProjectStore((s) => s.directionsPhase);
  const setDirectionSprite = useProjectStore((s) => s.setDirectionSprite);
  const setDirectionSheetRaw = useProjectStore((s) => s.setDirectionSheetRaw);
  const historyItems = useHistoryStore((s) => s.items);
  const historyActive = useHistoryStore((s) => s.activeItemId);

  const selectedProvider = useSettingsStore((s) => s.selectedProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const requireEdges = useSettingsStore((s) => s.requireEdges);
  const postProcess = useSettingsStore((s) => s.postProcess);

  const startLog = useDebugLogStore((s) => s.startEntry);
  const updateLog = useDebugLogStore((s) => s.updateEntry);

  const [error, setError] = useState<string | null>(null);

  const isDev = import.meta.env.DEV;

  function getBaseSprite(): {
    imageData: ImageData;
    prompt: string;
    palette: ReadonlyArray<readonly [number, number, number]>;
  } | null {
    const fromHist = historyItems.find((h) => h.id === historyActive);
    if (fromHist) {
      return {
        imageData: fromHist.imageData,
        prompt: fromHist.prompt || "the character shown in the reference image",
        palette: extractPaletteFromImageData(fromHist.imageData, paletteSize),
      };
    }
    const ps = useProjectStore.getState();
    const id = ps.basePhase.activeSpriteId;
    const item = ps.basePhase.sprites.find((s) => s.id === id);
    if (item) {
      return {
        imageData: item.imageData,
        prompt: item.prompt || "the character shown in the reference image",
        palette: item.palette,
      };
    }
    return null;
  }

  async function handleGenerateSheet() {
    if (!meta) return;
    const base = getBaseSprite();
    if (!base) {
      setError("베이스 sprite를 먼저 만드세요.");
      return;
    }
    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setError("API 키를 설정해주세요. (설정 ⚙)");
      return;
    }
    const adapter = createAdapter(selectedProvider, apiKey);
    if (
      !adapter.controlStructure ||
      !adapter.capabilities.supportsControlStructure
    ) {
      setError(
        `${adapter.name}는 시트 생성을 지원하지 않습니다 (Stability AI 사용).`
      );
      return;
    }

    setError(null);
    setBusy(true);
    const startTime = Date.now();

    const inputBase64 = prepareInputImageBase64(base.imageData);
    const finalPrompt = buildDirectionSheetPrompt({
      characterDescription: base.prompt,
      mode: directionsPhase.mode,
      basePalette: base.palette,
      userExtra: userExtra.trim() || undefined,
      width: meta.width,
      height: meta.height,
      paletteSize,
      requireEdges,
    });

    const logId = startLog({
      mode: "direction-sheet",
      userPrompt: userExtra,
      finalPrompt,
      referenceImage: inputBase64,
      meta: {
        provider: selectedProvider,
        width: meta.width,
        height: meta.height,
        paletteSize,
      },
    });

    try {
      const results = await adapter.controlStructure({
        inputImage: inputBase64,
        prompt: finalPrompt,
        controlStrength: 0.7,
      });
      const rawBase64 = results[0]?.base64;
      if (!rawBase64) throw new Error("Stability 응답이 비어있습니다.");

      const sheetImage = await base64ToImageData(rawBase64);
      const cells = await processSheetToDirections({
        sheet: sheetImage,
        mode: directionsPhase.mode,
        targetWidth: meta.width,
        targetHeight: meta.height,
        paletteSize,
        providerType: selectedProvider,
        postProcessConfig: postProcess,
      });
      cells.forEach(({ direction, sprite }) => {
        setDirectionSprite(direction, { ...sprite, rawBase64 });
      });
      setDirectionSheetRaw(rawBase64);
      updateLog(logId, {
        rawOutput: rawBase64,
        processedOutput:
          cells[0] && imageDataToBase64(cells[0].sprite.imageData),
        meta: { durationMs: Date.now() - startTime },
      });
    } catch (e) {
      updateLog(logId, {
        error: e instanceof Error ? e.message : String(e),
        meta: { durationMs: Date.now() - startTime },
      });
      setError(e instanceof Error ? e.message : "시트 생성에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  /** DEV 시트 생성 — AI 호출 없음 (M4). */
  async function handleDevGenerateSheet() {
    if (!meta) return;
    const base = getBaseSprite();
    if (!base) {
      setError("베이스 sprite를 먼저 만드세요.");
      return;
    }
    setError(null);
    setBusy(true);
    const startTime = Date.now();

    const finalPrompt = buildDirectionSheetPrompt({
      characterDescription: base.prompt,
      mode: directionsPhase.mode,
      basePalette: base.palette,
      userExtra: userExtra.trim() || undefined,
      width: meta.width,
      height: meta.height,
      paletteSize,
      requireEdges,
    });

    const logId = startLog({
      mode: "direction-sheet",
      userPrompt: userExtra,
      finalPrompt,
      meta: {
        provider: "dev",
        width: meta.width,
        height: meta.height,
        paletteSize,
      },
    });

    try {
      const sheet = buildDevDirectionSheet(base.imageData, directionsPhase.mode);
      const cells = await processSheetToDirections({
        sheet,
        mode: directionsPhase.mode,
        targetWidth: meta.width,
        targetHeight: meta.height,
        paletteSize,
        providerType: selectedProvider,
        postProcessConfig: postProcess,
      });
      cells.forEach(({ direction, sprite }) => {
        setDirectionSprite(direction, sprite);
      });
      updateLog(logId, {
        meta: { durationMs: Date.now() - startTime },
      });
    } catch (e) {
      updateLog(logId, {
        error: e instanceof Error ? e.message : String(e),
        meta: { durationMs: Date.now() - startTime },
      });
      setError(e instanceof Error ? e.message : "DEV 시트 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" data-testid="sheet-generation-panel">
      <textarea
        value={userExtra}
        onChange={(e) => setUserExtra(e.target.value)}
        placeholder="추가 설명 (선택, 예: wearing red cape)"
        className="bg-gray-800 text-gray-200 text-sm rounded p-2 resize-none"
        rows={2}
        data-testid="direction-prompt-extra"
        disabled={busy}
      />
      <div className="flex gap-2">
        <button
          onClick={handleGenerateSheet}
          disabled={busy}
          className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded text-white text-sm"
          data-testid="direction-generate-sheet"
        >
          {busy ? "생성 중..." : "시트 생성"}
        </button>
        {isDev && (
          <button
            onClick={handleDevGenerateSheet}
            disabled={busy}
            className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 disabled:bg-gray-700 rounded text-white text-sm font-mono"
            data-testid="direction-generate-dev"
            title="DEV: AI 호출 없이 더미 시트 합성"
          >
            DEV
          </button>
        )}
      </div>
      {error && (
        <div
          className="text-xs text-red-400 bg-red-950/30 rounded p-2"
          data-testid="direction-error"
        >
          {error}
        </div>
      )}
    </div>
  );
}
