/**
 * AnimationClipList — 클립 목록 + 추가/삭제/이름 변경/선택 (γ-F11).
 */
import { useState } from "react";
import type { AnimationClip } from "@/services/persistence/types";

interface Props {
  clips: AnimationClip[];
  selectedClipId: string | null;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}

export default function AnimationClipList({
  clips,
  selectedClipId,
  onSelect,
  onRename,
  onRemove,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(c: AnimationClip) {
    setEditingId(c.id);
    setDraft(c.name);
  }

  function commitEdit() {
    if (editingId && draft.trim()) onRename(editingId, draft.trim());
    setEditingId(null);
  }

  return (
    <ul
      className="flex flex-col gap-1"
      data-testid="animation-clip-list"
    >
      {clips.length === 0 && (
        <li className="text-xs text-gray-500 px-2 py-1">
          아직 애니메이션이 없습니다.
        </li>
      )}
      {clips.map((c) => {
        const active = c.id === selectedClipId;
        return (
          <li
            key={c.id}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer ${
              active
                ? "bg-blue-700 text-white"
                : "bg-gray-800 text-gray-200 hover:bg-gray-700"
            }`}
            onClick={() => onSelect(c.id)}
            data-testid={`animation-clip-item-${c.id}`}
            data-selected={active ? "true" : "false"}
          >
            {editingId === c.id ? (
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                className="flex-1 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-white"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="flex-1 truncate"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  startEdit(c);
                }}
                title="더블클릭으로 이름 변경"
              >
                {c.name}
              </span>
            )}
            <span className="text-[10px] font-mono opacity-60">
              {c.frames.length}f
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(c.id);
              }}
              className="text-gray-400 hover:text-red-400 px-1"
              title="삭제"
              data-testid={`animation-clip-remove-${c.id}`}
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}
