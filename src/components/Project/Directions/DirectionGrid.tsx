/**
 * DirectionGrid — 4 또는 8방향 셀 그리드 렌더링 (§5.2.2 좌표 표 기반).
 *
 * - 4방향: 2×2 grid.
 * - 8방향: 3×3 grid (mid-center는 빈 placeholder).
 */
import { useProjectStore } from "@/stores/projectStore";
import {
  getDirectionLayout,
  getGridSize,
} from "@/services/ai/spriteSheet/directionLayout";
import type { DirKey } from "@/services/persistence/types";
import DirectionCell from "./DirectionCell";

interface DirectionGridProps {
  selected: DirKey | null;
  onSelect: (dir: DirKey) => void;
  onRegenerate: (dir: DirKey) => void;
  onDevRegenerate?: (dir: DirKey) => void;
  onClear: (dir: DirKey) => void;
  busyDirection: DirKey | null;
}

export default function DirectionGrid({
  selected,
  onSelect,
  onRegenerate,
  onDevRegenerate,
  onClear,
  busyDirection,
}: DirectionGridProps) {
  const mode = useProjectStore((s) => s.directionsPhase.mode);
  const sprites = useProjectStore((s) => s.directionsPhase.sprites);

  const { cols, rows } = getGridSize(mode);
  const layout = getDirectionLayout(mode);

  // grid (col,row) → DirKey 매핑.
  const gridMap: Record<string, DirKey> = {};
  layout.forEach((c) => {
    gridMap[`${c.col},${c.row}`] = c.direction;
  });

  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${c},${r}`;
      const dir = gridMap[key];
      if (!dir) {
        // 8방향 mid-center skip.
        cells.push(
          <div
            key={key}
            className="bg-gray-900 rounded p-2 ring-1 ring-gray-800 flex items-center justify-center text-gray-700 text-xs"
            data-testid="direction-cell-skip"
          >
            (empty)
          </div>
        );
        continue;
      }
      cells.push(
        <DirectionCell
          key={dir}
          direction={dir}
          sprite={sprites[dir]}
          selected={selected === dir}
          onSelect={() => onSelect(dir)}
          onRegenerate={() => onRegenerate(dir)}
          onDevRegenerate={onDevRegenerate ? () => onDevRegenerate(dir) : undefined}
          onClear={() => onClear(dir)}
          busy={busyDirection === dir}
        />
      );
    }
  }

  return (
    <div
      className="grid gap-2"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
      data-testid="direction-grid"
    >
      {cells}
    </div>
  );
}
