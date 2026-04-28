/**
 * ProjectWizard — 페이즈 wizard chrome (Header + StepIndicator + Outlet).
 *
 * `/project/:id` 트리 안에서 모든 페이즈가 공유하는 레이아웃. 페이즈 컴포넌트는 컨텐츠 영역만 채운다 (§4.2).
 * mount 시 IndexedDB에서 프로젝트를 로드하고, unmount 시 flush save.
 */

import { useEffect, useState, useRef } from "react";
import {
  Outlet,
  useNavigate,
  useParams,
  useOutletContext,
} from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useHistoryStore } from "@/stores/historyStore";
import { serializeHistoryToProject } from "@/utils/historyProjectBridge";
import PhaseStepIndicator from "./PhaseStepIndicator";
import type { AppOutletContext } from "@/App";

export default function ProjectWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ctx = useOutletContext<AppOutletContext | undefined>();
  const meta = useProjectStore((s) => s.meta);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const renameProject = useProjectStore((s) => s.renameProject);
  const flushSave = useProjectStore((s) => s.flushSave);
  const loadProject = useProjectStore((s) => s.loadProject);
  const resetProject = useProjectStore((s) => s.reset);
  const dirty = useProjectStore((s) => s.dirty);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "ready">(
    "idle"
  );
  const lastLoadedIdRef = useRef<string | null>(null);

  // 라우트 진입 시 IndexedDB에서 프로젝트 로드.
  useEffect(() => {
    if (!id) return;
    if (currentProjectId === id) {
      setLoadStatus("ready");
      return;
    }
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    loadProject(id)
      .then((ok) => {
        if (cancelled) return;
        if (ok) {
          lastLoadedIdRef.current = id;
          setLoadStatus("ready");
        } else {
          setLoadError("프로젝트를 찾을 수 없습니다");
          setLoadStatus("idle");
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError((e as Error).message);
        setLoadStatus("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [id, currentProjectId, loadProject]);

  // wizard unmount 시 flush + history clear.
  useEffect(() => {
    return () => {
      void flushSave(serializeHistoryToProject);
      useHistoryStore.getState().clear();
      resetProject();
    };
  }, [flushSave, resetProject]);

  function handleRenameSubmit() {
    if (nameDraft.trim()) renameProject(nameDraft);
    setRenaming(false);
  }

  async function handleBackToHub() {
    await flushSave(serializeHistoryToProject);
    navigate("/");
  }

  if (loadError) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 text-gray-300">
        <p>{loadError}</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          허브로 돌아가기
        </button>
      </div>
    );
  }

  if (loadStatus !== "ready" || !meta) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-400">
        프로젝트 불러오는 중...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToHub}
            className="text-gray-400 hover:text-white text-sm"
            data-testid="wizard-hub-button"
          >
            ← 허브
          </button>
          {renaming ? (
            <input
              type="text"
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleRenameSubmit()}
              className="px-2 py-0.5 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              data-testid="wizard-rename-input"
            />
          ) : (
            <button
              onClick={() => {
                setNameDraft(meta.name);
                setRenaming(true);
              }}
              className="text-white font-medium hover:text-blue-300"
              title="이름 변경"
              data-testid="wizard-project-name"
            >
              {meta.name}
            </button>
          )}
          {dirty && (
            <span
              className="text-xs text-yellow-400"
              data-testid="wizard-dirty-flag"
            >
              ●
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void flushSave(serializeHistoryToProject)}
            className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-200"
            data-testid="wizard-save-button"
          >
            저장
          </button>
          <button
            onClick={() => ctx?.openSettings()}
            className="text-gray-400 hover:text-white"
            aria-label="설정"
          >
            ⚙
          </button>
        </div>
      </header>

      <PhaseStepIndicator />

      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
