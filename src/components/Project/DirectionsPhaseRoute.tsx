/**
 * DirectionsPhaseRoute — 방향 페이즈 진입점.
 *
 * - 게이트: `projectStore.basePhase.activeSpriteId`가 null이면 베이스로 redirect.
 * - 게이트 통과 시 DirectionsPhase 컴포넌트 렌더 (PR-β 본 구현).
 */
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useHistoryStore } from "@/stores/historyStore";
import DirectionsPhase from "./Directions/DirectionsPhase";

export default function DirectionsPhaseRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePhase = useProjectStore((s) => s.basePhase);
  const setLastPhase = useProjectStore((s) => s.setLastPhase);
  const historyActiveId = useHistoryStore((s) => s.activeItemId);

  // 게이트: 활성 베이스가 history(현재 작업 중) 또는 projectStore에 있어야 함.
  const hasBase =
    historyActiveId !== null || basePhase.activeSpriteId !== null;

  useEffect(() => {
    if (!hasBase) {
      navigate(`/project/${id}/base`, { replace: true });
      return;
    }
    setLastPhase("directions");
  }, [hasBase, id, navigate, setLastPhase]);

  if (!hasBase) return null;

  return <DirectionsPhase />;
}
