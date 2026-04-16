import type { HistoryItem } from "@/stores/historyStore";

export interface GraphNode {
  item: HistoryItem;
  lane: number;
  row: number;
  children: GraphNode[];
}

export interface GraphLine {
  fromRow: number;
  fromLane: number;
  toRow: number;
  toLane: number;
}

export interface GraphLayout {
  nodes: GraphNode[];
  lines: GraphLine[];
  maxLane: number;
  rowCount: number;
}

/**
 * 히스토리 항목들을 git graph 레이아웃으로 변환.
 * 최신이 위(row 0), 오래된 것이 아래.
 */
export function computeGraphLayout(items: HistoryItem[]): GraphLayout {
  if (items.length === 0) {
    return { nodes: [], lines: [], maxLane: 0, rowCount: 0 };
  }

  const map = new Map<string, HistoryItem>();
  for (const item of items) map.set(item.id, item);

  // 자식 맵 구성
  const childrenMap = new Map<string, HistoryItem[]>();
  const roots: HistoryItem[] = [];

  for (const item of items) {
    if (!item.parentId || !map.has(item.parentId)) {
      roots.push(item);
    } else {
      const siblings = childrenMap.get(item.parentId) ?? [];
      siblings.push(item);
      childrenMap.set(item.parentId, siblings);
    }
  }

  // 시간순 정렬 (최신 먼저)
  roots.sort((a, b) => b.timestamp - a.timestamp);
  for (const [, children] of childrenMap) {
    children.sort((a, b) => b.timestamp - a.timestamp);
  }

  // DFS로 레인 할당 + 행 배정
  const nodes: GraphNode[] = [];
  const lines: GraphLine[] = [];
  const activeLanes = new Set<number>();
  let currentRow = 0;

  function getFreeLane(): number {
    let lane = 0;
    while (activeLanes.has(lane)) lane++;
    return lane;
  }

  function dfs(item: HistoryItem, lane: number) {
    activeLanes.add(lane);

    const children = childrenMap.get(item.id) ?? [];
    const node: GraphNode = {
      item,
      lane,
      row: currentRow++,
      children: [],
    };
    nodes.push(node);

    if (children.length === 0) {
      // 리프: 레인 반환
      activeLanes.delete(lane);
      return node;
    }

    // 첫 번째 자식은 같은 레인
    const firstChild = dfs(children[0], lane);
    node.children.push(firstChild);
    lines.push({
      fromRow: node.row,
      fromLane: node.lane,
      toRow: firstChild.row,
      toLane: firstChild.lane,
    });

    // 나머지 자식은 새 레인
    for (let i = 1; i < children.length; i++) {
      const newLane = getFreeLane();
      const childNode = dfs(children[i], newLane);
      node.children.push(childNode);
      lines.push({
        fromRow: node.row,
        fromLane: node.lane,
        toRow: childNode.row,
        toLane: childNode.lane,
      });
    }

    return node;
  }

  for (const root of roots) {
    const lane = getFreeLane();
    dfs(root, lane);
  }

  const maxLane = nodes.reduce((max, n) => Math.max(max, n.lane), 0);

  return { nodes, lines, maxLane, rowCount: currentRow };
}
