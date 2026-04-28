import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCanvasHandleStore } from "../canvasHandleStore";

function makeImageData(): ImageData {
  return new ImageData(2, 2);
}

describe("canvasHandleStore", () => {
  beforeEach(() => {
    useCanvasHandleStore.setState({ handle: null });
  });

  it("T1. 초기 상태 — handle null, loadImageData noop, getImageData null", () => {
    const state = useCanvasHandleStore.getState();
    expect(state.handle).toBeNull();
    // loadImageData가 throw하지 않고 noop
    expect(() => state.loadImageData(makeImageData())).not.toThrow();
    expect(state.getImageData()).toBeNull();
  });

  it("T2. setHandle(mock) 후 loadImageData 호출 시 mock의 loadImageData가 호출됨", () => {
    const mock = {
      loadImageData: vi.fn(),
      getImageData: vi.fn(() => null),
    };
    useCanvasHandleStore.getState().setHandle(mock);

    const img = makeImageData();
    useCanvasHandleStore.getState().loadImageData(img);

    expect(mock.loadImageData).toHaveBeenCalledTimes(1);
    expect(mock.loadImageData).toHaveBeenCalledWith(img);
  });

  it("T3. setHandle(mock) 후 getImageData가 mock 반환값을 통과시킴", () => {
    const fake = makeImageData();
    const mock = {
      loadImageData: vi.fn(),
      getImageData: vi.fn(() => fake),
    };
    useCanvasHandleStore.getState().setHandle(mock);

    const result = useCanvasHandleStore.getState().getImageData();

    expect(mock.getImageData).toHaveBeenCalledTimes(1);
    expect(result).toBe(fake);
  });

  it("T4. setHandle(mock) 후 setHandle(null)이면 다시 noop / null", () => {
    const mock = {
      loadImageData: vi.fn(),
      getImageData: vi.fn(() => makeImageData()),
    };
    useCanvasHandleStore.getState().setHandle(mock);
    useCanvasHandleStore.getState().setHandle(null);

    useCanvasHandleStore.getState().loadImageData(makeImageData());
    expect(mock.loadImageData).not.toHaveBeenCalled();
    expect(useCanvasHandleStore.getState().getImageData()).toBeNull();
    expect(mock.getImageData).not.toHaveBeenCalled();
  });

  it("T5. 두 번째 setHandle(mock2)이 mock1을 대체", () => {
    const mock1 = {
      loadImageData: vi.fn(),
      getImageData: vi.fn(() => null),
    };
    const mock2 = {
      loadImageData: vi.fn(),
      getImageData: vi.fn(() => null),
    };
    useCanvasHandleStore.getState().setHandle(mock1);
    useCanvasHandleStore.getState().setHandle(mock2);

    const img = makeImageData();
    useCanvasHandleStore.getState().loadImageData(img);

    expect(mock1.loadImageData).not.toHaveBeenCalled();
    expect(mock2.loadImageData).toHaveBeenCalledTimes(1);
    expect(mock2.loadImageData).toHaveBeenCalledWith(img);
  });
});
