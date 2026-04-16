import { useMemo } from "react";
import { computeGraphLayout, type GraphNode, type GraphLine } from "./graphLayout";
import type { HistoryItem } from "@/stores/historyStore";

const ROW_HEIGHT = 48;
const LANE_WIDTH = 24;
const GUTTER_PAD = 12;
const DOT_RADIUS = 5;

const COLOR_DEFAULT_LINE = "#4b5563";
const COLOR_DEFAULT_DOT = "#6b7280";
const COLOR_ACTIVE_DOT = "#3b82f6";
const COLOR_LINEAGE_LINE = "#a3e635";  // lime-400
const COLOR_LINEAGE_DOT = "#84cc16";   // lime-500

interface HistoryGraphProps {
  items: HistoryItem[];
  activeItemId: string | null;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

/** activeItemId에서 root까지 조상 id 집합 */
function getLineageIds(items: HistoryItem[], activeId: string | null): Set<string> {
  const ids = new Set<string>();
  if (!activeId) return ids;

  const map = new Map<string, HistoryItem>();
  for (const item of items) map.set(item.id, item);

  let current = map.get(activeId);
  while (current) {
    ids.add(current.id);
    current = current.parentId ? map.get(current.parentId) : undefined;
  }

  return ids;
}

/** 선이 계보 경로에 있는지 (양쪽 노드가 모두 계보에 속함) */
function isLineageEdge(line: GraphLine, nodes: GraphNode[], lineageIds: Set<string>): boolean {
  const fromNode = nodes.find(n => n.row === line.fromRow && n.lane === line.fromLane);
  const toNode = nodes.find(n => n.row === line.toRow && n.lane === line.toLane);
  if (!fromNode || !toNode) return false;
  return lineageIds.has(fromNode.item.id) && lineageIds.has(toNode.item.id);
}

export default function HistoryGraph({
  items,
  activeItemId,
  onSelect,
  onDelete,
}: HistoryGraphProps) {
  const layout = useMemo(() => computeGraphLayout(items), [items]);
  const lineageIds = useMemo(() => getLineageIds(items, activeItemId), [items, activeItemId]);

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
        {/* 연결선 (기본 먼저, 계보 나중에 그려서 위에 표시) */}
        {layout.lines
          .filter(line => !isLineageEdge(line, layout.nodes, lineageIds))
          .map((line, i) => (
            <GraphLineElement
              key={`d-${i}`}
              line={line}
              laneX={laneX}
              rowY={rowY}
              color={COLOR_DEFAULT_LINE}
            />
          ))}
        {layout.lines
          .filter(line => isLineageEdge(line, layout.nodes, lineageIds))
          .map((line, i) => (
            <GraphLineElement
              key={`l-${i}`}
              line={line}
              laneX={laneX}
              rowY={rowY}
              color={COLOR_LINEAGE_LINE}
            />
          ))}

        {/* 커밋 점 */}
        {layout.nodes.map((node) => {
          const isActive = node.item.id === activeItemId;
          const isLineage = lineageIds.has(node.item.id);
          const fill = isActive
            ? COLOR_ACTIVE_DOT
            : isLineage
              ? COLOR_LINEAGE_DOT
              : COLOR_DEFAULT_DOT;

          return (
            <circle
              key={node.item.id}
              cx={laneX(node.lane)}
              cy={rowY(node.row)}
              r={isActive ? DOT_RADIUS + 1 : DOT_RADIUS}
              fill={fill}
            />
          );
        })}
      </svg>

      {/* 항목 리스트 */}
      <div className="flex-1 min-w-0">
        {layout.nodes.map((node) => (
          <HistoryRow
            key={node.item.id}
            node={node}
            isActive={node.item.id === activeItemId}
            isLineage={lineageIds.has(node.item.id)}
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
  color,
}: {
  line: GraphLine;
  laneX: (lane: number) => number;
  rowY: (row: number) => number;
  color: string;
}) {
  const x1 = laneX(line.fromLane);
  const y1 = rowY(line.fromRow);
  const x2 = laneX(line.toLane);
  const y2 = rowY(line.toRow);

  if (x1 === x2) {
    return (
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth={2}
      />
    );
  }

  const turnY = y1 + ROW_HEIGHT / 3;
  return (
    <path
      d={`M${x1},${y1} L${x1},${turnY} Q${x1},${turnY + 8} ${x2},${turnY + 8} L${x2},${y2}`}
      fill="none"
      stroke={color}
      strokeWidth={2}
    />
  );
}

function HistoryRow({
  node,
  isActive,
  isLineage,
  onSelect,
  onDelete,
}: {
  node: GraphNode;
  isActive: boolean;
  isLineage: boolean;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const { item } = node;

  const borderClass = isActive
    ? "border-l-2 border-blue-500 bg-blue-900/40"
    : isLineage
      ? "border-l-2 border-lime-600/50 bg-lime-900/10"
      : "border-l-2 border-transparent hover:bg-gray-700/50";

  return (
    <div
      className={`flex items-center gap-1.5 px-1.5 cursor-pointer transition-colors ${borderClass}`}
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
        <p className={`text-[11px] truncate ${isLineage ? "text-lime-300" : "text-gray-300"}`}>
          {item.prompt}
        </p>
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
