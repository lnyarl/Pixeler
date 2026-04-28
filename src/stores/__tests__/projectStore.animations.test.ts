/**
 * projectStore animationsPhase 단위 테스트 (γ-N — m2 / animation 액션).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { useProjectStore, _testHelpers } from "../projectStore";
import { _resetDBForTesting } from "@/services/persistence/db";
import type { AnimationClip, AnimationFrame } from "@/services/persistence/types";

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

function makeClip(id: string, frameCount = 2): AnimationClip {
  const frames: AnimationFrame[] = [];
  for (let i = 0; i < frameCount; i++) frames.push(makeFrame(i * 10));
  return {
    id,
    name: `clip ${id}`,
    presetKey: "walk",
    descriptor: "test descriptor",
    fps: 12,
    frames,
  };
}

describe("projectStore animationsPhase actions (γ)", () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    _resetDBForTesting();
    _testHelpers.resetTimer();
    useProjectStore.getState().reset();
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    _testHelpers.resetTimer();
    useProjectStore.getState().reset();
  });

  it("addAnimation은 byDirection[dir]에 클립을 append + dirty 마킹", async () => {
    await useProjectStore.getState().createProject("anim-test");
    useProjectStore.getState().markSaved();
    const clip = makeClip("c1");
    useProjectStore.getState().addAnimation("S", clip);

    const phase = useProjectStore.getState().animationsPhase;
    expect(phase.byDirection.S?.animations.length).toBe(1);
    expect(phase.byDirection.S?.animations[0].id).toBe("c1");
    expect(useProjectStore.getState().dirty).toBe(true);
  });

  it("addAnimation 두 번 호출 시 같은 방향에 누적", async () => {
    await useProjectStore.getState().createProject("anim-test2");
    useProjectStore.getState().addAnimation("E", makeClip("a"));
    useProjectStore.getState().addAnimation("E", makeClip("b"));
    const list = useProjectStore.getState().animationsPhase.byDirection.E?.animations ?? [];
    expect(list.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("updateAnimationFrame은 지정 프레임만 교체", async () => {
    await useProjectStore.getState().createProject("anim-frame");
    useProjectStore.getState().addAnimation("S", makeClip("clip1", 3));
    useProjectStore.getState().markSaved();

    const newFrame = makeFrame(99);
    useProjectStore.getState().updateAnimationFrame("S", "clip1", 1, newFrame);

    const clip = useProjectStore
      .getState()
      .animationsPhase.byDirection.S?.animations.find((c) => c.id === "clip1");
    expect(clip).toBeDefined();
    expect(clip!.frames[1].imageData.data[0]).toBe(99);
    // 다른 프레임은 그대로.
    expect(clip!.frames[0].imageData.data[0]).toBe(0);
    expect(clip!.frames[2].imageData.data[0]).toBe(20);
    expect(useProjectStore.getState().dirty).toBe(true);
  });

  it("updateAnimationFrame은 범위 밖 idx 무시", async () => {
    await useProjectStore.getState().createProject("anim-bad-idx");
    useProjectStore.getState().addAnimation("S", makeClip("c1", 2));
    useProjectStore.getState().updateAnimationFrame("S", "c1", 99, makeFrame(99));
    const clip = useProjectStore
      .getState()
      .animationsPhase.byDirection.S?.animations[0];
    // 변경 없음.
    expect(clip!.frames.length).toBe(2);
    expect(clip!.frames[0].imageData.data[0]).toBe(0);
  });

  it("removeAnimation은 클립 제거, 마지막 클립이면 방향 키 삭제", async () => {
    await useProjectStore.getState().createProject("anim-rm");
    useProjectStore.getState().addAnimation("S", makeClip("c1"));
    useProjectStore.getState().addAnimation("S", makeClip("c2"));
    useProjectStore.getState().removeAnimation("S", "c1");
    const phase1 = useProjectStore.getState().animationsPhase;
    expect(phase1.byDirection.S?.animations.length).toBe(1);
    expect(phase1.byDirection.S?.animations[0].id).toBe("c2");

    useProjectStore.getState().removeAnimation("S", "c2");
    const phase2 = useProjectStore.getState().animationsPhase;
    expect(phase2.byDirection.S).toBeUndefined();
  });

  it("renameAnimation은 이름 변경", async () => {
    await useProjectStore.getState().createProject("anim-rename");
    useProjectStore.getState().addAnimation("S", makeClip("c1"));
    useProjectStore.getState().renameAnimation("S", "c1", "renamed");
    const clip = useProjectStore
      .getState()
      .animationsPhase.byDirection.S?.animations[0];
    expect(clip?.name).toBe("renamed");
  });

  it("setAnimationFps는 1~60으로 clamp", async () => {
    await useProjectStore.getState().createProject("anim-fps");
    useProjectStore.getState().addAnimation("S", makeClip("c1"));
    useProjectStore.getState().setAnimationFps("S", "c1", 999);
    expect(
      useProjectStore.getState().animationsPhase.byDirection.S?.animations[0]
        .fps
    ).toBe(60);
    useProjectStore.getState().setAnimationFps("S", "c1", -5);
    expect(
      useProjectStore.getState().animationsPhase.byDirection.S?.animations[0]
        .fps
    ).toBe(1);
  });

  it("setLastAnimationDirection은 meta에 저장 + 동일 값이면 noop (m2)", async () => {
    await useProjectStore.getState().createProject("last-anim-dir");
    useProjectStore.getState().markSaved();
    useProjectStore.getState().setLastAnimationDirection("E");
    expect(useProjectStore.getState().meta?.lastAnimationDirection).toBe("E");
    expect(useProjectStore.getState().dirty).toBe(true);

    useProjectStore.getState().markSaved();
    useProjectStore.getState().setLastAnimationDirection("E");
    // 동일 → dirty 마킹 X.
    expect(useProjectStore.getState().dirty).toBe(false);
  });

  it("flushSave + loadProject로 lastAnimationDirection 메타 복원 (m2)", async () => {
    // imageData/Blob 라운드트립은 jsdom 한계로 통합 e2e에서 검증.
    // 여기서는 transaction 영속화 + meta 복원만 검증.
    const id = await useProjectStore.getState().createProject("anim-meta-save");
    useProjectStore.getState().setLastAnimationDirection("E");
    await useProjectStore.getState().flushSave();
    useProjectStore.getState().reset();

    const ok = await useProjectStore.getState().loadProject(id);
    expect(ok).toBe(true);
    expect(useProjectStore.getState().meta?.lastAnimationDirection).toBe("E");
  });
});
