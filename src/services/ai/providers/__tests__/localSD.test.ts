/**
 * LocalSDAdapter 단위 테스트.
 *
 * - txt2img: POST /txt2img 호출, 요청 바디 필드 검증.
 * - img2img: POST /img2img 호출, denoising_strength=0.35, referenceImage 포함.
 * - LoRA: loraName이 있으면 prompt에 <lora:...> 태그 삽입.
 * - LoRA 미사용: loraName이 없으면 태그 미삽입.
 * - 에러: response.ok=false → throw.
 * - capabilities 검증.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { LocalSDAdapter } from "../localSD";

const BASE_URL = "http://localhost:7861";

function mockFetchOk(images: string[] = ["RESULT_B64"]) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ images }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function mockFetchError(status: number) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("error", { status, statusText: "Server Error" })
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LocalSDAdapter — txt2img", () => {
  it("POST /txt2img 엔드포인트 호출", async () => {
    mockFetchOk();
    const adapter = new LocalSDAdapter(BASE_URL);
    await adapter.generate({
      prompt: "knight pixel art",
      width: 64,
      height: 64,
      count: 1,
    });
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(`${BASE_URL}/txt2img`);
  });

  it("요청 바디에 prompt / negative_prompt / width / height / sample_steps / cfg_scale 포함", async () => {
    mockFetchOk();
    const adapter = new LocalSDAdapter(BASE_URL);
    await adapter.generate({
      prompt: "warrior",
      width: 128,
      height: 128,
      count: 1,
    });
    const init = vi.mocked(fetch).mock.calls[0][1];
    const body = JSON.parse(init?.body as string);
    expect(body.width).toBe(128);
    expect(body.height).toBe(128);
    expect(body.sample_steps).toBe(20);
    expect(body.cfg_scale).toBe(7.0);
    expect(body.seed).toBe(-1);
    expect(typeof body.negative_prompt).toBe("string");
    expect(body.negative_prompt).toContain("realistic");
  });

  it("count=3 이면 /txt2img를 3회 호출", async () => {
    mockFetchOk();
    const adapter = new LocalSDAdapter(BASE_URL);
    await adapter.generate({
      prompt: "slime",
      width: 64,
      height: 64,
      count: 3,
    });
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3);
  });

  it("응답 파싱 — images[0] → GeneratedImage.base64", async () => {
    mockFetchOk(["MY_BASE64"]);
    const adapter = new LocalSDAdapter(BASE_URL);
    const results = await adapter.generate({
      prompt: "x",
      width: 64,
      height: 64,
      count: 1,
    });
    expect(results).toHaveLength(1);
    expect(results[0].base64).toBe("MY_BASE64");
    expect(results[0].metadata.provider).toBe("Local SD");
    expect(results[0].metadata.model).toBe("local-sd-txt2img");
  });

  it("response.ok=false → throw", async () => {
    mockFetchError(500);
    const adapter = new LocalSDAdapter(BASE_URL);
    await expect(
      adapter.generate({ prompt: "x", width: 64, height: 64, count: 1 })
    ).rejects.toThrow(/Local SD 오류/);
  });
});

describe("LocalSDAdapter — img2img", () => {
  it("POST /img2img 엔드포인트 호출", async () => {
    mockFetchOk();
    const adapter = new LocalSDAdapter(BASE_URL);
    await adapter.regenerateWithFeedback({
      prompt: "add blue hat",
      originalPrompt: "knight",
      referenceImage: "REF_B64",
      width: 64,
      height: 64,
    });
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toBe(`${BASE_URL}/img2img`);
  });

  it("denoising_strength=0.35, init_images에 referenceImage 포함", async () => {
    mockFetchOk();
    const adapter = new LocalSDAdapter(BASE_URL);
    await adapter.regenerateWithFeedback({
      prompt: "change",
      originalPrompt: "orig",
      referenceImage: "REF_DATA",
      width: 64,
      height: 64,
    });
    const init = vi.mocked(fetch).mock.calls[0][1];
    const body = JSON.parse(init?.body as string);
    expect(body.denoising_strength).toBe(0.35);
    expect(body.init_images).toEqual(["REF_DATA"]);
  });

  it("response.ok=false → throw", async () => {
    mockFetchError(503);
    const adapter = new LocalSDAdapter(BASE_URL);
    await expect(
      adapter.regenerateWithFeedback({
        prompt: "x",
        originalPrompt: "y",
        referenceImage: "z",
        width: 64,
        height: 64,
      })
    ).rejects.toThrow(/Local SD 오류/);
  });
});

describe("LocalSDAdapter — LoRA", () => {
  it("loraName 있으면 prompt에 <lora:...> 태그 삽입", async () => {
    mockFetchOk();
    const adapter = new LocalSDAdapter(BASE_URL, "pixel-art-xl", 0.8);
    await adapter.generate({
      prompt: "goblin",
      width: 64,
      height: 64,
      count: 1,
    });
    const init = vi.mocked(fetch).mock.calls[0][1];
    const body = JSON.parse(init?.body as string);
    expect(body.prompt).toContain("<lora:pixel-art-xl:0.8>");
  });

  it("loraName 없으면 prompt에 lora 태그 미삽입", async () => {
    mockFetchOk();
    const adapter = new LocalSDAdapter(BASE_URL); // loraName 미전달
    await adapter.generate({
      prompt: "dragon",
      width: 64,
      height: 64,
      count: 1,
    });
    const init = vi.mocked(fetch).mock.calls[0][1];
    const body = JSON.parse(init?.body as string);
    expect(body.prompt).not.toContain("<lora:");
  });

  it("loraName이 빈 문자열이면 태그 미삽입", async () => {
    mockFetchOk();
    const adapter = new LocalSDAdapter(BASE_URL, "", 0.8);
    await adapter.generate({
      prompt: "hero",
      width: 64,
      height: 64,
      count: 1,
    });
    const init = vi.mocked(fetch).mock.calls[0][1];
    const body = JSON.parse(init?.body as string);
    expect(body.prompt).not.toContain("<lora:");
  });

  it("loraWeight 반영 (0.5)", async () => {
    mockFetchOk();
    const adapter = new LocalSDAdapter(BASE_URL, "my-lora", 0.5);
    await adapter.generate({
      prompt: "mage",
      width: 64,
      height: 64,
      count: 1,
    });
    const init = vi.mocked(fetch).mock.calls[0][1];
    const body = JSON.parse(init?.body as string);
    expect(body.prompt).toContain("<lora:my-lora:0.5>");
  });
});

describe("LocalSDAdapter — capabilities", () => {
  it("supportsMultipleOutputs=true", () => {
    const adapter = new LocalSDAdapter(BASE_URL);
    expect(adapter.capabilities.supportsMultipleOutputs).toBe(true);
  });

  it("supportsImageReference=true", () => {
    const adapter = new LocalSDAdapter(BASE_URL);
    expect(adapter.capabilities.supportsImageReference).toBe(true);
  });

  it("supportsControlStructure=false", () => {
    const adapter = new LocalSDAdapter(BASE_URL);
    expect(adapter.capabilities.supportsControlStructure).toBe(false);
  });

  it("controlStructure 메서드 미존재 (AIAdapter 인터페이스 기준)", () => {
    // AIAdapter 인터페이스에서 controlStructure는 optional — LocalSD는 구현하지 않음.
    const adapter = new LocalSDAdapter(BASE_URL) as import("@/services/ai/types").AIAdapter;
    expect(adapter.controlStructure).toBeUndefined();
  });
});
