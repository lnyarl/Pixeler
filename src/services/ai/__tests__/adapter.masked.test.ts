import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIAdapter } from "../providers/openai";

const EDGE_TEXT = "Each shape must have clear 1-pixel dark outlines along its edges.";

/**
 * 어댑터가 masked=true일 때 "red overlay" 설명을 AI에 실제로 보내는지 검증.
 * + PR2 (T19~T22): requireEdges가 어댑터의 함수형 분기 변수 패턴을 통해
 *   masked=true/false 양쪽 모두에 정확히 전달되는지 자동 회귀 검증.
 */
describe("OpenAI adapter masked feedback contract", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function mockFetch(): { getCaptured: () => FormData | null } {
    let capturedBody: FormData | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedBody = (init?.body as FormData) ?? null;
      return new Response(
        JSON.stringify({ data: [{ b64_json: "test" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    return { getCaptured: () => capturedBody };
  }

  it("masked=true면 request body prompt에 'red' overlay 설명이 포함된다", async () => {
    const { getCaptured } = mockFetch();

    const adapter = new OpenAIAdapter("test-key");
    await adapter.regenerateWithFeedback!({
      prompt: "투구 추가",
      originalPrompt: "기사",
      referenceImage: "dGVzdA==", // "test" base64
      width: 32,
      height: 32,
      paletteSize: 16,
      masked: true,
    });

    const body = getCaptured();
    expect(body).not.toBeNull();
    const sentPrompt = body!.get("prompt") as string;
    expect(sentPrompt).toContain("red");
    expect(sentPrompt).toContain("overlay");
  });

  it("masked=false(또는 없음)면 'red overlay' 문구가 없다", async () => {
    const { getCaptured } = mockFetch();

    const adapter = new OpenAIAdapter("test-key");
    await adapter.regenerateWithFeedback!({
      prompt: "투구 추가",
      originalPrompt: "기사",
      referenceImage: "dGVzdA==",
      width: 32,
      height: 32,
      paletteSize: 16,
    });

    const body = getCaptured();
    expect(body).not.toBeNull();
    const sentPrompt = body!.get("prompt") as string;
    expect(sentPrompt).not.toContain("red semi-transparent overlay");
  });

  // T19: masked=true && requireEdges=true → 외곽선 텍스트 포함
  // 어댑터 내부 buildMaskedFeedbackPrompt(..., requireEdges) 6번째 인자 전달 검증.
  // C1·Maj1 핵심 회귀 방지.
  it("masked=true && requireEdges=true → sentPrompt에 외곽선 텍스트 포함", async () => {
    const { getCaptured } = mockFetch();

    const adapter = new OpenAIAdapter("test-key");
    await adapter.regenerateWithFeedback!({
      prompt: "투구 추가",
      originalPrompt: "기사",
      referenceImage: "dGVzdA==",
      width: 32,
      height: 32,
      paletteSize: 16,
      masked: true,
      requireEdges: true,
    });

    const body = getCaptured();
    expect(body).not.toBeNull();
    const sentPrompt = body!.get("prompt") as string;
    expect(sentPrompt).toContain(EDGE_TEXT);
    // 마스크 분기 양쪽 모두 동작함을 확인 — overlay 문구도 유지
    expect(sentPrompt).toContain("red");
  });

  // T20: masked=false && requireEdges=true → 외곽선 텍스트 포함
  // 어댑터 내부 buildFeedbackPrompt(..., requireEdges) 6번째 인자 전달 검증.
  it("masked=false && requireEdges=true → sentPrompt에 외곽선 텍스트 포함", async () => {
    const { getCaptured } = mockFetch();

    const adapter = new OpenAIAdapter("test-key");
    await adapter.regenerateWithFeedback!({
      prompt: "검 크게",
      originalPrompt: "기사",
      referenceImage: "dGVzdA==",
      width: 32,
      height: 32,
      paletteSize: 16,
      requireEdges: true,
    });

    const body = getCaptured();
    expect(body).not.toBeNull();
    const sentPrompt = body!.get("prompt") as string;
    expect(sentPrompt).toContain(EDGE_TEXT);
    // masked=false이므로 overlay 문구 없음
    expect(sentPrompt).not.toContain("red semi-transparent overlay");
  });

  // T21: requireEdges=false → 외곽선 텍스트 미포함 (양쪽 분기)
  it("requireEdges=false (masked=true) → sentPrompt에 외곽선 텍스트 미포함", async () => {
    const { getCaptured } = mockFetch();

    const adapter = new OpenAIAdapter("test-key");
    await adapter.regenerateWithFeedback!({
      prompt: "투구 추가",
      originalPrompt: "기사",
      referenceImage: "dGVzdA==",
      width: 32,
      height: 32,
      paletteSize: 16,
      masked: true,
      requireEdges: false,
    });

    const body = getCaptured();
    expect(body).not.toBeNull();
    const sentPrompt = body!.get("prompt") as string;
    expect(sentPrompt).not.toContain(EDGE_TEXT);
  });

  it("requireEdges=false (masked=false) → sentPrompt에 외곽선 텍스트 미포함", async () => {
    const { getCaptured } = mockFetch();

    const adapter = new OpenAIAdapter("test-key");
    await adapter.regenerateWithFeedback!({
      prompt: "검 크게",
      originalPrompt: "기사",
      referenceImage: "dGVzdA==",
      width: 32,
      height: 32,
      paletteSize: 16,
      requireEdges: false,
    });

    const body = getCaptured();
    expect(body).not.toBeNull();
    const sentPrompt = body!.get("prompt") as string;
    expect(sentPrompt).not.toContain(EDGE_TEXT);
  });
});

/** T22: OpenAIAdapter.generate 직접 호출 경로 (5번째 인자) 검증 */
describe("OpenAI adapter generate requireEdges contract", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function mockFetchJson(): { getBody: () => unknown } {
    let parsed: unknown = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      const raw = init?.body as string;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      return new Response(
        JSON.stringify({ data: [{ b64_json: "test" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    return { getBody: () => parsed };
  }

  // T22: generate({requireEdges: true}) → JSON body의 prompt 필드에 외곽선 텍스트 포함
  it("generate({requireEdges: true}) → request body prompt에 외곽선 텍스트 포함", async () => {
    const { getBody } = mockFetchJson();

    const adapter = new OpenAIAdapter("test-key");
    await adapter.generate({
      prompt: "기사 캐릭터",
      width: 32,
      height: 32,
      count: 1,
      paletteSize: 16,
      requireEdges: true,
    });

    const body = getBody() as { prompt?: string } | null;
    expect(body).not.toBeNull();
    expect(body!.prompt).toContain(EDGE_TEXT);
  });

  it("generate({requireEdges: false}) → 외곽선 텍스트 미포함", async () => {
    const { getBody } = mockFetchJson();

    const adapter = new OpenAIAdapter("test-key");
    await adapter.generate({
      prompt: "기사 캐릭터",
      width: 32,
      height: 32,
      count: 1,
      paletteSize: 16,
      requireEdges: false,
    });

    const body = getBody() as { prompt?: string } | null;
    expect(body).not.toBeNull();
    expect(body!.prompt).not.toContain(EDGE_TEXT);
  });

  it("generate({requireEdges 미전달}) → 외곽선 텍스트 미포함 (회귀)", async () => {
    const { getBody } = mockFetchJson();

    const adapter = new OpenAIAdapter("test-key");
    await adapter.generate({
      prompt: "기사 캐릭터",
      width: 32,
      height: 32,
      count: 1,
      paletteSize: 16,
    });

    const body = getBody() as { prompt?: string } | null;
    expect(body).not.toBeNull();
    expect(body!.prompt).not.toContain(EDGE_TEXT);
  });
});
