/**
 * AnimationDirectionTabs — 방향 선택 탭 (γ-F2 / M2).
 *
 * - directionsPhase.sprites 기준으로 채워진/빈 방향 분기.
 * - 채워진 방향: 활성 클릭 가능.
 * - 빈 방향: disabled + tooltip "방향 페이즈로 돌아가서 채우세요" + 클릭 시 onEmptyClick 콜백.
 */
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import {
  getDirectionLayout,
} from "@/services/ai/spriteSheet/directionLayout";
import type { DirKey } from "@/services/persistence/types";

interface Props {
  active: DirKey;
  onSelect: (dir: DirKey) => void;
}

export default function AnimationDirectionTabs({ active, onSelect }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const directionsPhase = useProjectStore((s) => s.directionsPhase);
  const layout = getDirectionLayout(directionsPhase.mode);

  return (
    <nav
      className="flex flex-wrap items-center gap-1 px-3 py-2 bg-gray-850 border-b border-gray-700"
      data-testid="animation-direction-tabs"
    >
      {layout.map((cell) => {
        const filled = !!directionsPhase.sprites[cell.direction];
        const isActive = active === cell.direction;
        const testId = `animation-tab-${cell.direction}`;
        if (!filled) {
          return (
            <button
              key={cell.direction}
              onClick={() => navigate(`/project/${id}/directions`)}
              className="px-3 py-1 rounded text-xs font-mono bg-gray-800 text-gray-600 cursor-not-allowed border border-dashed border-gray-700"
              title="이 방향은 비어있습니다 — 방향 페이즈로 이동하여 생성"
              data-testid={testId}
              data-filled="false"
              data-active="false"
            >
              {cell.direction}
            </button>
          );
        }
        return (
          <button
            key={cell.direction}
            onClick={() => onSelect(cell.direction)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              isActive
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-200 hover:bg-gray-600"
            }`}
            data-testid={testId}
            data-filled="true"
            data-active={isActive ? "true" : "false"}
          >
            {cell.direction}
          </button>
        );
      })}
    </nav>
  );
}
