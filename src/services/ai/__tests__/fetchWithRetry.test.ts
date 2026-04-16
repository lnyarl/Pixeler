import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry } from "../fetchWithRetry";

describe("fetchWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("성공 응답을 반환한다", async () => {
    const mockResponse = new Response("ok", { status: 200 });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const result = await fetchWithRetry("https://example.com", {});
    expect(result.status).toBe(200);
  });

  it("401 에러는 재시도 없이 반환", async () => {
    const mockResponse = new Response("unauthorized", { status: 401 });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    const result = await fetchWithRetry("https://example.com", {});
    expect(result.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("429는 재시도한다", async () => {
    const spy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const result = await fetchWithRetry("https://example.com", {});
    expect(result.status).toBe(200);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("외부 signal abort 시 에러", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchWithRetry("https://example.com", {}, { signal: controller.signal })
    ).rejects.toThrow("취소");
  });

  it("최대 재시도 초과 시 마지막 응답 반환", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 429 })
    );

    const result = await fetchWithRetry("https://example.com", {});
    expect(result.status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(4); // 1 + 3 retries
  }, 15000);
});
