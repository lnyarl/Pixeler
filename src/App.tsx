import { useState } from "react";
import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import MainArea from "./components/Layout/MainArea";
import AIPanel from "./components/Layout/AIPanel";
import ResolutionSelector from "./components/Toolbar/ResolutionSelector";
import ToolSelector from "./components/Toolbar/ToolSelector";
import ColorPicker from "./components/Toolbar/ColorPicker";
import BrushSizeSelector from "./components/Toolbar/BrushSizeSelector";
import PaletteSizeSelector from "./components/Toolbar/PaletteSizeSelector";
import PostProcessSelector from "./components/Toolbar/PostProcessSelector";
import PixelCanvas from "./components/Canvas/PixelCanvas";
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
  const [processedDrafts, setProcessedDrafts] = useState<ProcessedDraft[]>([]);
  const isGenerating = useGenerationStore((s) => s.status === "loading");
  const breakpoint = useResponsive();
  useBeforeUnload();
  const isMobile = breakpoint === "mobile";

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-gray-900 text-white">
        <Header onSettingsClick={() => setSettingsOpen(true)} />
        <div className="flex-1 flex flex-col overflow-auto p-3 gap-3">
          <ProviderSelector />
          <PromptPanel onDraftsReady={setProcessedDrafts} />
          <ErrorDisplay />
          <DraftGrid drafts={processedDrafts} />
          <ExportButton />
          <hr className="border-gray-700" />
          <HistoryPanel />
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
          <hr className="border-gray-700" />
          <PostProcessSelector />
        </Sidebar>
        <MainArea>
          <PixelCanvas disabled={isGenerating} />
        </MainArea>
        <AIPanel>
          <ProviderSelector />
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
      {settingsOpen && (
        <ApiKeySettings onClose={() => setSettingsOpen(false)} />
      )}
      <DebugLogPanel />
    </div>
  );
}

export default App;
