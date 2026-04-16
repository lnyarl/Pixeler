import { useState } from "react";
import { useHistoryStore, type HistoryItem } from "@/stores/historyStore";
import { useCanvasStore } from "@/stores/canvasStore";

interface HistoryPanelProps {
  onRestore: (imageData: ImageData) => void;
}

interface TreeNode {
  item: HistoryItem;
  children: TreeNode[];
  depth: number;
}

/** 히스토리 항목을 트리 구조로 변환 */
function buildTree(items: HistoryItem[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // 시간순으로 정렬 (오래된 것 먼저)
  const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp);

  for (const item of sorted) {
    const node: TreeNode = { item, children: [], depth: 0 };
    map.set(item.id, node);

    if (item.parentId && map.has(item.parentId)) {
      const parent = map.get(item.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** 트리를 DFS로 펼쳐서 플랫 리스트로 */
function flattenTree(
  nodes: TreeNode[],
  collapsed: Set<string>
): TreeNode[] {
  const result: TreeNode[] = [];

  function dfs(nodeList: TreeNode[]) {
    // 최신순으로 표시
    for (let i = nodeList.length - 1; i >= 0; i--) {
      const node = nodeList[i];
      result.push(node);
      if (node.children.length > 0 && !collapsed.has(node.item.id)) {
        dfs(node.children);
      }
    }
  }

  dfs(nodes);
  return result;
}

export default function HistoryPanel({ onRestore }: HistoryPanelProps) {
  const items = useHistoryStore((s) => s.items);
  const activeItemId = useHistoryStore((s) => s.activeItemId);
  const removeItem = useHistoryStore((s) => s.removeItem);
  const setActiveItemId = useHistoryStore((s) => s.setActiveItemId);
  const clearAll = useHistoryStore((s) => s.clear);
  const dirty = useCanvasStore((s) => s.dirty);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleClick(item: HistoryItem) {
    if (dirty) {
      if (
        !window.confirm(
          "현재 편집 내용을 버리고 이 버전을 로드하시겠습니까?"
        )
      )
        return;
    }
    onRestore(item.imageData);
    setActiveItemId(item.id);
  }

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (window.confirm("이 항목을 삭제하시겠습니까?")) {
      removeItem(id);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 font-medium">히스토리</label>
        <p className="text-xs text-gray-500">
          아직 생성된 이미지가 없습니다.
        </p>
      </div>
    );
  }

  const tree = buildTree(items);
  const flat = flattenTree(tree, collapsed);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-400 font-medium">
          히스토리 ({items.length})
        </label>
        <button
          onClick={() => {
            if (window.confirm("히스토리를 전부 삭제하시겠습니까?")) {
              clearAll();
            }
          }}
          className="text-[10px] text-gray-500 hover:text-red-400 transition-colors"
        >
          전체 삭제
        </button>
      </div>

      <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
        {flat.map((node) => {
          const { item, children, depth } = node;
          const isActive = item.id === activeItemId;
          const hasChildren = children.length > 0;
          const isCollapsed = collapsed.has(item.id);

          return (
            <div
              key={item.id}
              className={`flex items-start gap-1.5 p-1.5 rounded transition-colors cursor-pointer ${
                isActive
                  ? "bg-blue-900/40 border border-blue-700"
                  : "bg-gray-700/50 hover:bg-gray-600/50 border border-transparent"
              }`}
              style={{ marginLeft: depth * 16 }}
              onClick={() => handleClick(item)}
            >
              {/* 트리 토글 */}
              <div className="w-4 flex-shrink-0 pt-0.5">
                {hasChildren ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCollapse(item.id);
                    }}
                    className="text-[10px] text-gray-400 hover:text-white w-4 h-4 flex items-center justify-center"
                  >
                    {isCollapsed ? "▶" : "▼"}
                  </button>
                ) : depth > 0 ? (
                  <span className="text-[10px] text-gray-600 w-4 h-4 flex items-center justify-center">
                    └
                  </span>
                ) : null}
              </div>

              {/* 썸네일 */}
              <img
                src={`data:image/png;base64,${item.thumbnail}`}
                alt=""
                className="w-8 h-8 rounded border border-gray-600 object-contain flex-shrink-0"
                style={{ imageRendering: "pixelated" }}
              />

              {/* 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-300 truncate">
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
                  {hasChildren && (
                    <span className="text-gray-600">
                      {" "}
                      · {children.length}개 파생
                    </span>
                  )}
                </p>
              </div>

              {/* 삭제 */}
              <button
                onClick={(e) => handleDelete(e, item.id)}
                className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0 transition-colors"
                title="삭제"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
