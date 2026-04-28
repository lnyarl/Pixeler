import { useState } from "react";
import { Outlet } from "react-router-dom";
import ApiKeySettings from "./components/Settings/ApiKeySettings";
import DebugLogPanel from "./components/Debug/DebugLogPanel";
import { useBeforeUnload } from "./hooks/useBeforeUnload";

/**
 * 루트 레이아웃 — 라우트 chrome 책임.
 *
 * 이전에는 단일 페이지 레이아웃을 직접 그렸으나, PR-α에서 라우터 도입과 함께
 * `Outlet`이 ProjectHub / ProjectWizard를 렌더한다. ApiKeySettings(전역 모달)와
 * DebugLogPanel(DEV 전용 패널)은 모든 라우트에서 공통.
 *
 * 기존 single-image의 데스크톱/모바일 분기와 single-page UI는 BasePhaseRoute로 이전.
 */
function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  useBeforeUnload();

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Outlet
        context={{
          openSettings: () => setSettingsOpen(true),
        }}
      />
      {settingsOpen && (
        <ApiKeySettings onClose={() => setSettingsOpen(false)} />
      )}
      <DebugLogPanel />
    </div>
  );
}

export default App;

export interface AppOutletContext {
  openSettings: () => void;
}
