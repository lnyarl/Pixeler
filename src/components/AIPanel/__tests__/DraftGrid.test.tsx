import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import DraftGrid from "../DraftGrid";
import type { ProcessedDraft } from "../PromptPanel";
import { useCanvasHandleStore } from "@/stores/canvasHandleStore";
import { useHistoryStore } from "@/stores/historyStore";

function makeDraft(historyId: string, color = 100): ProcessedDraft {
  const imageData = new ImageData(2, 2);
  imageData.data[0] = color;
  return {
    draft: {
      base64: "stub",
      metadata: {
        provider: "openai",
        model: "stub",
        prompt: "stub",
        timestamp: 0,
      },
    },
    imageData,
    historyId,
    thumbnail: "stub",
    rawBase64: "stub",
  };
}

describe("DraftGrid (Major-1 박제)", () => {
  beforeEach(() => {
    cleanup();
    useCanvasHandleStore.setState({ handle: null });
    useHistoryStore.setState({ items: [], activeItemId: null });
  });

  it("초안 클릭 시 store.loadImageData 호출 + setActiveItemId 호출 (둘 다)", () => {
    const loadImageData = vi.fn();
    const getImageData = vi.fn(() => null);
    useCanvasHandleStore.getState().setHandle({ loadImageData, getImageData });

    const drafts = [makeDraft("h-1"), makeDraft("h-2")];
    render(<DraftGrid drafts={drafts} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[0]);

    // (1) loadImageData가 클릭한 draft의 imageData로 호출됨
    expect(loadImageData).toHaveBeenCalledTimes(1);
    expect(loadImageData).toHaveBeenCalledWith(drafts[0].imageData);

    // (2) historyStore의 activeItemId가 클릭한 draft의 historyId로 갱신됨
    expect(useHistoryStore.getState().activeItemId).toBe("h-1");
  });

  it("두 번째 초안 클릭 시 두 번째 historyId로 activeItemId 갱신", () => {
    const loadImageData = vi.fn();
    const getImageData = vi.fn(() => null);
    useCanvasHandleStore.getState().setHandle({ loadImageData, getImageData });

    const drafts = [makeDraft("h-A"), makeDraft("h-B"), makeDraft("h-C")];
    render(<DraftGrid drafts={drafts} />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);

    expect(loadImageData).toHaveBeenCalledWith(drafts[1].imageData);
    expect(useHistoryStore.getState().activeItemId).toBe("h-B");
  });

  it("drafts 1개 이하면 아무것도 렌더하지 않음", () => {
    const { container: c1 } = render(<DraftGrid drafts={[]} />);
    expect(c1.firstChild).toBeNull();
    cleanup();

    const { container: c2 } = render(<DraftGrid drafts={[makeDraft("only")]} />);
    expect(c2.firstChild).toBeNull();
  });

  it("handle 미설정 상태에서 클릭해도 throw 없이 setActiveItemId만 갱신 (noop loadImageData)", () => {
    // handle을 설정하지 않음 → store.loadImageData는 noop
    const drafts = [makeDraft("x-1"), makeDraft("x-2")];
    render(<DraftGrid drafts={drafts} />);

    const buttons = screen.getAllByRole("button");
    expect(() => fireEvent.click(buttons[0])).not.toThrow();
    expect(useHistoryStore.getState().activeItemId).toBe("x-1");
  });
});
