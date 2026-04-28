/**
 * Stability adapter — controlStructure 단위 테스트 (β-N3 / β-N7 / M5).
 *
 * - multipart/form-data 필드 검증: image / prompt / control_strength / output_format.
 * - **width/height 필드 없음** (M5).
 * - 응답 파싱: { image: base64 } → GeneratedImage[].
 * - 에러 매핑.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StabilityAdapter } from "../stability";

describe("StabilityAdapter.controlStructure (β-N3)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function mockFetch(): {
    getCaptured: () => { url: string; body: FormData | null };
  } {
    let captured: { url: string; body: FormData | null } = {
      url: "",
      body: null,
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      captured = {
        url: typeof url === "string" ? url : url.toString(),
        body: (init?.body as FormData) ?? null,
      };
      return new Response(
        JSON.stringify({ image: "RESPONSE_B64", finish_reason: "SUCCESS" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    return { getCaptured: () => captured };
  }

  it("v2beta endpoint /control/structure 호출", async () => {
    const { getCaptured } = mockFetch();
    const adapter = new StabilityAdapter("test-key");
    await adapter.controlStructure({
      inputImage: "dGVzdA==",
      prompt: "knight 4 views 2x2",
    });
    expect(getCaptured().url).toMatch(/\/v2beta\/stable-image\/control\/structure/);
  });

  it("multipart fields — image / prompt / control_strength / output_format (width/height 없음)", async () => {
    const { getCaptured } = mockFetch();
    const adapter = new StabilityAdapter("test-key");
    await adapter.controlStructure({
      inputImage: "dGVzdA==",
      prompt: "test prompt",
      controlStrength: 0.7,
    });
    const body = getCaptured().body!;
    expect(body).not.toBeNull();
    expect(body.get("prompt")).toBe("test prompt");
    expect(body.get("output_format")).toBe("png");
    expect(body.get("control_strength")).toBe("0.7");
    // image 필드는 Blob.
    const image = body.get("image");
    expect(image).toBeInstanceOf(Blob);
    // M5: width/height 필드는 form data에 포함 안 됨.
    expect(body.has("width")).toBe(false);
    expect(body.has("height")).toBe(false);
  });

  it("controlStrength 미지정 시 default=0.7", async () => {
    const { getCaptured } = mockFetch();
    const adapter = new StabilityAdapter("test-key");
    await adapter.controlStructure({
      inputImage: "dGVzdA==",
      prompt: "x",
    });
    expect(getCaptured().body!.get("control_strength")).toBe("0.7");
  });

  it("응답 파싱 — { image: base64 } → GeneratedImage[]", async () => {
    mockFetch();
    const adapter = new StabilityAdapter("test-key");
    const out = await adapter.controlStructure({
      inputImage: "dGVzdA==",
      prompt: "x",
    });
    expect(out).toHaveLength(1);
    expect(out[0].base64).toBe("RESPONSE_B64");
    expect(out[0].metadata.provider).toBe("Stability AI");
    expect(out[0].metadata.model).toBe("control-structure");
  });

  it("401 → API 키 오류", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ message: "invalid key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    });
    const adapter = new StabilityAdapter("bad");
    await expect(
      adapter.controlStructure({ inputImage: "dGVzdA==", prompt: "y" })
    ).rejects.toThrow(/API 키/);
  });

  it("429 → rate limit 메시지 (재시도 후)", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return new Response(JSON.stringify({ message: "rate" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    });
    const adapter = new StabilityAdapter("k");
    await expect(
      adapter.controlStructure({ inputImage: "dGVzdA==", prompt: "y" })
    ).rejects.toThrow(/요청이 너무 많/);
  }, 15000);

  it("capabilities.supportsControlStructure=true (β-N7)", () => {
    const adapter = new StabilityAdapter("k");
    expect(adapter.capabilities.supportsControlStructure).toBe(true);
  });
});
