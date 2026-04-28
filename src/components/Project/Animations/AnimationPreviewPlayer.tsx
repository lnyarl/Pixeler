/**
 * AnimationPreviewPlayer (§5.3.7 / m1) — 큰 캔버스 단일 점유 정책.
 *
 * - 두 모드 토글:
 *   - 편집 모드 (정지, 기본): 부모가 selectedFrame을 putImageData. 사용자가 다른 프레임 선택 가능.
 *   - 프리뷰 모드 (▶ 클릭): rAF loop이 frameIndex = floor(t*fps) % frameCount로 캔버스 점유.
 * - ⏸ 클릭 → 정지, 마지막 표시 프레임 유지 (편집 모드 진입 시 그 프레임을 부모에 알림).
 * - frameCount=0이면 아무 것도 안 함.
 * - 캔버스 imageRendering: pixelated.
 *
 * playing 상태는 외부 controlled로 두어 단위 테스트 + AnimationCanvas 점유 정책 통합 용이.
 */
import { useEffect, useRef, useState } from "react";
import type { AnimationFrame } from "@/services/persistence/types";
import { FPS_MAX, FPS_MIN } from "@/services/ai/animation/presets";

interface Props {
  frames: AnimationFrame[];
  fps: number;
  /** 편집 모드 (정지 시) — 표시할 프레임 인덱스. */
  selectedIdx: number;
  /** 정지 시 부모에게 마지막 표시 프레임을 알림 (편집 모드 동기화). */
  onStopAtFrame?: (idx: number) => void;
  onFpsChange?: (fps: number) => void;
  /** 큰 캔버스 픽셀 사이즈 (sprite × scale). */
  scale?: number;
}

export default function AnimationPreviewPlayer({
  frames,
  fps,
  selectedIdx,
  onStopAtFrame,
  onFpsChange,
  scale = 8,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playing, setPlaying] = useState(false);
  /** 재생 중 표시되는 frame index (for testid/aria). */
  const [displayIdx, setDisplayIdx] = useState(selectedIdx);

  // 정지 시 selectedIdx 변경 → display 동기화.
  useEffect(() => {
    if (!playing) setDisplayIdx(selectedIdx);
  }, [selectedIdx, playing]);

  // canvas 사이즈 (sprite 해상도 기반).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const f0 = frames[0];
    if (!f0) return;
    canvas.width = f0.imageData.width;
    canvas.height = f0.imageData.height;
  }, [frames]);

  // 현재 표시 프레임을 캔버스에 putImageData (재생 / 편집 모두).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const f = frames[displayIdx];
    if (!f) return;
    canvas.width = f.imageData.width;
    canvas.height = f.imageData.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(f.imageData, 0, 0);
  }, [displayIdx, frames]);

  // 재생 루프 (rAF — wall clock 기반 frameIndex 계산).
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const startTime = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsedMs = performance.now() - startTime;
      const idx = Math.floor((elapsedMs / 1000) * fps) % frames.length;
      setDisplayIdx(idx);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, fps, frames.length]);

  function handlePlay() {
    if (frames.length === 0) return;
    setPlaying(true);
  }

  function handleStop() {
    setPlaying(false);
    // 편집 모드 진입 — 부모에게 마지막 표시 프레임 알림 (m1).
    if (onStopAtFrame) onStopAtFrame(displayIdx);
  }

  const noFrames = frames.length === 0;
  const displayPx = (frames[0]?.imageData.width ?? 32) * scale;

  return (
    <div
      className="flex flex-col items-center gap-3"
      data-testid="animation-preview-player"
      data-playing={playing ? "true" : "false"}
      data-display-idx={displayIdx}
    >
      <div
        className="bg-gray-950 rounded ring-1 ring-gray-700 flex items-center justify-center"
        style={{ width: displayPx, height: displayPx }}
      >
        {noFrames ? (
          <span className="text-xs text-gray-600">no frames</span>
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              imageRendering: "pixelated",
              width: "100%",
              height: "100%",
            }}
            data-testid="animation-preview-canvas"
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        {playing ? (
          <button
            onClick={handleStop}
            className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-white text-sm"
            data-testid="animation-preview-stop"
            aria-label="정지"
          >
            ⏸
          </button>
        ) : (
          <button
            onClick={handlePlay}
            disabled={noFrames}
            className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 rounded text-white text-sm"
            data-testid="animation-preview-play"
            aria-label="재생"
          >
            ▶
          </button>
        )}
        <label className="flex items-center gap-1 text-xs text-gray-300">
          FPS
          <input
            type="number"
            min={FPS_MIN}
            max={FPS_MAX}
            value={fps}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isFinite(v) && onFpsChange) {
                onFpsChange(Math.max(FPS_MIN, Math.min(FPS_MAX, v)));
              }
            }}
            className="w-14 px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-200"
            data-testid="animation-preview-fps"
          />
        </label>
        <span className="text-[10px] font-mono text-gray-500">
          frame {displayIdx + 1} / {frames.length || 0}
        </span>
      </div>
    </div>
  );
}
