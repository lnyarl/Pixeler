/**
 * DirectionsPhaseRoute — placeholder ("준비 중", PR-β에서 활성화).
 *
 * 게이트: `projectStore.basePhase.activeSpriteId`가 null이면 베이스로 redirect.
 */

import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";

export default function DirectionsPhaseRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePhase = useProjectStore((s) => s.basePhase);
  const setLastPhase = useProjectStore((s) => s.setLastPhase);

  useEffect(() => {
    if (basePhase.activeSpriteId === null) {
      // 게이트 미충족 — 베이스로 redirect.
      navigate(`/project/${id}/base`, { replace: true });
      return;
    }
    setLastPhase("directions");
  }, [basePhase.activeSpriteId, id, navigate, setLastPhase]);

  if (basePhase.activeSpriteId === null) return null;

  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-8">
      <h2 className="text-2xl font-semibold text-white mb-2">방향 페이즈</h2>
      <p className="text-gray-400 mb-6 max-w-md">
        준비 중입니다. PR-β에서 4/8방향 시트 생성 + 셀별 재생성 기능이
        활성화됩니다.
      </p>
      <button
        onClick={() => navigate(`/project/${id}/base`)}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 text-sm"
        data-testid="directions-back-base"
      >
        ← 베이스 페이즈
      </button>
    </div>
  );
}
