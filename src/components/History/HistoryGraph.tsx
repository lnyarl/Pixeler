import { useMemo } from "react";
import { computeGraphLayout, type GraphNode, type GraphLine } from "./graphLayout";
import type { HistoryItem } from "@/stores/historyStore";

const ROW_HEIGHT = 48;
const LANE_WIDTH = 16;
const GUTTER_PAD = 12;
const DOT_RADIUS = 5;

interface HistoryGraphProps {
  items: HistoryItem[];
  activeItemId: string | null;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

export default function HistoryGraph({
  items,
  activeItemId,
  onSelect,
  onDelete,
}: HistoryGraphProps) {
  const layout = useMemo(() => computeGraphLayout(items), [items]);

  if (layout.rowCount === 0) return null;

  const gutterWidth = GUTTER_PAD * 2 + (layout.maxLane + 1) * LANE_WIDTH;
  const svgHeight = layout.rowCount * ROW_HEIGHT;

  function laneX(lane: number) {
    return GUTTER_PAD + lane * LANE_WIDTH + LANE_WIDTH / 2;
  }

  function rowY(row: number) {
    return row * ROW_HEIGHT + ROW_HEIGHT / 2;
  }

  return (
    <div className="flex overflow-auto" style={{ maxHeight: 400 }}>
      {/* SVG 거터 */}
      <svg
        width={gutterWidth}
        height={svgHeight}
        className="flex-shrink-0"
      >
        {/* 연결선 */}
        {layout.lines.map((line, i) => (
          <GraphLineElement key={i} line={line} laneX={laneX} rowY={rowY} />
        ))}

        {/* 커밋 점 */}
        {layout.nodes.map((node) => (
          <circle
            key={node.item.id}
            cx={laneX(node.lane)}
            cy={rowY(node.row)}
            r={DOT_RADIUS}
            className={
              node.item.id === activeItemId
                ? "fill-blue-500"
                : "fill-gray-400"
            }
          />
        ))}
      </svg>

      {/* 항목 리스트 */}
      <div className="flex-1 min-w-0">
        {layout.nodes.map((node) => (
          <HistoryRow
            key={node.item.id}
            node={node}
            isActive={node.item.id === activeItemId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function GraphLineElement({
  line,
  laneX,
  rowY,
}: {
  line: GraphLine;
  laneX: (lane: number) => number;
  rowY: (row: number) => number;
}) {
  const x1 = laneX(line.fromLane);
  const y1 = rowY(line.fromRow);
  const x2 = laneX(line.toLane);
  const y2 = rowY(line.toRow);

  if (x1 === x2) {
    // 같은 레인: 직선
    return (
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="#6b7280" strokeWidth={2}
      />
    );
  }

  // 다른 레인: 꺾은선 (아래로 → 옆으로)
  const midY = y2 - ROW_HEIGHT / 4;
  return (
    <path
      d={`M${x1},${y1} L${x1},${midY} Q${x1},${y2} ${x2},${y2}`}
      fill="none"
      stroke="#6b7280"
      strokeWidth={2}
    />
  );
}

function HistoryRow({
  node,
  isActive,
  onSelect,
  onDelete,
}: {
  node: GraphNode;
  isActive: boolean;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const { item } = node;

  return (
    <div
      className={`flex items-center gap-1.5 px-1.5 cursor-pointer transition-colors ${
        isActive
          ? "bg-blue-900/40 border-l-2 border-blue-500"
          : "hover:bg-gray-700/50 border-l-2 border-transparent"
      }`}
      style={{ height: ROW_HEIGHT }}
      onClick={() => onSelect(item)}
    >
      <img
        src={`data:image/png;base64,${item.thumbnail}`}
        alt=""
        className="w-8 h-8 rounded border border-gray-600 object-contain flex-shrink-0"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-300 truncate">{item.prompt}</p>
        <p className="text-[10px] text-gray-500">
          {item.type === "generate" && "생성"}
          {item.type === "feedback" && "수정"}
          {item.type === "inpaint" && "부분 수정"}
          {" · "}
          {new Date(item.timestamp).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm("이 항목을 삭제하시겠습니까?")) {
            onDelete(item.id);
          }
        }}
        className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0 transition-colors"
        title="삭제"
      >
        ×
      </button>
    </div>
  );
}
