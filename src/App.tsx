import { useState } from "react";
import Header from "./components/Layout/Header";
import Sidebar from "./components/Layout/Sidebar";
import MainArea from "./components/Layout/MainArea";
import AIPanel from "./components/Layout/AIPanel";
import ResolutionSelector from "./components/Toolbar/ResolutionSelector";

function App() {
  const [_settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Header onSettingsClick={() => setSettingsOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar>
          <ResolutionSelector />
        </Sidebar>
        <MainArea />
        <AIPanel />
      </div>
    </div>
  );
}

export default App;
