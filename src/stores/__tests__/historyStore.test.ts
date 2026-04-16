import { describe, it, expect, beforeEach } from "vitest";
import { useHistoryStore } from "../historyStore";

function makeImageData(): ImageData {
  return new ImageData(4, 4);
}

describe("historyStore", () => {
  beforeEach(() => {
    useHistoryStore.setState({ items: [] });
  });

  it("항목 추가", () => {
    useHistoryStore.getState().addItem({
      prompt: "테스트",
      thumbnail: "base64...",
      imageData: makeImageData(),
      type: "generate",
    });

    expect(useHistoryStore.getState().items).toHaveLength(1);
    expect(useHistoryStore.getState().items[0].prompt).toBe("테스트");
    expect(useHistoryStore.getState().items[0].type).toBe("generate");
  });

  it("최신 항목이 맨 앞", () => {
    useHistoryStore.getState().addItem({
      prompt: "첫번째",
      thumbnail: "",
      imageData: makeImageData(),
      type: "generate",
    });
    useHistoryStore.getState().addItem({
      prompt: "두번째",
      thumbnail: "",
      imageData: makeImageData(),
      type: "feedback",
    });

    expect(useHistoryStore.getState().items[0].prompt).toBe("두번째");
    expect(useHistoryStore.getState().items[1].prompt).toBe("첫번째");
  });

  it("100개 초과 시 오래된 항목 폐기", () => {
    for (let i = 0; i < 105; i++) {
      useHistoryStore.getState().addItem({
        prompt: `항목 ${i}`,
        thumbnail: "",
        imageData: makeImageData(),
        type: "generate",
      });
    }

    expect(useHistoryStore.getState().items).toHaveLength(100);
    expect(useHistoryStore.getState().items[0].prompt).toBe("항목 104");
  });

  it("clear로 전체 삭제", () => {
    useHistoryStore.getState().addItem({
      prompt: "테스트",
      thumbnail: "",
      imageData: makeImageData(),
      type: "generate",
    });
    useHistoryStore.getState().clear();
    expect(useHistoryStore.getState().items).toHaveLength(0);
  });

  it("id와 timestamp가 자동 생성", () => {
    useHistoryStore.getState().addItem({
      prompt: "테스트",
      thumbnail: "",
      imageData: makeImageData(),
      type: "generate",
    });

    const item = useHistoryStore.getState().items[0];
    expect(item.id).toMatch(/^[0-9a-f-]+$/);
    expect(item.timestamp).toBeGreaterThan(0);
  });
});
