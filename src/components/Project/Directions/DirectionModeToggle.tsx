/**
 * DirectionModeToggle — 4 / 8 방향 모드 토글.
 */
import { useProjectStore } from "@/stores/projectStore";
import type { DirectionMode } from "@/services/persistence/types";

export default function DirectionModeToggle() {
  const mode = useProjectStore((s) => s.directionsPhase.mode);
  const setMode = useProjectStore((s) => s.setDirectionMode);

  function handleSelect(next: DirectionMode) {
    if (next === mode) return;
    setMode(next);
  }

  return (
    <div className="flex gap-2 items-center" data-testid="direction-mode-toggle">
      <span className="text-sm text-gray-300">방향</span>
      <button
        onClick={() => handleSelect(4)}
        className={`px-3 py-1 rounded text-sm transition-colors ${
          mode === 4
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
        data-testid="direction-mode-4"
      >
        4
      </button>
      <button
        onClick={() => handleSelect(8)}
        className={`px-3 py-1 rounded text-sm transition-colors ${
          mode === 8
            ? "bg-blue-600 text-white"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
        data-testid="direction-mode-8"
      >
        8
      </button>
    </div>
  );
}
