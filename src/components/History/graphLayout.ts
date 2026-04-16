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
 * 메인 라인: 가장 먼저 생성된 자식이 부모와 같은 레인(직선).
 * 분기: 나중에 생성된 자식이 오른쪽으로 삐져나감.
 */
export function computeGraphLayout(items: HistoryItem[]): GraphLayout {
  if (items.length === 0) {
    return { nodes: [], lines: [], maxLane: 0, rowCount: 0 };
  }

  const map = new Map<string, HistoryItem>();
  for (const item of items) map.set(item.id, item);

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

  // 오래된 먼저 정렬 (메인 라인이 먼저 생성된 자식)
  roots.sort((a, b) => a.timestamp - b.timestamp);
  for (const [, children] of childrenMap) {
    children.sort((a, b) => a.timestamp - b.timestamp);
  }

  const nodes: GraphNode[] = [];
  const lines: GraphLine[] = [];
  let currentRow = 0;
  const activeLanes = new Set<number>();

  function getFreeLaneRight(): number {
    let lane = 0;
    while (activeLanes.has(lane)) lane++;
    return lane;
  }

  function dfs(item: HistoryItem, lane: number): GraphNode {
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
      activeLanes.delete(lane);
      return node;
    }

    // 분기용 레인 미리 예약 (2번째 자식부터 오른쪽으로)
    const branchLanes: number[] = [];
    for (let i = 1; i < children.length; i++) {
      const newLane = getFreeLaneRight();
      activeLanes.add(newLane);
      branchLanes.push(newLane);
    }

    // 첫 자식(가장 오래된) = 메인 라인, 같은 레인 직선
    const mainChild = dfs(children[0], lane);
    node.children.push(mainChild);
    lines.push({
      fromRow: node.row, fromLane: lane,
      toRow: mainChild.row, toLane: mainChild.lane,
    });

    // 나머지 자식 = 분기, 오른쪽으로 삐져나감
    for (let i = 1; i < children.length; i++) {
      const branchChild = dfs(children[i], branchLanes[i - 1]);
      node.children.push(branchChild);
      lines.push({
        fromRow: node.row, fromLane: lane,
        toRow: branchChild.row, toLane: branchChild.lane,
      });
    }

    return node;
  }

  for (const root of roots) {
    const lane = getFreeLaneRight();
    dfs(root, lane);
  }

  const maxLane = nodes.reduce((max, n) => Math.max(max, n.lane), 0);
  return { nodes, lines, maxLane, rowCount: currentRow };
}
