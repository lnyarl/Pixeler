import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenAIAdapter } from "../providers/openai";

/** 어댑터가 masked=true일 때 "red overlay" 설명을 AI에 실제로 보내는지 검증 */
describe("OpenAI adapter masked feedback contract", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("masked=true면 request body prompt에 'red' overlay 설명이 포함된다", async () => {
    let capturedBody: FormData | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedBody = (init?.body as FormData) ?? null;
      return new Response(
        JSON.stringify({ data: [{ b64_json: "test" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const adapter = new OpenAIAdapter("test-key");
    await adapter.regenerateWithFeedback!({
      prompt: "투구 추가",
      originalPrompt: "기사",
      referenceImage: "dGVzdA==", // "test" base64
      width: 32,
      height: 32,
      viewType: "side",
      paletteSize: 16,
      masked: true,
    });

    expect(capturedBody).not.toBeNull();
    const sentPrompt = capturedBody!.get("prompt") as string;
    expect(sentPrompt).toContain("red");
    expect(sentPrompt).toContain("overlay");
  });

  it("masked=false(또는 없음)면 'red overlay' 문구가 없다", async () => {
    let capturedBody: FormData | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
      capturedBody = (init?.body as FormData) ?? null;
      return new Response(
        JSON.stringify({ data: [{ b64_json: "test" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });

    const adapter = new OpenAIAdapter("test-key");
    await adapter.regenerateWithFeedback!({
      prompt: "투구 추가",
      originalPrompt: "기사",
      referenceImage: "dGVzdA==",
      width: 32,
      height: 32,
      viewType: "side",
      paletteSize: 16,
    });

    expect(capturedBody).not.toBeNull();
    const sentPrompt = capturedBody!.get("prompt") as string;
    expect(sentPrompt).not.toContain("red semi-transparent overlay");
  });
});
