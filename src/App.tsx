import { useState, useCallback } from "react";
import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import MainArea from "./components/Layout/MainArea";
import AIPanel from "./components/Layout/AIPanel";
import ResolutionSelector from "./components/Toolbar/ResolutionSelector";
import ToolSelector from "./components/Toolbar/ToolSelector";
import ColorPicker from "./components/Toolbar/ColorPicker";
import BrushSizeSelector from "./components/Toolbar/BrushSizeSelector";
import ViewTypeSelector from "./components/Toolbar/ViewTypeSelector";
import PaletteSizeSelector from "./components/Toolbar/PaletteSizeSelector";
import PostProcessSelector from "./components/Toolbar/PostProcessSelector";
import PixelCanvas from "./components/Canvas/PixelCanvas";
import type { PixelCanvasHandle } from "./components/Canvas/PixelCanvas";
import ApiKeySettings from "./components/Settings/ApiKeySettings";
import ProviderSelector from "./components/Settings/ProviderSelector";
import PromptPanel from "./components/AIPanel/PromptPanel";
import type { ProcessedDraft } from "./components/AIPanel/PromptPanel";
import DraftGrid from "./components/AIPanel/DraftGrid";
import ErrorDisplay from "./components/AIPanel/ErrorDisplay";
import HistoryPanel from "./components/History/HistoryPanel";
import DevRawPreview from "./components/AIPanel/DevRawPreview";
import DebugLogPanel from "./components/Debug/DebugLogPanel";
import ExportButton from "./components/Export/ExportButton";
import { useGenerationStore } from "./stores/generationStore";
import { useResponsive } from "./hooks/useResponsive";
import { useBeforeUnload } from "./hooks/useBeforeUnload";

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [canvasHandle, setCanvasHandle] = useState<PixelCanvasHandle | null>(
    null
  );
  const [processedDrafts, setProcessedDrafts] = useState<ProcessedDraft[]>([]);
  const isGenerating = useGenerationStore((s) => s.status === "loading");
  const breakpoint = useResponsive();
  useBeforeUnload();
  const isMobile = breakpoint === "mobile";

  const handleImageReady = useCallback(
    (imageData: ImageData) => {
      canvasHandle?.loadImageData(imageData);
    },
    [canvasHandle]
  );

  const getCanvasImageData = useCallback(
    () => canvasHandle?.getImageData() ?? null,
    [canvasHandle]
  );

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        <Header onSettingsClick={() => setSettingsOpen(true)} />
        <div className="flex-1 flex flex-col overflow-auto p-3 gap-3">
          <ProviderSelector />
          <PromptPanel
            getCanvasImageData={getCanvasImageData}
            onImageReady={handleImageReady}
            onDraftsReady={setProcessedDrafts}
          />
          <ErrorDisplay />
          <DraftGrid drafts={processedDrafts} onSelect={handleImageReady} />
          <ExportButton getCanvasImageData={getCanvasImageData} />
          <hr className="border-gray-700" />
          <HistoryPanel onRestore={handleImageReady} />
        </div>
        {settingsOpen && (
          <ApiKeySettings onClose={() => setSettingsOpen(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Header onSettingsClick={() => setSettingsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar disabled={isGenerating}>
          <ToolSelector />
          <ColorPicker />
          <BrushSizeSelector />
          <hr className="border-gray-700" />
          <ResolutionSelector />
          <ViewTypeSelector />
          <PaletteSizeSelector />
          <PostProcessSelector
            getCanvasImageData={getCanvasImageData}
            onImageReady={handleImageReady}
          />
        </Sidebar>
        <MainArea>
          <PixelCanvas onReady={setCanvasHandle} disabled={isGenerating} />
        </MainArea>
        <AIPanel>
          <ProviderSelector />
          <hr className="border-gray-700" />
          <PromptPanel
            getCanvasImageData={getCanvasImageData}
            onImageReady={handleImageReady}
            onDraftsReady={setProcessedDrafts}
          />
          <ErrorDisplay />
          <DraftGrid drafts={processedDrafts} onSelect={handleImageReady} />
          <DevRawPreview />
          <ExportButton getCanvasImageData={getCanvasImageData} />
          <hr className="border-gray-700" />
          <HistoryPanel onRestore={handleImageReady} />
        </AIPanel>
      </div>
      {settingsOpen && (
        <ApiKeySettings onClose={() => setSettingsOpen(false)} />
      )}
      <DebugLogPanel />
    </div>
  );
}

export default App;
