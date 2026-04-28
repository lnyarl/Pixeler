/**
 * ExportPhase — export 페이즈 본체 (PR-δ / §5.4).
 *
 * - cells 수집: 베이스 활성 sprite + 채워진 방향 sprite + 모든 애니메이션 프레임.
 * - 옵션: 레이아웃(directional/flat) + 패딩(0~4) + 배경(transparent/단색).
 * - 옵션 변경 시 즉시 재합성 → SheetPreview/MetaPreview 갱신.
 * - PNG/JSON 별도 다운로드 버튼 (M7 — ZIP 없음).
 *
 * 진입 조건은 ExportPhaseRoute의 useEffect에서 검증 (최소 1개 sprite).
 */

import { useEffect, useMemo, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useHistoryStore } from "@/stores/historyStore";
import { serializeHistoryToProject } from "@/utils/historyProjectBridge";
import {
  composeSpriteSheet,
  type CellInput,
  type ExportLayoutMode,
  type ExportBackground,
  type ComposeResult,
} from "@/services/export/spriteSheet";
import {
  buildExportMeta,
  serializeExportMeta,
  type ExportMeta,
} from "@/services/export/metaJson";
import SheetPreview from "./SheetPreview";
import MetaPreview from "./MetaPreview";

const PADDING_OPTIONS = [0, 1, 2, 4];

export default function ExportPhase() {
  const meta = useProjectStore((s) => s.meta);
  const basePhase = useProjectStore((s) => s.basePhase);
  const directionsPhase = useProjectStore((s) => s.directionsPhase);
  const animationsPhase = useProjectStore((s) => s.animationsPhase);

  // 베이스 활성 sprite를 찾기 — projectStore.basePhase에서 우선, 비어있으면 historyStore.
  // (베이스 페이즈에서 떠나면서 serializeHistoryToProject가 실행되므로 둘 중 하나엔 있다.)
  const historyItems = useHistoryStore((s) => s.items);
  const historyActiveId = useHistoryStore((s) => s.activeItemId);

  const [layoutMode, setLayoutMode] = useState<ExportLayoutMode>("directional");
  const [padding, setPadding] = useState<number>(0);
  const [bgKind, setBgKind] = useState<"transparent" | "solid">("transparent");
  const [bgColor, setBgColor] = useState<string>("#000000");

  const [includeBase, setIncludeBase] = useState<boolean>(true);

  // export 페이즈 진입 시 — 베이스 sprite를 fix (history → project bridge가 이미 동기화했을 수 있지만 안전하게 한 번 더).
  useEffect(() => {
    serializeHistoryToProject();
    // 의도적으로 deps []. 마운트 시 1회.
  }, []);

  // cells 수집 — projectStore와 historyStore 둘 다 검사.
  const cells = useMemo<CellInput[]>(() => {
    const out: CellInput[] = [];

    // 베이스: projectStore.basePhase 우선, 비어 있으면 historyStore.
    if (includeBase) {
      const baseSprite = basePhase.activeSpriteId
        ? basePhase.sprites.find((s) => s.id === basePhase.activeSpriteId)
        : null;
      if (baseSprite) {
        out.push({ imageData: baseSprite.imageData, type: "base" });
      } else if (historyActiveId) {
        const histItem = historyItems.find((h) => h.id === historyActiveId);
        if (histItem) {
          out.push({ imageData: histItem.imageData, type: "base" });
        }
      }
    }

    // 방향.
    for (const [dir, sprite] of Object.entries(directionsPhase.sprites)) {
      if (!sprite) continue;
      out.push({
        imageData: sprite.imageData,
        type: "direction",
        direction: dir as CellInput["direction"],
      });
    }

    // 애니메이션 프레임.
    for (const [dir, perDir] of Object.entries(animationsPhase.byDirection)) {
      if (!perDir) continue;
      for (const clip of perDir.animations) {
        clip.frames.forEach((f, idx) => {
          out.push({
            imageData: f.imageData,
            type: "animation-frame",
            direction: dir as CellInput["direction"],
            animationId: clip.id,
            frameIndex: idx,
          });
        });
      }
    }

    return out;
  }, [
    includeBase,
    basePhase,
    directionsPhase,
    animationsPhase,
    historyActiveId,
    historyItems,
  ]);

  const background: ExportBackground = bgKind === "solid" ? bgColor : "transparent";

  const [composed, setComposed] = useState<ComposeResult | null>(null);
  const [composeError, setComposeError] = useState<string | null>(null);

  // 옵션/cells 변경 시 재합성.
  useEffect(() => {
    let cancelled = false;
    if (cells.length === 0) {
      setComposed(null);
      setComposeError(null);
      return;
    }
    composeSpriteSheet(cells, {
      mode: layoutMode,
      padding,
      background,
    })
      .then((result) => {
        if (cancelled) return;
        setComposed(result);
        setComposeError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setComposeError((e as Error).message);
        setComposed(null);
      });
    return () => {
      cancelled = true;
    };
  }, [cells, layoutMode, padding, background]);

  const exportMeta = useMemo<ExportMeta | null>(() => {
    if (!composed || !meta) return null;
    return buildExportMeta({
      meta,
      directionsPhase,
      animationsPhase,
      layout: composed.layout,
      placements: composed.placements,
    });
  }, [composed, meta, directionsPhase, animationsPhase]);

  const exportMetaJson = useMemo(() => {
    if (!exportMeta) return "";
    return serializeExportMeta(exportMeta);
  }, [exportMeta]);

  const baseFilename = useMemo(() => {
    const stamp = formatTimestamp();
    const safe = (meta?.name ?? "pixeler-project")
      .trim()
      .replace(/[^a-zA-Z0-9_\-가-힣]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return `${safe || "pixeler-project"}-${stamp}`;
  }, [meta?.name]);

  function downloadPng() {
    if (!composed) return;
    triggerBlobDownload(composed.sheet, `${baseFilename}.png`);
  }

  function downloadJson() {
    if (!exportMetaJson) return;
    const blob = new Blob([exportMetaJson], { type: "application/json" });
    triggerBlobDownload(blob, `${baseFilename}.json`);
  }

  return (
    <div
      className="flex flex-col h-full bg-gray-900 text-gray-200 overflow-auto"
      data-testid="export-phase"
    >
      <div className="p-6 max-w-6xl mx-auto w-full">
        <h2 className="text-xl font-semibold text-white mb-4">
          내보내기
        </h2>

        {composeError && (
          <div
            className="mb-4 p-3 bg-red-900/40 border border-red-700 text-red-200 text-sm rounded"
            data-testid="export-error"
          >
            합성 실패: {composeError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-850 border border-gray-700 rounded p-3">
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              시트 미리보기
            </h3>
            <SheetPreview
              imageData={composed?.sheetImageData ?? null}
              maxWidth={480}
              maxHeight={400}
            />
          </div>
          <div className="bg-gray-850 border border-gray-700 rounded p-3">
            <h3 className="text-sm font-medium text-gray-300 mb-2">
              meta.json
            </h3>
            <MetaPreview json={exportMetaJson} maxHeight={400} />
          </div>
        </div>

        <div className="bg-gray-850 border border-gray-700 rounded p-4 space-y-3 mb-4">
          <h3 className="text-sm font-medium text-gray-300">옵션</h3>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400 w-20">레이아웃</span>
            <button
              onClick={() => setLayoutMode("directional")}
              className={`px-3 py-1 rounded ${
                layoutMode === "directional"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              data-testid="export-layout-directional"
            >
              방향×프레임
            </button>
            <button
              onClick={() => setLayoutMode("flat")}
              className={`px-3 py-1 rounded ${
                layoutMode === "flat"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              data-testid="export-layout-flat"
            >
              평면 나열
            </button>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400 w-20">패딩</span>
            {PADDING_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => setPadding(p)}
                className={`px-3 py-1 rounded ${
                  padding === p
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
                data-testid={`export-padding-${p}`}
              >
                {p}px
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-sm flex-wrap">
            <span className="text-gray-400 w-20">배경</span>
            <button
              onClick={() => setBgKind("transparent")}
              className={`px-3 py-1 rounded ${
                bgKind === "transparent"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              data-testid="export-bg-transparent"
            >
              투명
            </button>
            <button
              onClick={() => setBgKind("solid")}
              className={`px-3 py-1 rounded ${
                bgKind === "solid"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
              data-testid="export-bg-solid"
            >
              단색
            </button>
            {bgKind === "solid" && (
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-8 h-8 bg-transparent border border-gray-600 rounded cursor-pointer"
                data-testid="export-bg-color"
              />
            )}
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-400 w-20">베이스 포함</span>
            <input
              type="checkbox"
              checked={includeBase}
              onChange={(e) => setIncludeBase(e.target.checked)}
              data-testid="export-include-base"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={downloadPng}
            disabled={!composed}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded"
            data-testid="export-download-png"
          >
            PNG 다운로드
          </button>
          <button
            onClick={downloadJson}
            disabled={!exportMetaJson}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded"
            data-testid="export-download-json"
          >
            JSON 다운로드
          </button>
        </div>
      </div>
    </div>
  );
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // 약간의 지연 후 revoke (다운로드 트리거 보장).
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
