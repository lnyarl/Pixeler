/**
 * ExportPhaseRoute — placeholder ("준비 중", PR-δ에서 활성화).
 *
 * 게이트: 활성 sprite가 1개 이상 (베이스 또는 방향).
 */

import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";

export default function ExportPhaseRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePhase = useProjectStore((s) => s.basePhase);
  const directionsPhase = useProjectStore((s) => s.directionsPhase);
  const setLastPhase = useProjectStore((s) => s.setLastPhase);

  useEffect(() => {
    const hasBase = basePhase.activeSpriteId !== null;
    const hasDirections = Object.keys(directionsPhase.sprites).length > 0;
    if (!hasBase && !hasDirections) {
      navigate(`/project/${id}/base`, { replace: true });
      return;
    }
    setLastPhase("export");
  }, [
    basePhase.activeSpriteId,
    directionsPhase.sprites,
    id,
    navigate,
    setLastPhase,
  ]);

  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-8">
      <h2 className="text-2xl font-semibold text-white mb-2">Export</h2>
      <p className="text-gray-400 mb-6 max-w-md">
        준비 중입니다. PR-δ에서 시트 PNG + 메타 JSON 별도 다운로드 기능이
        활성화됩니다.
      </p>
      <button
        onClick={() => navigate(`/project/${id}/base`)}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 text-sm"
      >
        ← 베이스 페이즈
      </button>
    </div>
  );
}
