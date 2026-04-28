/**
 * AnimationsPhaseRoute — placeholder ("준비 중", PR-γ에서 활성화).
 *
 * 게이트 (M2): 베이스 sprite + 1개 이상 방향 sprite가 있어야 진입 가능.
 */

import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";

export default function AnimationsPhaseRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePhase = useProjectStore((s) => s.basePhase);
  const directionsPhase = useProjectStore((s) => s.directionsPhase);
  const setLastPhase = useProjectStore((s) => s.setLastPhase);

  useEffect(() => {
    if (basePhase.activeSpriteId === null) {
      navigate(`/project/${id}/base`, { replace: true });
      return;
    }
    const directionCount = Object.keys(directionsPhase.sprites).length;
    if (directionCount === 0) {
      // 1방향도 없으면 directions로 redirect (M2 — γ 채택).
      navigate(`/project/${id}/directions`, { replace: true });
      return;
    }
    setLastPhase("animations");
  }, [
    basePhase.activeSpriteId,
    directionsPhase.sprites,
    id,
    navigate,
    setLastPhase,
  ]);

  if (basePhase.activeSpriteId === null) return null;
  if (Object.keys(directionsPhase.sprites).length === 0) return null;

  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-8">
      <h2 className="text-2xl font-semibold text-white mb-2">애니메이션 페이즈</h2>
      <p className="text-gray-400 mb-6 max-w-md">
        준비 중입니다. PR-γ에서 방향별 애니메이션 + 4 프리셋 + 프리뷰 재생이
        활성화됩니다.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/project/${id}/directions`)}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 text-sm"
        >
          ← 방향 페이즈
        </button>
      </div>
    </div>
  );
}
