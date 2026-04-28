/**
 * Pixeler 라우트 정의 (§4.1).
 *
 * BrowserRouter 사용. Tauri 래핑 시 file:// 환경에서는 HashRouter로 토글 필요 (메모리 항목 4).
 */

import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "./App";
import ProjectHub from "./components/Project/ProjectHub";
import ProjectWizard from "./components/Project/ProjectWizard";
import BasePhaseRoute from "./components/Project/BasePhaseRoute";
import DirectionsPhaseRoute from "./components/Project/DirectionsPhaseRoute";
import AnimationsPhaseRoute from "./components/Project/AnimationsPhaseRoute";
import ExportPhaseRoute from "./components/Project/ExportPhaseRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <ProjectHub />,
      },
      {
        path: "project/:id",
        element: <ProjectWizard />,
        children: [
          { index: true, element: <Navigate to="base" replace /> },
          { path: "base", element: <BasePhaseRoute /> },
          { path: "directions", element: <DirectionsPhaseRoute /> },
          { path: "animations", element: <AnimationsPhaseRoute /> },
          { path: "animations/:direction", element: <AnimationsPhaseRoute /> },
          { path: "export", element: <ExportPhaseRoute /> },
        ],
      },
    ],
  },
]);
