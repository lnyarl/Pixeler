/**
 * ExportPhaseRoute — export 페이즈 진입점 (PR-δ).
 *
 * 게이트 (§5.4.1):
 * - 최소 1개 sprite 존재 (베이스 OR 방향 1개 OR 애니메이션 프레임 1개).
 * 미충족 시 베이스 페이즈로 redirect (베이스가 항상 첫 페이즈이므로).
 */

import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProjectStore } from "@/stores/projectStore";
import { useHistoryStore } from "@/stores/historyStore";
import ExportPhase from "./Export/ExportPhase";

export default function ExportPhaseRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const basePhase = useProjectStore((s) => s.basePhase);
  const directionsPhase = useProjectStore((s) => s.directionsPhase);
  const animationsPhase = useProjectStore((s) => s.animationsPhase);
  const setLastPhase = useProjectStore((s) => s.setLastPhase);
  const historyActiveId = useHistoryStore((s) => s.activeItemId);

  const hasBase =
    basePhase.activeSpriteId !== null || historyActiveId !== null;
  const hasDirections = Object.keys(directionsPhase.sprites).length > 0;
  const hasAnimationFrames = Object.values(animationsPhase.byDirection).some(
    (perDir) =>
      !!perDir &&
      perDir.animations.some((c) => c.frames.length > 0)
  );

  const eligible = hasBase || hasDirections || hasAnimationFrames;

  useEffect(() => {
    if (!eligible) {
      navigate(`/project/${id}/base`, { replace: true });
      return;
    }
    setLastPhase("export");
  }, [eligible, id, navigate, setLastPhase]);

  if (!eligible) return null;

  return <ExportPhase />;
}
