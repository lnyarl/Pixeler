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
import PixelCanvas from "./components/Canvas/PixelCanvas";
import type { PixelCanvasHandle } from "./components/Canvas/PixelCanvas";
import ApiKeySettings from "./components/Settings/ApiKeySettings";
import ProviderSelector from "./components/Settings/ProviderSelector";
import PromptPanel from "./components/AIPanel/PromptPanel";
import type { ProcessedDraft } from "./components/AIPanel/PromptPanel";
import DraftGrid from "./components/AIPanel/DraftGrid";
import ErrorDisplay from "./components/AIPanel/ErrorDisplay";
import InpaintControls from "./components/AIPanel/InpaintControls";
import HistoryPanel from "./components/History/HistoryPanel";
import { useGenerationStore } from "./stores/generationStore";

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [canvasHandle, setCanvasHandle] = useState<PixelCanvasHandle | null>(
    null
  );
  const [processedDrafts, setProcessedDrafts] = useState<ProcessedDraft[]>([]);
  const isGenerating = useGenerationStore((s) => s.status === "loading");

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
          <InpaintControls
            getCanvasImageData={getCanvasImageData}
            onImageReady={handleImageReady}
          />
          <hr className="border-gray-700" />
          <HistoryPanel onRestore={handleImageReady} />
        </AIPanel>
      </div>
      {settingsOpen && (
        <ApiKeySettings onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

export default App;
