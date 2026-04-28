/**
 * AnimationsPhaseRoute — 애니메이션 페이즈 진입점 (PR-γ).
 *
 * 게이트 (M2 — γ 채택):
 * - 베이스 sprite 보유 (history 또는 projectStore.basePhase).
 * - 1개 이상 방향 sprite 보유.
 * 미충족 시 적절한 페이즈로 redirect.
 */

import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useHistoryStore } from "@/stores/historyStore";
import AnimationsPhase from "./Animations/AnimationsPhase";

export default function AnimationsPhaseRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePhase = useProjectStore((s) => s.basePhase);
  const directionsPhase = useProjectStore((s) => s.directionsPhase);
  const setLastPhase = useProjectStore((s) => s.setLastPhase);
  const historyActiveId = useHistoryStore((s) => s.activeItemId);

  const hasBase =
    historyActiveId !== null || basePhase.activeSpriteId !== null;
  const directionCount = Object.keys(directionsPhase.sprites).length;

  useEffect(() => {
    if (!hasBase) {
      navigate(`/project/${id}/base`, { replace: true });
      return;
    }
    if (directionCount === 0) {
      navigate(`/project/${id}/directions`, { replace: true });
      return;
    }
    setLastPhase("animations");
  }, [hasBase, directionCount, id, navigate, setLastPhase]);

  if (!hasBase) return null;
  if (directionCount === 0) return null;

  return <AnimationsPhase />;
}
