/**
 * DirectionsPhase — 방향 페이즈 본체 (§5.2 / β-F1~F13).
 *
 * - 좌측: 베이스 sprite 미리보기 (큰 사이즈, pixelated).
 * - 중앙: 방향 모드 토글 + DirectionGrid (4 또는 8 셀).
 * - 우측: SheetGenerationPanel + 셀 재생성 핸들러.
 * - 다음 페이즈 진입 조건: 1개 이상 방향 채워짐 (M2 — γ 채택).
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDebugLogStore } from "@/stores/debugLogStore";
import { createAdapter } from "@/services/ai/adapterFactory";
import { buildSingleDirectionPrompt } from "@/services/ai/promptBuilder/direction";
import { buildDevSingleDirectionSheet } from "@/services/ai/spriteSheet/devDummySheet";
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import { extractPaletteFromImageData } from "@/utils/extractPalette";
import { prepareInputImageBase64 } from "@/services/ai/spriteSheet/prepareInputImage";
import { base64ToImageData, imageDataToBase64 } from "@/utils/imageConvert";
import type { DirKey } from "@/services/persistence/types";
import DirectionModeToggle from "./DirectionModeToggle";
import DirectionGrid from "./DirectionGrid";
import SheetGenerationPanel from "./SheetGenerationPanel";

export default function DirectionsPhase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meta = useProjectStore((s) => s.meta);
  const directionsPhase = useProjectStore((s) => s.directionsPhase);
  const setDirectionSprite = useProjectStore((s) => s.setDirectionSprite);
  const clearDirectionSprite = useProjectStore((s) => s.clearDirectionSprite);
  const historyItems = useHistoryStore((s) => s.items);
  const historyActive = useHistoryStore((s) => s.activeItemId);

  const selectedProvider = useSettingsStore((s) => s.selectedProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const requireEdges = useSettingsStore((s) => s.requireEdges);
  const postProcess = useSettingsStore((s) => s.postProcess);

  const startLog = useDebugLogStore((s) => s.startEntry);
  const updateLog = useDebugLogStore((s) => s.updateEntry);

  const [selectedDirection, setSelectedDirection] = useState<DirKey | null>(
    null
  );
  const [busyDirection, setBusyDirection] = useState<DirKey | null>(null);
  const [generatingSheet, setGeneratingSheet] = useState(false);
  const [userExtra, setUserExtra] = useState("");
  const [cellError, setCellError] = useState<string | null>(null);

  // 베이스 sprite 미리보기 캔버스.
  const previewRef = useRef<HTMLCanvasElement | null>(null);

  function getBaseSprite() {
    const fromHist = historyItems.find((h) => h.id === historyActive);
    if (fromHist) {
      return {
        imageData: fromHist.imageData,
        prompt: fromHist.prompt || "the character shown in the reference image",
        palette: extractPaletteFromImageData(fromHist.imageData, paletteSize),
      };
    }
    const ps = useProjectStore.getState();
    const aid = ps.basePhase.activeSpriteId;
    const item = ps.basePhase.sprites.find((s) => s.id === aid);
    if (item) {
      return {
        imageData: item.imageData,
        prompt: item.prompt || "the character shown in the reference image",
        palette: item.palette,
      };
    }
    return null;
  }

  // 베이스 미리보기 렌더.
  useEffect(() => {
    const base = getBaseSprite();
    const canvas = previewRef.current;
    if (!canvas || !base) return;
    canvas.width = base.imageData.width;
    canvas.height = base.imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(base.imageData, 0, 0);
  }, [historyActive, historyItems]);

  /** 단일 방향 셀 재생성 (M3). */
  async function handleRegenerateCell(dir: DirKey) {
    if (!meta) return;
    const base = getBaseSprite();
    if (!base) {
      setCellError("베이스 sprite를 먼저 만드세요.");
      return;
    }
    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setCellError("API 키를 설정해주세요. (설정 ⚙)");
      return;
    }
    const adapter = createAdapter(selectedProvider, apiKey);
    if (!adapter.controlStructure) {
      setCellError(`${adapter.name}는 셀 재생성을 지원하지 않습니다.`);
      return;
    }

    setCellError(null);
    setBusyDirection(dir);
    const startTime = Date.now();

    const inputBase64 = prepareInputImageBase64(base.imageData);
    const finalPrompt = buildSingleDirectionPrompt({
      characterDescription: base.prompt,
      direction: dir,
      basePalette: base.palette,
      userExtra: userExtra.trim() || undefined,
      width: meta.width,
      height: meta.height,
      paletteSize,
      requireEdges,
    });

    const logId = startLog({
      mode: "direction-cell",
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
      const cellImage = await base64ToImageData(rawBase64);
      const processed = await runPostProcess(cellImage, {
        targetWidth: meta.width,
        targetHeight: meta.height,
        paletteSize,
        providerType: selectedProvider,
        config: postProcess,
      });
      const palette = extractPaletteFromImageData(processed, paletteSize);
      setDirectionSprite(dir, {
        imageData: processed,
        palette,
        rawBase64,
      });
      updateLog(logId, {
        rawOutput: rawBase64,
        processedOutput: imageDataToBase64(processed),
        meta: { durationMs: Date.now() - startTime },
      });
    } catch (e) {
      updateLog(logId, {
        error: e instanceof Error ? e.message : String(e),
        meta: { durationMs: Date.now() - startTime },
      });
      setCellError(e instanceof Error ? e.message : "셀 재생성에 실패했습니다.");
    } finally {
      setBusyDirection(null);
    }
  }

  /** DEV 셀 재생성 (M4). */
  async function handleDevRegenerateCell(dir: DirKey) {
    if (!meta) return;
    const base = getBaseSprite();
    if (!base) return;
    setCellError(null);
    setBusyDirection(dir);
    const startTime = Date.now();

    const finalPrompt = buildSingleDirectionPrompt({
      characterDescription: base.prompt,
      direction: dir,
      basePalette: base.palette,
      userExtra: userExtra.trim() || undefined,
      width: meta.width,
      height: meta.height,
      paletteSize,
      requireEdges,
    });

    const logId = startLog({
      mode: "direction-cell",
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
      const sheet = buildDevSingleDirectionSheet(base.imageData, dir);
      const processed = await runPostProcess(sheet, {
        targetWidth: meta.width,
        targetHeight: meta.height,
        paletteSize,
        providerType: selectedProvider,
        config: postProcess,
      });
      const palette = extractPaletteFromImageData(processed, paletteSize);
      setDirectionSprite(dir, {
        imageData: processed,
        palette,
      });
      updateLog(logId, {
        meta: { durationMs: Date.now() - startTime },
      });
    } catch (e) {
      updateLog(logId, {
        error: e instanceof Error ? e.message : String(e),
        meta: { durationMs: Date.now() - startTime },
      });
    } finally {
      setBusyDirection(null);
    }
  }

  function handleClearCell(dir: DirKey) {
    clearDirectionSprite(dir);
    if (selectedDirection === dir) setSelectedDirection(null);
  }

  function handleNextPhase() {
    if (!id) return;
    navigate(`/project/${id}/animations`);
  }

  // M2 — 1개 이상 방향 채워짐 시 다음 페이즈 진입 가능.
  const filledCount = Object.keys(directionsPhase.sprites).length;
  const canAdvance = filledCount >= 1;

  const isDev = import.meta.env.DEV;
  const base = getBaseSprite();

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* 좌측: 베이스 미리보기 */}
      <div className="w-64 border-r border-gray-700 bg-gray-900 p-3 flex flex-col gap-3 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-300">베이스</h3>
        {base ? (
          <div className="flex items-center justify-center bg-gray-800 rounded p-2">
            <canvas
              ref={previewRef}
              style={{ imageRendering: "pixelated" }}
              className="w-full max-w-full h-auto"
              data-testid="direction-base-preview"
            />
          </div>
        ) : (
          <div className="text-xs text-gray-500">베이스 sprite 없음</div>
        )}
        <button
          onClick={() => navigate(`/project/${id}/base`)}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-200"
          data-testid="directions-back-base"
        >
          ← 베이스로
        </button>
      </div>

      {/* 중앙: 그리드 */}
      <div className="flex-1 flex flex-col p-4 gap-3 overflow-auto">
        <div className="flex items-center justify-between">
          <DirectionModeToggle />
          <button
            onClick={handleNextPhase}
            disabled={!canAdvance}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-white text-sm"
            data-testid="directions-next-phase"
            title={
              canAdvance
                ? "애니메이션 페이즈로"
                : "최소 1개 방향을 생성하세요"
            }
          >
            애니메이션 페이즈로 →
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-2xl w-full">
            <DirectionGrid
              selected={selectedDirection}
              onSelect={(d) => setSelectedDirection(d)}
              onRegenerate={handleRegenerateCell}
              onDevRegenerate={isDev ? handleDevRegenerateCell : undefined}
              onClear={handleClearCell}
              busyDirection={busyDirection}
            />
          </div>
        </div>
        {cellError && (
          <div
            className="text-xs text-red-400 bg-red-950/30 rounded p-2"
            data-testid="direction-cell-error"
          >
            {cellError}
          </div>
        )}
        <div className="text-xs text-gray-500 text-center">
          채워진 방향: {filledCount} / {directionsPhase.mode}
        </div>
      </div>

      {/* 우측: 시트 생성 패널 */}
      <div className="w-72 border-l border-gray-700 bg-gray-900 p-3 flex flex-col gap-3 overflow-y-auto">
        <h3 className="text-sm font-semibold text-gray-300">시트 생성</h3>
        <SheetGenerationPanel
          busy={generatingSheet || busyDirection !== null}
          setBusy={setGeneratingSheet}
          userExtra={userExtra}
          setUserExtra={setUserExtra}
        />
      </div>
    </div>
  );
}
