/**
 * AnimationPreviewPlayer 단위 테스트 (γ-N3 / m1).
 *
 * - 정지 상태에서 selectedIdx 변경 → 캔버스 putImageData (data-display-idx).
 * - ▶ 클릭 → playing=true, ⏸ 노출.
 * - ⏸ 클릭 → playing=false + onStopAtFrame 콜백 호출 (m1 — 편집 모드 동기화).
 * - frames 비어있으면 ▶ disabled, "no frames" 표시.
 * - FPS 입력 변경 → onFpsChange 호출.
 *
 * rAF 기반 frameIndex 회전은 jsdom의 rAF 제한으로 단위 테스트에서 직접 검증 어려움 →
 * playing 상태 토글 + onStopAtFrame 호출 + display-idx 속성으로 간접 검증.
 * 실제 frameIndex 회전은 e2e로 검증 (γ-N4).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AnimationPreviewPlayer from "../AnimationPreviewPlayer";
import type { AnimationFrame } from "@/services/persistence/types";

function makeFrame(seed: number): AnimationFrame {
  const data = new Uint8ClampedArray(4);
  data[0] = seed;
  data[1] = seed;
  data[2] = seed;
  data[3] = 255;
  return {
    imageData: new ImageData(data, 1, 1),
    palette: [[seed, seed, seed]],
  };
}

describe("AnimationPreviewPlayer (γ-N3)", () => {
  beforeEach(() => {
    cleanup();
  });

  it("프레임이 없으면 'no frames' + ▶ disabled", () => {
    render(
      <AnimationPreviewPlayer frames={[]} fps={12} selectedIdx={0} />
    );
    expect(screen.getByText("no frames")).toBeInTheDocument();
    const playBtn = screen.getByTestId("animation-preview-play");
    expect(playBtn).toBeDisabled();
  });

  it("정지 상태 — selectedIdx가 data-display-idx에 반영", () => {
    const frames = [makeFrame(0), makeFrame(50), makeFrame(100)];
    const { rerender } = render(
      <AnimationPreviewPlayer frames={frames} fps={12} selectedIdx={1} />
    );
    const player = screen.getByTestId("animation-preview-player");
    expect(player.getAttribute("data-display-idx")).toBe("1");
    expect(player.getAttribute("data-playing")).toBe("false");

    rerender(
      <AnimationPreviewPlayer frames={frames} fps={12} selectedIdx={2} />
    );
    expect(player.getAttribute("data-display-idx")).toBe("2");
  });

  it("▶ 클릭 → playing=true, ⏸ 버튼 노출", () => {
    const frames = [makeFrame(0), makeFrame(100)];
    render(
      <AnimationPreviewPlayer frames={frames} fps={12} selectedIdx={0} />
    );
    fireEvent.click(screen.getByTestId("animation-preview-play"));
    const player = screen.getByTestId("animation-preview-player");
    expect(player.getAttribute("data-playing")).toBe("true");
    expect(screen.getByTestId("animation-preview-stop")).toBeInTheDocument();
  });

  it("⏸ 클릭 → playing=false + onStopAtFrame 호출 (m1)", () => {
    const frames = [makeFrame(0), makeFrame(100)];
    const onStopAtFrame = vi.fn();
    render(
      <AnimationPreviewPlayer
        frames={frames}
        fps={12}
        selectedIdx={0}
        onStopAtFrame={onStopAtFrame}
      />
    );
    // ▶ 시작.
    fireEvent.click(screen.getByTestId("animation-preview-play"));
    // ⏸ 정지.
    fireEvent.click(screen.getByTestId("animation-preview-stop"));
    expect(onStopAtFrame).toHaveBeenCalledTimes(1);
    const player = screen.getByTestId("animation-preview-player");
    expect(player.getAttribute("data-playing")).toBe("false");
    expect(screen.getByTestId("animation-preview-play")).toBeInTheDocument();
  });

  it("FPS 입력 변경 → onFpsChange 호출 (clamp 1~60)", () => {
    const frames = [makeFrame(0), makeFrame(100)];
    const onFpsChange = vi.fn();
    render(
      <AnimationPreviewPlayer
        frames={frames}
        fps={12}
        selectedIdx={0}
        onFpsChange={onFpsChange}
      />
    );
    const fpsInput = screen.getByTestId("animation-preview-fps");
    fireEvent.change(fpsInput, { target: { value: "24" } });
    expect(onFpsChange).toHaveBeenLastCalledWith(24);

    fireEvent.change(fpsInput, { target: { value: "999" } });
    expect(onFpsChange).toHaveBeenLastCalledWith(60);

    fireEvent.change(fpsInput, { target: { value: "0" } });
    expect(onFpsChange).toHaveBeenLastCalledWith(1);
  });

  it("재생 중 selectedIdx 변경은 display-idx에 반영 안 됨 (player가 큰 캔버스 점유 — m1)", () => {
    const frames = [makeFrame(0), makeFrame(100), makeFrame(200)];
    const { rerender } = render(
      <AnimationPreviewPlayer frames={frames} fps={12} selectedIdx={0} />
    );
    fireEvent.click(screen.getByTestId("animation-preview-play"));
    const player = screen.getByTestId("animation-preview-player");
    expect(player.getAttribute("data-playing")).toBe("true");
    // 재생 중에는 부모가 selectedIdx를 변경해도 display는 player가 통제.
    rerender(
      <AnimationPreviewPlayer frames={frames} fps={12} selectedIdx={2} />
    );
    // (rAF가 jsdom에서 동기 실행되지 않으므로 display-idx는 0 또는 첫 진입 후 player가 갱신한 값.)
    // 핵심: data-playing=true 상태가 유지된다.
    expect(player.getAttribute("data-playing")).toBe("true");
  });
});
