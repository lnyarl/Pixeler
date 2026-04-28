/**
 * BasePhaseRoute — 베이스 페이즈 (현행 single-image UI 흡수, §5.1).
 *
 * - mount 시 projectStore.basePhase → historyStore.replaceAll 주입.
 * - historyStore 변경 → projectStore.markDirty() (단방향, §4.3.1).
 * - 활성 sprite 변경 시 썸네일 업데이트.
 * - 데스크톱/모바일 분기는 이 컴포넌트 내부에서 책임 (§3.4 — BasePhase 자체 분기).
 */

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "@/components/Layout/Sidebar";
import MainArea from "@/components/Layout/MainArea";
import AIPanel from "@/components/Layout/AIPanel";
import ResolutionSelector from "@/components/Toolbar/ResolutionSelector";
import ToolSelector from "@/components/Toolbar/ToolSelector";
import ColorPicker from "@/components/Toolbar/ColorPicker";
import BrushSizeSelector from "@/components/Toolbar/BrushSizeSelector";
import PaletteSizeSelector from "@/components/Toolbar/PaletteSizeSelector";
import PostProcessSelector from "@/components/Toolbar/PostProcessSelector";
import PixelCanvas from "@/components/Canvas/PixelCanvas";
import PromptPanel from "@/components/AIPanel/PromptPanel";
import type { ProcessedDraft } from "@/components/AIPanel/PromptPanel";
import DraftGrid from "@/components/AIPanel/DraftGrid";
import ErrorDisplay from "@/components/AIPanel/ErrorDisplay";
import HistoryPanel from "@/components/History/HistoryPanel";
import DevRawPreview from "@/components/AIPanel/DevRawPreview";
import ExportButton from "@/components/Export/ExportButton";
import { useGenerationStore } from "@/stores/generationStore";
import { useHistoryStore } from "@/stores/historyStore";
import { useProjectStore } from "@/stores/projectStore";
import { useCanvasStore } from "@/stores/canvasStore";
import { useResponsive } from "@/hooks/useResponsive";
import { loadBasePhaseToHistory } from "@/utils/historyProjectBridge";
import { useCanvasHandleStore } from "@/stores/canvasHandleStore";

export default function BasePhaseRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [processedDrafts, setProcessedDrafts] = useState<ProcessedDraft[]>([]);
  const isGenerating = useGenerationStore((s) => s.status === "loading");
  const breakpoint = useResponsive();
  const isMobile = breakpoint === "mobile";

  const meta = useProjectStore((s) => s.meta);
  const markDirty = useProjectStore((s) => s.markDirty);
  const setLastPhase = useProjectStore((s) => s.setLastPhase);
  const setBaseActiveSprite = useProjectStore((s) => s.setBaseActiveSprite);
  const setResolution = useCanvasStore((s) => s.setResolution);

  // 1) 마운트 시 — projectStore의 베이스 sprite를 history로 주입.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (meta) setResolution(meta.width, meta.height);
    loadBasePhaseToHistory();
    setLastPhase("base");

    // 활성 sprite를 캔버스에 로드 (있다면).
    const active = useHistoryStore.getState().activeItemId;
    const items = useHistoryStore.getState().items;
    const target = items.find((i) => i.id === active);
    if (target) {
      const handle = useCanvasHandleStore.getState();
      // 핸들이 아직 마운트 안 됐을 수 있어 다음 tick에.
      setTimeout(() => handle.loadImageData(target.imageData), 0);
    }
  }, [meta, setResolution, setLastPhase]);

  // 2) historyStore 변경 → projectStore.markDirty (단방향).
  useEffect(() => {
    let prevSnapshot = stateSnapshot();
    const unsub = useHistoryStore.subscribe((state) => {
      const next = stateSnapshot();
      if (next !== prevSnapshot) {
        prevSnapshot = next;
        markDirty();
        // 썸네일 갱신 (활성 sprite의 thumbnail).
        const active = state.items.find((i) => i.id === state.activeItemId);
        if (active && active.thumbnail) {
          setBaseActiveSprite(active.id, active.thumbnail);
        } else {
          setBaseActiveSprite(state.activeItemId);
        }
      }
    });
    return unsub;
  }, [markDirty, setBaseActiveSprite]);

  function handleNextPhase() {
    if (!id) return;
    navigate(`/project/${id}/directions`);
  }

  const canAdvance = useHistoryStore((s) => s.activeItemId !== null);

  if (isMobile) {
    return (
      <div className="flex-1 flex flex-col overflow-auto p-3 gap-3 h-full">
        <PromptPanel onDraftsReady={setProcessedDrafts} />
        <ErrorDisplay />
        <DraftGrid drafts={processedDrafts} />
        <ExportButton />
        <hr className="border-gray-700" />
        <HistoryPanel />
        <div className="flex justify-end pt-2">
          <button
            onClick={handleNextPhase}
            disabled={!canAdvance}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm"
            data-testid="base-next-phase"
            title={canAdvance ? "방향 페이즈로" : "베이스 sprite를 선택하세요"}
          >
            방향 페이즈로 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <Sidebar disabled={isGenerating}>
        <ToolSelector />
        <ColorPicker />
        <BrushSizeSelector />
        <hr className="border-gray-700" />
        <ResolutionSelector />
        <hr className="border-gray-700" />
        <PostProcessSelector />
      </Sidebar>
      <MainArea>
        <div className="relative flex-1 flex h-full">
          <PixelCanvas disabled={isGenerating} />
          <button
            onClick={handleNextPhase}
            disabled={!canAdvance}
            className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm shadow-lg"
            title={
              canAdvance ? "방향 페이즈로" : "베이스 sprite를 선택하세요"
            }
            data-testid="base-next-phase"
          >
            방향 페이즈로 →
          </button>
        </div>
      </MainArea>
      <AIPanel>
        <PaletteSizeSelector />
        <hr className="border-gray-700" />
        <PromptPanel onDraftsReady={setProcessedDrafts} />
        <ErrorDisplay />
        <DraftGrid drafts={processedDrafts} />
        <DevRawPreview />
        <ExportButton />
        <hr className="border-gray-700" />
        <HistoryPanel />
      </AIPanel>
    </div>
  );
}

/**
 * subscribe 트리거를 위한 가벼운 snapshot. items 길이 + activeItemId 조합.
 */
function stateSnapshot(): string {
  const s = useHistoryStore.getState();
  return `${s.items.length}:${s.activeItemId ?? "null"}:${s.items[0]?.id ?? "_"}`;
}
