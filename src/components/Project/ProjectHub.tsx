/**
 * ProjectHub — 프로젝트 목록 + 새 프로젝트 만들기 ( `/` 라우트).
 *
 * 사용자 진입 지점. 여기서만 프로젝트 시작/이어가기를 선택할 수 있다 ("항상 프로젝트 모드").
 */

import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useProjectLibraryStore } from "@/stores/projectLibraryStore";
import { useProjectStore } from "@/stores/projectStore";
import type { AppOutletContext } from "@/App";

export default function ProjectHub() {
  const projects = useProjectLibraryStore((s) => s.projects);
  const loading = useProjectLibraryStore((s) => s.loading);
  const refresh = useProjectLibraryStore((s) => s.refresh);
  const removeProject = useProjectLibraryStore((s) => s.removeProject);
  const createProject = useProjectStore((s) => s.createProject);
  const resetProject = useProjectStore((s) => s.reset);
  const navigate = useNavigate();
  const ctx = useOutletContext<AppOutletContext | undefined>();
  const [creatingName, setCreatingName] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    // 허브 진입 = 현재 작업 프로젝트 unload.
    resetProject();
    void refresh();
  }, [refresh, resetProject]);

  async function handleCreate() {
    const name = projectName.trim();
    if (!name) return;
    const id = await createProject(name);
    setCreatingName(null);
    setProjectName("");
    navigate(`/project/${id}/base`);
  }

  function handleOpenProject(id: string, lastPhase: string) {
    navigate(`/project/${id}/${lastPhase || "base"}`);
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`"${name}" 프로젝트를 삭제하시겠습니까?`)) return;
    await removeProject(id);
  }

  return (
    <div className="flex flex-col h-full">
      <header className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <h1 className="text-lg font-bold text-white">Pixeler</h1>
        <button
          onClick={() => ctx?.openSettings()}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="설정"
        >
          ⚙
        </button>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">프로젝트</h2>
            <button
              onClick={() => setCreatingName("")}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm font-medium"
              data-testid="hub-new-project"
            >
              + 새 프로젝트
            </button>
          </div>

          {creatingName !== null && (
            <div
              className="mb-6 p-4 bg-gray-800 rounded border border-gray-700"
              data-testid="hub-new-project-form"
            >
              <label className="block text-sm text-gray-300 mb-2">
                프로젝트 이름
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="예: 영웅 캐릭터"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  data-testid="hub-new-project-name"
                />
                <button
                  onClick={handleCreate}
                  disabled={!projectName.trim()}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-sm"
                  data-testid="hub-new-project-confirm"
                >
                  만들기
                </button>
                <button
                  onClick={() => {
                    setCreatingName(null);
                    setProjectName("");
                  }}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm"
                >
                  취소
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-gray-400">불러오는 중...</p>
          ) : projects.length === 0 ? (
            <div className="text-center text-gray-400 py-16">
              아직 프로젝트가 없습니다. "새 프로젝트"로 시작해보세요.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <article
                  key={p.id}
                  className="bg-gray-800 border border-gray-700 rounded p-4 hover:border-blue-500 transition-colors flex flex-col"
                  data-testid="hub-project-card"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-white truncate flex-1">
                      {p.name}
                    </h3>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="text-gray-500 hover:text-red-400 ml-2"
                      aria-label="프로젝트 삭제"
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>

                  <div
                    className="bg-gray-900 border border-gray-700 rounded mb-2 overflow-hidden flex items-center justify-center"
                    style={{ aspectRatio: "1" }}
                  >
                    {p.thumbnailBase64 ? (
                      <img
                        src={p.thumbnailBase64}
                        alt={`${p.name} 썸네일`}
                        className="w-full h-full object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <span className="text-gray-600 text-xs">미리보기 없음</span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    {p.width}×{p.height} · {p.lastPhase}
                  </div>

                  <button
                    onClick={() => handleOpenProject(p.id, p.lastPhase)}
                    className="mt-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                  >
                    이어 작업
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
