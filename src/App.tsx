import { useState } from "react";
import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import MainArea from "./components/Layout/MainArea";
import AIPanel from "./components/Layout/AIPanel";
import ResolutionSelector from "./components/Toolbar/ResolutionSelector";
import ToolSelector from "./components/Toolbar/ToolSelector";
import ColorPicker from "./components/Toolbar/ColorPicker";
import BrushSizeSelector from "./components/Toolbar/BrushSizeSelector";
import ViewTypeSelector from "./components/Toolbar/ViewTypeSelector";
import PixelCanvas from "./components/Canvas/PixelCanvas";
import ApiKeySettings from "./components/Settings/ApiKeySettings";
import ProviderSelector from "./components/Settings/ProviderSelector";

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Header onSettingsClick={() => setSettingsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <ToolSelector />
          <ColorPicker />
          <BrushSizeSelector />
          <hr className="border-gray-700" />
          <ResolutionSelector />
          <ViewTypeSelector />
        </Sidebar>
        <MainArea>
          <PixelCanvas />
        </MainArea>
        <AIPanel>
          <ProviderSelector />
        </AIPanel>
      </div>
      {settingsOpen && (
        <ApiKeySettings onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}

export default App;
