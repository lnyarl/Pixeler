import { describe, it, expect, vi } from "vitest";
import { runPostProcess } from "../pipeline";
import * as boxAverageModule from "../boxAverage";
import * as paletteMapModule from "../paletteMap";
import * as transparentModule from "../transparentBackground";
import * as downscaleModule from "../downscale";

describe("runPostProcess", () => {
  it("범용 모델: 다운스케일이 적용된다", async () => {
    const src = new ImageData(8, 8);
    // 빨간 픽셀로 채움
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = 255;
      src.data[i + 1] = 0;
      src.data[i + 2] = 0;
      src.data[i + 3] = 255;
    }

    const result = await runPostProcess(src, {
      targetWidth: 4,
      targetHeight: 4,
      providerType: "openai",
    });

    expect(result.width).toBe(4);
    expect(result.height).toBe(4);
  });

  it("파이프라인 실행 후 색상 수가 제한된다", async () => {
    // 충분히 큰 입력으로 K-means가 의미 있는 클러스터를 만들 수 있게.
    // 새 파이프라인에서는 boxAverage(mid=4*4=16)가 먼저 작동해야 하므로
    // 입력이 mid보다 작으면 boxAverage 항등 반환 → 그래도 paletteMap=4가 색을 제한해야 함.
    const src = new ImageData(8, 8);
    // 다양한 색상
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = (i * 17) % 256;
      src.data[i + 1] = (i * 31) % 256;
      src.data[i + 2] = (i * 53) % 256;
      src.data[i + 3] = 255;
    }

    const result = await runPostProcess(src, {
      targetWidth: 4,
      targetHeight: 4,
      paletteSize: 4,
      providerType: "openai",
    });

    const colors = new Set<string>();
    for (let i = 0; i < result.data.length; i += 4) {
      if (result.data[i + 3] > 0) {
        colors.add(
          `${result.data[i]},${result.data[i + 1]},${result.data[i + 2]}`
        );
      }
    }

    expect(colors.size).toBeLessThanOrEqual(4);
  });

  // T13: 새 파이프라인 순서 검증. Step A → A' → B → C → D → E.
  // 호출 순서와 인자(해상도)를 spy로 검증.
  it("T13: 파이프라인 호출 순서 — A → A' → B → C → D → E (paletteMap=true, transparentBg=true)", async () => {
    const src = new ImageData(64, 64); // 충분히 커서 boxAverage가 실제 축소
    // 단색으로 채워 색상 수 적게
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i] = 200;
      src.data[i + 1] = 100;
      src.data[i + 2] = 50;
      src.data[i + 3] = 255;
    }

    const events: string[] = [];

    const paletteSpy = vi
      .spyOn(paletteMapModule, "paletteMap")
      .mockImplementation((img, _k, opts) => {
        events.push(`paletteMap(w=${img.width}, fixed=${opts?.fixedPalette ? "yes" : "no"})`);
        return {
          result: img,
          palette: [[200, 100, 50]] as const,
        };
      });
    const transparentSpy = vi
      .spyOn(transparentModule, "makeTransparentBackground")
      .mockImplementation((img) => {
        events.push(`transparentBg(w=${img.width})`);
        return img;
      });
    const boxSpy = vi
      .spyOn(boxAverageModule, "boxAverage")
      .mockImplementation(async (img, w, h) => {
        events.push(`boxAverage(${img.width}->${w})`);
        const out = new ImageData(w, h);
        return out;
      });
    const downscaleSpy = vi
      .spyOn(downscaleModule, "downscaleMode")
      .mockImplementation((img, w, h) => {
        events.push(`downscaleMode(${img.width}->${w})`);
        return new ImageData(w, h);
      });

    try {
      await runPostProcess(src, {
        targetWidth: 8,
        targetHeight: 8,
        paletteSize: 4,
        providerType: "openai",
      });
    } finally {
      paletteSpy.mockRestore();
      transparentSpy.mockRestore();
      boxSpy.mockRestore();
      downscaleSpy.mockRestore();
    }

    // 기대 순서: paletteMap(64) [A] → transparentBg(64) [A'] → boxAverage(64->32) [B]
    //          → paletteMap(32, fixed) [C] → downscaleMode(32->8) [D] → transparentBg(8) [E]
    expect(events).toEqual([
      "paletteMap(w=64, fixed=no)",
      "transparentBg(w=64)",
      "boxAverage(64->32)",
      "paletteMap(w=32, fixed=yes)",
      "downscaleMode(32->8)",
      "transparentBg(w=8)",
    ]);
  });

  // T14: paletteMap=false일 때 Step A·A'·C 스킵, B·D 실행. (M4)
  it("T14: paletteMap=false — A·A'·C 스킵, B·D 실행", async () => {
    const src = new ImageData(64, 64);
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i + 3] = 255;
    }

    const events: string[] = [];

    const paletteSpy = vi
      .spyOn(paletteMapModule, "paletteMap")
      .mockImplementation((img) => {
        events.push(`paletteMap(w=${img.width})`);
        return { result: img, palette: [] as const };
      });
    const transparentSpy = vi
      .spyOn(transparentModule, "makeTransparentBackground")
      .mockImplementation((img) => {
        events.push(`transparentBg(w=${img.width})`);
        return img;
      });
    const boxSpy = vi
      .spyOn(boxAverageModule, "boxAverage")
      .mockImplementation(async (_img, w, h) => {
        events.push(`boxAverage(->${w})`);
        return new ImageData(w, h);
      });
    const downscaleSpy = vi
      .spyOn(downscaleModule, "downscaleMode")
      .mockImplementation((_img, w, h) => {
        events.push(`downscaleMode(->${w})`);
        return new ImageData(w, h);
      });

    try {
      await runPostProcess(src, {
        targetWidth: 8,
        targetHeight: 8,
        paletteSize: 4,
        providerType: "openai",
        config: {
          downscale: "mode",
          transparentBg: true,
          paletteMap: false,
          outlinePreserve: false,
        },
      });
    } finally {
      paletteSpy.mockRestore();
      transparentSpy.mockRestore();
      boxSpy.mockRestore();
      downscaleSpy.mockRestore();
    }

    // paletteMap 호출 0회 (A·C 스킵), transparentBg는 Step E만 (A' 스킵 — paletteMap=false).
    expect(events).toEqual([
      "boxAverage(->32)",
      "downscaleMode(->8)",
      "transparentBg(w=8)",
    ]);
  });

  // T15a: paletteMap=true && transparentBg=false (R10).
  // Step A 실행 + A'·E 스킵 + B·C·D 실행.
  it("T15a: paletteMap=true && transparentBg=false — A·B·C·D 실행, A'·E 스킵 (R10)", async () => {
    const src = new ImageData(64, 64);
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i + 3] = 255;
    }

    const events: string[] = [];

    const paletteSpy = vi
      .spyOn(paletteMapModule, "paletteMap")
      .mockImplementation((img, _k, opts) => {
        events.push(`paletteMap(w=${img.width}, fixed=${opts?.fixedPalette ? "yes" : "no"})`);
        return {
          result: img,
          palette: [[100, 100, 100]] as const,
        };
      });
    const transparentSpy = vi
      .spyOn(transparentModule, "makeTransparentBackground")
      .mockImplementation((img) => {
        events.push(`transparentBg(w=${img.width})`);
        return img;
      });
    const boxSpy = vi
      .spyOn(boxAverageModule, "boxAverage")
      .mockImplementation(async (_img, w, h) => {
        events.push(`boxAverage(->${w})`);
        return new ImageData(w, h);
      });
    const downscaleSpy = vi
      .spyOn(downscaleModule, "downscaleMode")
      .mockImplementation((_img, w, h) => {
        events.push(`downscaleMode(->${w})`);
        return new ImageData(w, h);
      });

    try {
      await runPostProcess(src, {
        targetWidth: 8,
        targetHeight: 8,
        paletteSize: 4,
        providerType: "openai",
        config: {
          downscale: "mode",
          transparentBg: false,
          paletteMap: true,
          outlinePreserve: false,
        },
      });
    } finally {
      paletteSpy.mockRestore();
      transparentSpy.mockRestore();
      boxSpy.mockRestore();
      downscaleSpy.mockRestore();
    }

    // transparentBg 호출 없음 (A'·E 스킵). paletteMap A·C 호출됨, B·D 실행.
    expect(events).toEqual([
      "paletteMap(w=64, fixed=no)",
      "boxAverage(->32)",
      "paletteMap(w=32, fixed=yes)",
      "downscaleMode(->8)",
    ]);
  });

  // T15b: paletteMap=false && transparentBg=false. B·D만 실행.
  it("T15b: paletteMap=false && transparentBg=false — B·D만 실행", async () => {
    const src = new ImageData(64, 64);
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i + 3] = 255;
    }

    const events: string[] = [];

    const paletteSpy = vi
      .spyOn(paletteMapModule, "paletteMap")
      .mockImplementation((img) => {
        events.push(`paletteMap(w=${img.width})`);
        return { result: img, palette: [] as const };
      });
    const transparentSpy = vi
      .spyOn(transparentModule, "makeTransparentBackground")
      .mockImplementation((img) => {
        events.push(`transparentBg(w=${img.width})`);
        return img;
      });
    const boxSpy = vi
      .spyOn(boxAverageModule, "boxAverage")
      .mockImplementation(async (_img, w, h) => {
        events.push(`boxAverage(->${w})`);
        return new ImageData(w, h);
      });
    const downscaleSpy = vi
      .spyOn(downscaleModule, "downscaleMode")
      .mockImplementation((_img, w, h) => {
        events.push(`downscaleMode(->${w})`);
        return new ImageData(w, h);
      });

    try {
      await runPostProcess(src, {
        targetWidth: 8,
        targetHeight: 8,
        paletteSize: 4,
        providerType: "openai",
        config: {
          downscale: "mode",
          transparentBg: false,
          paletteMap: false,
          outlinePreserve: false,
        },
      });
    } finally {
      paletteSpy.mockRestore();
      transparentSpy.mockRestore();
      boxSpy.mockRestore();
      downscaleSpy.mockRestore();
    }

    expect(events).toEqual(["boxAverage(->32)", "downscaleMode(->8)"]);
  });

  // T16: providerType=undefined → Step A~D 모두 스킵, Step E만.
  it("T16: providerType=undefined — A~D 스킵, E만", async () => {
    const src = new ImageData(64, 64);
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i + 3] = 255;
    }

    const events: string[] = [];

    const paletteSpy = vi
      .spyOn(paletteMapModule, "paletteMap")
      .mockImplementation((img) => {
        events.push(`paletteMap(w=${img.width})`);
        return { result: img, palette: [] as const };
      });
    const transparentSpy = vi
      .spyOn(transparentModule, "makeTransparentBackground")
      .mockImplementation((img) => {
        events.push(`transparentBg(w=${img.width})`);
        return img;
      });
    const boxSpy = vi
      .spyOn(boxAverageModule, "boxAverage")
      .mockImplementation(async (_img, w, h) => {
        events.push(`boxAverage(->${w})`);
        return new ImageData(w, h);
      });
    const downscaleSpy = vi
      .spyOn(downscaleModule, "downscaleMode")
      .mockImplementation((_img, w, h) => {
        events.push(`downscaleMode(->${w})`);
        return new ImageData(w, h);
      });

    try {
      await runPostProcess(src, {
        targetWidth: 8,
        targetHeight: 8,
        paletteSize: 4,
        // providerType 미지정
      });
    } finally {
      paletteSpy.mockRestore();
      transparentSpy.mockRestore();
      boxSpy.mockRestore();
      downscaleSpy.mockRestore();
    }

    // 특화 모델 분기 — Step E (transparentBg)만 입력 해상도 그대로.
    expect(events).toEqual(["transparentBg(w=64)"]);
  });

  // mid 해상도 동작: src.width <= midW면 boxAverage 호출 안 함 (항등 반환 유사 거동).
  it("src 해상도가 mid 이하이면 boxAverage 스킵", async () => {
    const src = new ImageData(16, 16); // mid = 8*4 = 32. 16 < 32 → 스킵.
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i + 3] = 255;
    }

    const events: string[] = [];
    const boxSpy = vi
      .spyOn(boxAverageModule, "boxAverage")
      .mockImplementation(async (_img, w, h) => {
        events.push(`boxAverage(->${w})`);
        return new ImageData(w, h);
      });
    const paletteSpy = vi
      .spyOn(paletteMapModule, "paletteMap")
      .mockImplementation((img) => ({ result: img, palette: [] as const }));
    const transparentSpy = vi
      .spyOn(transparentModule, "makeTransparentBackground")
      .mockImplementation((img) => img);
    const downscaleSpy = vi
      .spyOn(downscaleModule, "downscaleMode")
      .mockImplementation((_img, w, h) => new ImageData(w, h));

    try {
      await runPostProcess(src, {
        targetWidth: 8,
        targetHeight: 8,
        paletteSize: 4,
        providerType: "openai",
        config: {
          downscale: "mode",
          transparentBg: false,
          paletteMap: false,
          outlinePreserve: false,
        },
      });
    } finally {
      boxSpy.mockRestore();
      paletteSpy.mockRestore();
      transparentSpy.mockRestore();
      downscaleSpy.mockRestore();
    }

    // 16 ≤ 32 이므로 boxAverage 호출 안 됨
    expect(events).toEqual([]);
  });

  // T15a(PR1): outlinePreserve=true + downscale="mode"
  //   → pipeline이 downscaleMode 호출 시 4번째 인자로 { preserveOutline: true } 전달.
  it("T15a(PR1): outlinePreserve=true + mode — downscaleMode에 preserveOutline=true 전달", async () => {
    const src = new ImageData(64, 64);
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i + 3] = 255;
    }

    // 호출 인자를 closure로 캡처 (mockRestore가 spy 상태를 정리해도 보존)
    const downscaleCalls: unknown[][] = [];
    const downscaleSpy = vi
      .spyOn(downscaleModule, "downscaleMode")
      .mockImplementation((...args: unknown[]) => {
        downscaleCalls.push(args);
        const w = args[1] as number;
        const h = args[2] as number;
        return new ImageData(w, h);
      });
    const boxSpy = vi
      .spyOn(boxAverageModule, "boxAverage")
      .mockImplementation(async (_img, w, h) => new ImageData(w, h));
    const paletteSpy = vi
      .spyOn(paletteMapModule, "paletteMap")
      .mockImplementation((img) => ({ result: img, palette: [] as const }));
    const transparentSpy = vi
      .spyOn(transparentModule, "makeTransparentBackground")
      .mockImplementation((img) => img);

    try {
      await runPostProcess(src, {
        targetWidth: 8,
        targetHeight: 8,
        paletteSize: 4,
        providerType: "openai",
        config: {
          downscale: "mode",
          transparentBg: false,
          paletteMap: false,
          outlinePreserve: true,
        },
      });
    } finally {
      downscaleSpy.mockRestore();
      boxSpy.mockRestore();
      paletteSpy.mockRestore();
      transparentSpy.mockRestore();
    }

    // 4번째 인자 옵션 검증
    expect(downscaleCalls).toHaveLength(1);
    const call = downscaleCalls[0];
    expect(call[1]).toBe(8); // targetWidth
    expect(call[2]).toBe(8); // targetHeight
    expect(call[3]).toEqual({ preserveOutline: true });
  });

  // T15b(PR1): outlinePreserve=true + downscale="nearest"
  //   → nearest 분기 호출, downscaleMode 미호출. nearest는 옵션 미수령.
  it("T15b(PR1): outlinePreserve=true + nearest — downscaleMode 미호출, nearest 호출", async () => {
    const src = new ImageData(64, 64);
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i + 3] = 255;
    }

    const events: string[] = [];
    const modeCalls: unknown[][] = [];
    const nearestCalls: unknown[][] = [];

    const modeSpy = vi
      .spyOn(downscaleModule, "downscaleMode")
      .mockImplementation((...args: unknown[]) => {
        modeCalls.push(args);
        const w = args[1] as number;
        const h = args[2] as number;
        events.push(`mode(->${w})`);
        return new ImageData(w, h);
      });
    const nearestSpy = vi
      .spyOn(downscaleModule, "downscale")
      .mockImplementation((...args: unknown[]) => {
        nearestCalls.push(args);
        const w = args[1] as number;
        const h = args[2] as number;
        events.push(`nearest(->${w})`);
        return new ImageData(w, h);
      });
    const boxSpy = vi
      .spyOn(boxAverageModule, "boxAverage")
      .mockImplementation(async (_img, w, h) => new ImageData(w, h));
    const paletteSpy = vi
      .spyOn(paletteMapModule, "paletteMap")
      .mockImplementation((img) => ({ result: img, palette: [] as const }));
    const transparentSpy = vi
      .spyOn(transparentModule, "makeTransparentBackground")
      .mockImplementation((img) => img);

    try {
      await runPostProcess(src, {
        targetWidth: 8,
        targetHeight: 8,
        paletteSize: 4,
        providerType: "openai",
        config: {
          downscale: "nearest",
          transparentBg: false,
          paletteMap: false,
          outlinePreserve: true,
        },
      });
    } finally {
      modeSpy.mockRestore();
      nearestSpy.mockRestore();
      boxSpy.mockRestore();
      paletteSpy.mockRestore();
      transparentSpy.mockRestore();
    }

    expect(modeCalls).toHaveLength(0);
    expect(nearestCalls).toHaveLength(1);
    // nearest 시그니처는 (img, w, h)뿐 — 옵션 인자 없음
    expect(nearestCalls[0]).toHaveLength(3);
    expect(events).toEqual(["nearest(->8)"]);
  });

  // T15c(PR1): outlinePreserve 미지정(DEFAULT_CONFIG) — false가 전달되어 기존 동작 보존.
  it("T15c(PR1): config 미제공 — DEFAULT_CONFIG의 outlinePreserve=false가 전달", async () => {
    const src = new ImageData(64, 64);
    for (let i = 0; i < src.data.length; i += 4) {
      src.data[i + 3] = 255;
    }

    const downscaleCalls: unknown[][] = [];
    const downscaleSpy = vi
      .spyOn(downscaleModule, "downscaleMode")
      .mockImplementation((...args: unknown[]) => {
        downscaleCalls.push(args);
        const w = args[1] as number;
        const h = args[2] as number;
        return new ImageData(w, h);
      });
    const boxSpy = vi
      .spyOn(boxAverageModule, "boxAverage")
      .mockImplementation(async (_img, w, h) => new ImageData(w, h));
    const paletteSpy = vi
      .spyOn(paletteMapModule, "paletteMap")
      .mockImplementation((img) => ({
        result: img,
        palette: [[100, 100, 100]] as const,
      }));
    const transparentSpy = vi
      .spyOn(transparentModule, "makeTransparentBackground")
      .mockImplementation((img) => img);

    try {
      await runPostProcess(src, {
        targetWidth: 8,
        targetHeight: 8,
        paletteSize: 4,
        providerType: "openai",
        // config 미제공 → DEFAULT_CONFIG 사용
      });
    } finally {
      downscaleSpy.mockRestore();
      boxSpy.mockRestore();
      paletteSpy.mockRestore();
      transparentSpy.mockRestore();
    }

    expect(downscaleCalls).toHaveLength(1);
    expect(downscaleCalls[0][3]).toEqual({ preserveOutline: false });
  });
});
