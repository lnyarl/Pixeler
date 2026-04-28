/**
 * AnimationsPhase — 애니메이션 페이즈 본체 (§5.3 / γ-F1~F17).
 *
 * 레이아웃:
 *   AnimationDirectionTabs  (top — 채워진/빈 방향, M2 disabled)
 *   ┌─────────────┬───────────────────────┬─────────────┐
 *   │ ClipList    │ AnimationPreviewPlayer│ Generation  │
 *   │ + 추가 버튼 │  (큰 캔버스 — m1)      │ Panel       │
 *   │             │ ─────────────────────  │             │
 *   │             │ FrameGrid (썸네일)     │             │
 *   └─────────────┴───────────────────────┴─────────────┘
 *
 * AI 호출 흐름:
 * 1. 방향 탭 + 프리셋 선택 + custom + frameCount → "생성" 클릭.
 * 2. directionSprite[dir].imageData → prepareInputImageBase64 (1024).
 * 3. stability.controlStructure({ inputImage, prompt, controlStrength: 0.6 }).
 * 4. 응답 1024 → splitSpriteSheet → 각 프레임 runPostProcess → AnimationFrame[].
 * 5. addAnimation(dir, clip).
 * 6. debugLog "animation-sheet" (M8).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useDebugLogStore } from "@/stores/debugLogStore";
import { createAdapter } from "@/services/ai/adapterFactory";
import {
  buildAnimationSheetPrompt,
  buildSingleAnimationFramePrompt,
} from "@/services/ai/promptBuilder/animation";
import { processAnimationSheetToFrames } from "@/services/ai/animation/processAnimationSheet";
import {
  buildDevAnimationSheet,
  buildDevSingleAnimationFrame,
} from "@/services/ai/animation/devDummyAnimationSheet";
import {
  PRESET_BY_KEY,
  FRAME_COUNT_MIN,
  FRAME_COUNT_MAX,
} from "@/services/ai/animation/presets";
import { runPostProcess } from "@/services/ai/postprocess/pipeline";
import { extractPaletteFromImageData } from "@/utils/extractPalette";
import { prepareInputImageBase64 } from "@/services/ai/spriteSheet/prepareInputImage";
import { base64ToImageData, imageDataToBase64 } from "@/utils/imageConvert";
import { uuid } from "@/utils/uuid";
import type {
  DirKey,
  AnimationPresetKey,
  AnimationClip,
} from "@/services/persistence/types";
import {
  getDirectionLayout,
} from "@/services/ai/spriteSheet/directionLayout";
import AnimationDirectionTabs from "./AnimationDirectionTabs";
import AnimationGenerationPanel from "./AnimationGenerationPanel";
import AnimationFrameGrid from "./AnimationFrameGrid";
import AnimationPreviewPlayer from "./AnimationPreviewPlayer";
import AnimationClipList from "./AnimationClipList";

const DIRECTION_FALLBACK_PRIORITY: DirKey[] = [
  "S",
  "E",
  "W",
  "N",
  "SE",
  "SW",
  "NE",
  "NW",
];

function pickDefaultDirection(
  filled: ReadonlyArray<DirKey>,
  lastDir: DirKey | undefined
): DirKey | null {
  if (filled.length === 0) return null;
  if (lastDir && filled.includes(lastDir)) return lastDir;
  for (const d of DIRECTION_FALLBACK_PRIORITY) {
    if (filled.includes(d)) return d;
  }
  return filled[0];
}

export default function AnimationsPhase() {
  const { id, direction: routeDir } = useParams<{
    id: string;
    direction?: string;
  }>();
  const navigate = useNavigate();
  const meta = useProjectStore((s) => s.meta);
  const directionsPhase = useProjectStore((s) => s.directionsPhase);
  const animationsPhase = useProjectStore((s) => s.animationsPhase);
  const addAnimation = useProjectStore((s) => s.addAnimation);
  const updateAnimationFrame = useProjectStore((s) => s.updateAnimationFrame);
  const removeAnimation = useProjectStore((s) => s.removeAnimation);
  const renameAnimation = useProjectStore((s) => s.renameAnimation);
  const setAnimationFps = useProjectStore((s) => s.setAnimationFps);
  const setLastAnimationDirection = useProjectStore(
    (s) => s.setLastAnimationDirection
  );

  const selectedProvider = useSettingsStore((s) => s.selectedProvider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const paletteSize = useSettingsStore((s) => s.paletteSize);
  const requireEdges = useSettingsStore((s) => s.requireEdges);
  const postProcess = useSettingsStore((s) => s.postProcess);

  const startLog = useDebugLogStore((s) => s.startEntry);
  const updateLog = useDebugLogStore((s) => s.updateEntry);

  const filledDirections = useMemo(() => {
    const layout = getDirectionLayout(directionsPhase.mode);
    return layout
      .map((c) => c.direction)
      .filter((d) => !!directionsPhase.sprites[d]);
  }, [directionsPhase]);

  // 활성 방향 결정 (γ-F14): URL > lastAnimationDirection > priority fallback.
  const initialDir = useMemo(() => {
    const fromRoute =
      routeDir && filledDirections.includes(routeDir as DirKey)
        ? (routeDir as DirKey)
        : null;
    if (fromRoute) return fromRoute;
    return pickDefaultDirection(filledDirections, meta?.lastAnimationDirection);
  }, [routeDir, filledDirections, meta?.lastAnimationDirection]);

  const [activeDir, setActiveDir] = useState<DirKey | null>(initialDir);

  // URL과 store 동기화 (탭 변경, route param 폴백).
  useEffect(() => {
    if (!id) return;
    if (!activeDir) return;
    setLastAnimationDirection(activeDir);
    if (routeDir !== activeDir) {
      navigate(`/project/${id}/animations/${activeDir}`, { replace: true });
    }
  }, [activeDir, id, navigate, routeDir, setLastAnimationDirection]);

  // initialDir 변경 (filled change/load) → activeDir 갱신.
  // activeDir은 일부러 deps에서 제외 (initialDir 변경 시에만 sync).
  useEffect(() => {
    if (initialDir && initialDir !== activeDir) {
      setActiveDir(initialDir);
    }
  }, [initialDir]);

  // === Generation Panel state (활성 방향마다 분리 — 단순화 위해 단일 set) ===
  const [presetKey, setPresetKey] = useState<AnimationPresetKey | null>("walk");
  const [customMode, setCustomMode] = useState(false);
  const [customDescriptor, setCustomDescriptor] = useState("");
  const [frameCount, setFrameCount] = useState(
    PRESET_BY_KEY.walk.defaultFrameCount
  );
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // 활성 클립 (방향에 클립이 있으면 마지막 추가된 것을 기본 선택).
  const clipsForDir = useMemo(() => {
    if (!activeDir) return [];
    return animationsPhase.byDirection[activeDir]?.animations ?? [];
  }, [activeDir, animationsPhase]);

  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  useEffect(() => {
    // 방향 변경 / 새 클립 추가 시 자동 선택.
    if (clipsForDir.length === 0) {
      if (selectedClipId !== null) setSelectedClipId(null);
      return;
    }
    if (!selectedClipId || !clipsForDir.some((c) => c.id === selectedClipId)) {
      setSelectedClipId(clipsForDir[clipsForDir.length - 1].id);
    }
  }, [clipsForDir, selectedClipId]);

  const selectedClip = useMemo(
    () => clipsForDir.find((c) => c.id === selectedClipId) ?? null,
    [clipsForDir, selectedClipId]
  );

  const [selectedFrameIdx, setSelectedFrameIdx] = useState(0);
  useEffect(() => {
    setSelectedFrameIdx(0);
  }, [selectedClipId]);

  const [busyFrameIdx, setBusyFrameIdx] = useState<number | null>(null);

  // === 베이스 + 방향 sprite 헬퍼 ===
  function getDirectionContext(dir: DirKey) {
    const sprite = directionsPhase.sprites[dir];
    if (!sprite) return null;
    // characterDescription: 베이스 sprite의 prompt를 활용 (있으면).
    const ps = useProjectStore.getState();
    const baseId = ps.basePhase.activeSpriteId;
    const baseSprite = ps.basePhase.sprites.find((s) => s.id === baseId);
    const characterDescription =
      baseSprite?.prompt || "the character shown in the reference image";
    return {
      directionImageData: sprite.imageData,
      basePalette: sprite.palette,
      characterDescription,
    };
  }

  function getActivePresetDescriptor(): string | undefined {
    if (customMode) return undefined;
    if (!presetKey) return undefined;
    return PRESET_BY_KEY[presetKey].baseDescriptor;
  }

  // === AI 시트 생성 ===
  async function handleGenerate() {
    if (!meta || !activeDir) return;
    const ctx = getDirectionContext(activeDir);
    if (!ctx) {
      setGenError("이 방향에 sprite가 없습니다.");
      return;
    }
    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setGenError("API 키를 설정해주세요. (설정 ⚙)");
      return;
    }
    const adapter = createAdapter(selectedProvider, apiKey);
    if (!adapter.controlStructure) {
      setGenError(`${adapter.name}는 시트 생성을 지원하지 않습니다.`);
      return;
    }

    const safeFrameCount = Math.max(
      FRAME_COUNT_MIN,
      Math.min(FRAME_COUNT_MAX, frameCount)
    );

    setGenError(null);
    setGenBusy(true);
    const startTime = Date.now();

    const inputBase64 = prepareInputImageBase64(ctx.directionImageData);
    const presetDescriptor = getActivePresetDescriptor();
    const finalPrompt = buildAnimationSheetPrompt({
      characterDescription: ctx.characterDescription,
      direction: activeDir,
      presetDescriptor,
      customDescriptor: customDescriptor.trim() || undefined,
      frameCount: safeFrameCount,
      basePalette: ctx.basePalette,
      width: meta.width,
      height: meta.height,
      paletteSize,
      requireEdges,
    });

    const logId = startLog({
      mode: "animation-sheet",
      userPrompt: customDescriptor,
      finalPrompt,
      referenceImage: inputBase64,
      meta: {
        provider: selectedProvider,
        width: meta.width,
        height: meta.height,
        paletteSize,
        count: safeFrameCount,
      },
    });

    try {
      const results = await adapter.controlStructure({
        inputImage: inputBase64,
        prompt: finalPrompt,
        controlStrength: 0.6,
      });
      const rawBase64 = results[0]?.base64;
      if (!rawBase64) throw new Error("Stability 응답이 비어있습니다.");
      const sheetImage = await base64ToImageData(rawBase64);
      const frames = await processAnimationSheetToFrames({
        sheet: sheetImage,
        frameCount: safeFrameCount,
        targetWidth: meta.width,
        targetHeight: meta.height,
        paletteSize,
        providerType: selectedProvider,
        postProcessConfig: postProcess,
      });

      const fps = customMode
        ? 12
        : (presetKey ? PRESET_BY_KEY[presetKey].defaultFps : 12);
      const clip: AnimationClip = {
        id: uuid(),
        name: customMode
          ? "직접 설명"
          : presetKey
            ? PRESET_BY_KEY[presetKey].label
            : "animation",
        presetKey: customMode ? null : presetKey,
        descriptor: [presetDescriptor, customDescriptor.trim()]
          .filter(Boolean)
          .join(". "),
        fps,
        frames: frames.map((f) => ({ ...f, rawBase64 })),
      };
      addAnimation(activeDir, clip);
      setSelectedClipId(clip.id);
      updateLog(logId, {
        rawOutput: rawBase64,
        processedOutput: imageDataToBase64(frames[0]?.imageData ?? sheetImage),
        meta: { durationMs: Date.now() - startTime },
      });
    } catch (e) {
      updateLog(logId, {
        error: e instanceof Error ? e.message : String(e),
        meta: { durationMs: Date.now() - startTime },
      });
      setGenError(e instanceof Error ? e.message : "시트 생성 실패");
    } finally {
      setGenBusy(false);
    }
  }

  // === DEV 시트 생성 (M4) ===
  async function handleDevGenerate() {
    if (!meta || !activeDir) return;
    const ctx = getDirectionContext(activeDir);
    if (!ctx) return;
    const safeFrameCount = Math.max(
      FRAME_COUNT_MIN,
      Math.min(FRAME_COUNT_MAX, frameCount)
    );

    setGenError(null);
    setGenBusy(true);
    const startTime = Date.now();

    const presetDescriptor = getActivePresetDescriptor();
    const finalPrompt = buildAnimationSheetPrompt({
      characterDescription: ctx.characterDescription,
      direction: activeDir,
      presetDescriptor,
      customDescriptor: customDescriptor.trim() || undefined,
      frameCount: safeFrameCount,
      basePalette: ctx.basePalette,
      width: meta.width,
      height: meta.height,
      paletteSize,
      requireEdges,
    });

    const logId = startLog({
      mode: "animation-sheet",
      userPrompt: customDescriptor,
      finalPrompt,
      meta: {
        provider: "dev",
        width: meta.width,
        height: meta.height,
        paletteSize,
        count: safeFrameCount,
      },
    });

    try {
      const sheet = buildDevAnimationSheet(
        ctx.directionImageData,
        safeFrameCount
      );
      const frames = await processAnimationSheetToFrames({
        sheet,
        frameCount: safeFrameCount,
        targetWidth: meta.width,
        targetHeight: meta.height,
        paletteSize,
        providerType: selectedProvider,
        postProcessConfig: postProcess,
      });

      const fps = customMode
        ? 12
        : (presetKey ? PRESET_BY_KEY[presetKey].defaultFps : 12);
      const clip: AnimationClip = {
        id: uuid(),
        name: customMode
          ? "[DEV] 직접 설명"
          : presetKey
            ? `[DEV] ${PRESET_BY_KEY[presetKey].label}`
            : "[DEV] animation",
        presetKey: customMode ? null : presetKey,
        descriptor: [presetDescriptor, customDescriptor.trim()]
          .filter(Boolean)
          .join(". "),
        fps,
        frames,
      };
      addAnimation(activeDir, clip);
      setSelectedClipId(clip.id);
      updateLog(logId, {
        meta: { durationMs: Date.now() - startTime },
      });
    } catch (e) {
      updateLog(logId, {
        error: e instanceof Error ? e.message : String(e),
        meta: { durationMs: Date.now() - startTime },
      });
      setGenError(e instanceof Error ? e.message : "DEV 시트 생성 실패");
    } finally {
      setGenBusy(false);
    }
  }

  // === 단일 프레임 재생성 ===
  async function handleRegenerateFrame(frameIdx: number) {
    if (!meta || !activeDir || !selectedClip) return;
    const ctx = getDirectionContext(activeDir);
    if (!ctx) return;
    const apiKey = apiKeys[selectedProvider];
    if (!apiKey) {
      setGenError("API 키를 설정해주세요. (설정 ⚙)");
      return;
    }
    const adapter = createAdapter(selectedProvider, apiKey);
    if (!adapter.controlStructure) {
      setGenError(`${adapter.name}는 프레임 재생성을 지원하지 않습니다.`);
      return;
    }

    setGenError(null);
    setBusyFrameIdx(frameIdx);
    const startTime = Date.now();

    const inputBase64 = prepareInputImageBase64(ctx.directionImageData);
    const presetDescriptor =
      selectedClip.presetKey && PRESET_BY_KEY[selectedClip.presetKey]
        ? PRESET_BY_KEY[selectedClip.presetKey].baseDescriptor
        : undefined;
    const finalPrompt = buildSingleAnimationFramePrompt({
      characterDescription: ctx.characterDescription,
      direction: activeDir,
      presetDescriptor,
      customDescriptor: selectedClip.descriptor || undefined,
      frameIndex: frameIdx + 1,
      frameCount: selectedClip.frames.length,
      basePalette: ctx.basePalette,
      width: meta.width,
      height: meta.height,
      paletteSize,
      requireEdges,
    });

    const logId = startLog({
      mode: "animation-frame",
      userPrompt: selectedClip.descriptor,
      finalPrompt,
      referenceImage: inputBase64,
      meta: {
        provider: selectedProvider,
        width: meta.width,
        height: meta.height,
        paletteSize,
        count: 1,
      },
    });

    try {
      const results = await adapter.controlStructure({
        inputImage: inputBase64,
        prompt: finalPrompt,
        controlStrength: 0.6,
      });
      const rawBase64 = results[0]?.base64;
      if (!rawBase64) throw new Error("Stability 응답이 비어있습니다.");
      const single = await base64ToImageData(rawBase64);
      const processed = await runPostProcess(single, {
        targetWidth: meta.width,
        targetHeight: meta.height,
        paletteSize,
        providerType: selectedProvider,
        config: postProcess,
      });
      const palette = extractPaletteFromImageData(processed, paletteSize);
      updateAnimationFrame(activeDir, selectedClip.id, frameIdx, {
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
      setGenError(e instanceof Error ? e.message : "프레임 재생성 실패");
    } finally {
      setBusyFrameIdx(null);
    }
  }

  // === DEV 단일 프레임 재생성 (M4) ===
  async function handleDevRegenerateFrame(frameIdx: number) {
    if (!meta || !activeDir || !selectedClip) return;
    const ctx = getDirectionContext(activeDir);
    if (!ctx) return;

    setGenError(null);
    setBusyFrameIdx(frameIdx);
    const startTime = Date.now();

    const presetDescriptor =
      selectedClip.presetKey && PRESET_BY_KEY[selectedClip.presetKey]
        ? PRESET_BY_KEY[selectedClip.presetKey].baseDescriptor
        : undefined;
    const finalPrompt = buildSingleAnimationFramePrompt({
      characterDescription: ctx.characterDescription,
      direction: activeDir,
      presetDescriptor,
      customDescriptor: selectedClip.descriptor || undefined,
      frameIndex: frameIdx + 1,
      frameCount: selectedClip.frames.length,
      basePalette: ctx.basePalette,
      width: meta.width,
      height: meta.height,
      paletteSize,
      requireEdges,
    });

    const logId = startLog({
      mode: "animation-frame",
      userPrompt: selectedClip.descriptor,
      finalPrompt,
      meta: {
        provider: "dev",
        width: meta.width,
        height: meta.height,
        paletteSize,
        count: 1,
      },
    });

    try {
      const sheet = buildDevSingleAnimationFrame(
        ctx.directionImageData,
        frameIdx
      );
      const processed = await runPostProcess(sheet, {
        targetWidth: meta.width,
        targetHeight: meta.height,
        paletteSize,
        providerType: selectedProvider,
        config: postProcess,
      });
      const palette = extractPaletteFromImageData(processed, paletteSize);
      updateAnimationFrame(activeDir, selectedClip.id, frameIdx, {
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
      setGenError(e instanceof Error ? e.message : "DEV 프레임 재생성 실패");
    } finally {
      setBusyFrameIdx(null);
    }
  }

  const isDev = import.meta.env.DEV;

  // 게이트 통과 후 활성 방향 없으면 (예: 방향 페이즈로 갔다가 모두 삭제) → directions로 redirect.
  useEffect(() => {
    if (filledDirections.length === 0) {
      navigate(`/project/${id}/directions`, { replace: true });
    }
  }, [filledDirections.length, id, navigate]);

  if (!activeDir || filledDirections.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden h-full"
      data-testid="animations-phase"
    >
      <AnimationDirectionTabs
        active={activeDir}
        onSelect={(d) => setActiveDir(d)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 클립 리스트 */}
        <aside className="w-48 border-r border-gray-700 bg-gray-900 p-3 flex flex-col gap-2 overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">클립</h3>
            <span className="text-[10px] font-mono text-gray-500">
              {clipsForDir.length}
            </span>
          </div>
          <AnimationClipList
            clips={clipsForDir}
            selectedClipId={selectedClipId}
            onSelect={setSelectedClipId}
            onRename={(cid, name) =>
              activeDir && renameAnimation(activeDir, cid, name)
            }
            onRemove={(cid) => activeDir && removeAnimation(activeDir, cid)}
          />
        </aside>

        {/* 중앙: 프리뷰 + 프레임 그리드 */}
        <main className="flex-1 flex flex-col p-4 gap-4 overflow-auto items-center">
          {selectedClip ? (
            <>
              <AnimationPreviewPlayer
                frames={selectedClip.frames}
                fps={selectedClip.fps}
                selectedIdx={selectedFrameIdx}
                onStopAtFrame={(idx) => setSelectedFrameIdx(idx)}
                onFpsChange={(fps) =>
                  activeDir && setAnimationFps(activeDir, selectedClip.id, fps)
                }
              />
              <AnimationFrameGrid
                frames={selectedClip.frames}
                selectedIdx={selectedFrameIdx}
                busyIdx={busyFrameIdx}
                onSelectFrame={setSelectedFrameIdx}
                onRegenerate={handleRegenerateFrame}
                onDevRegenerate={isDev ? handleDevRegenerateFrame : undefined}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
              클립을 생성하세요. 우측 패널에서 프리셋 + 프레임 수 → "생성".
            </div>
          )}
        </main>

        {/* 우측: 생성 패널 */}
        <aside className="w-72 border-l border-gray-700 bg-gray-900 p-3 flex flex-col gap-3 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-300">
            애니메이션 생성
          </h3>
          <AnimationGenerationPanel
            presetKey={presetKey}
            customMode={customMode}
            customDescriptor={customDescriptor}
            frameCount={frameCount}
            busy={genBusy}
            error={genError}
            onPresetChange={setPresetKey}
            onCustomModeChange={(v) => {
              setCustomMode(v);
              if (v) setPresetKey(null);
              else if (!presetKey) setPresetKey("walk");
            }}
            onCustomDescriptorChange={setCustomDescriptor}
            onFrameCountChange={setFrameCount}
            onGenerate={handleGenerate}
            onDevGenerate={isDev ? handleDevGenerate : undefined}
          />
          <button
            onClick={() => navigate(`/project/${id}/directions`)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-200"
            data-testid="animations-back-directions"
          >
            ← 방향 페이즈
          </button>
        </aside>
      </div>
    </div>
  );
}
