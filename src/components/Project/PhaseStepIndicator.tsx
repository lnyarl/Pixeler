/**
 * PhaseStepIndicator — 베이스/방향/애니메이션/Export 진행 표시.
 *
 * PR-α: 베이스 페이즈만 활성. 방향/애니메이션/Export는 disabled (placeholder).
 * PR-β/γ에서 게이트 조건에 따라 활성화 토글.
 */

import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useHistoryStore } from "@/stores/historyStore";
import type { LastPhase } from "@/services/persistence/types";

interface StepDef {
  key: LastPhase;
  label: string;
  path: string;
}

const STEPS: StepDef[] = [
  { key: "base", label: "베이스", path: "base" },
  { key: "directions", label: "방향", path: "directions" },
  { key: "animations", label: "애니메이션", path: "animations" },
  { key: "export", label: "Export", path: "export" },
];

export default function PhaseStepIndicator() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const basePhase = useProjectStore((s) => s.basePhase);
  const historyActive = useHistoryStore((s) => s.activeItemId);
  const directionsPhase = useProjectStore((s) => s.directionsPhase);

  function isActive(step: StepDef): boolean {
    return location.pathname.includes(`/${step.path}`);
  }

  function isLocked(step: StepDef): boolean {
    // 베이스: 항상 활성.
    if (step.key === "base") return false;
    // 방향: 베이스에 활성 sprite 있어야 함 (history 또는 projectStore.basePhase).
    const hasBase = historyActive !== null || basePhase.activeSpriteId !== null;
    if (step.key === "directions") return !hasBase;
    // 애니메이션: 1개 이상 방향 채워짐.
    const directionCount = Object.keys(directionsPhase.sprites).length;
    if (step.key === "animations") return !hasBase || directionCount === 0;
    // Export: 1개 이상 sprite 존재.
    if (step.key === "export") return !hasBase && directionCount === 0;
    return false;
  }

  function handleClick(step: StepDef) {
    if (isLocked(step) || !id) return;
    navigate(`/project/${id}/${step.path}`);
  }

  return (
    <nav
      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-850 border-b border-gray-700"
      data-testid="phase-step-indicator"
    >
      {STEPS.map((step, idx) => {
        const active = isActive(step);
        const locked = isLocked(step);
        return (
          <div key={step.key} className="flex items-center gap-2">
            <button
              onClick={() => handleClick(step)}
              disabled={locked}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : locked
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              title={locked ? `${step.label}는 아직 잠겨있습니다` : undefined}
              data-testid={`phase-step-${step.key}`}
            >
              {active ? "● " : "○ "}
              {step.label}
            </button>
            {idx < STEPS.length - 1 && (
              <span className="text-gray-600">─</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
