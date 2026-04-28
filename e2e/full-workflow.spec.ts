import { test, expect } from "@playwright/test";
import { createTestProjectAndEnter } from "./_helpers/createTestProject";

test.describe("MVP 전체 워크플로우", () => {
  test.beforeEach(async ({ page }) => {
    await createTestProjectAndEnter(page);
  });

  test("앱 로드 시 모든 주요 UI 요소가 표시된다", async ({ page }) => {
    await expect(page.getByTestId("wizard-project-name")).toBeVisible();
    await expect(page.locator("text=도구")).toBeVisible();
    await expect(page.locator("text=프롬프트")).toBeVisible();
    await expect(page.locator("text=히스토리")).toBeVisible();
    await expect(page.locator("text=PNG 내보내기")).toBeVisible();
  });

  test("설정 모달이 열리고 닫힌다", async ({ page }) => {
    await page.click("button[aria-label='설정']");
    await expect(page.locator("text=API 키 설정")).toBeVisible();
    await page.click("button:text('×')");
    await expect(page.locator("text=API 키 설정")).not.toBeVisible();
  });

  test("API 키 미설정 시 경고 배너 표시", async ({ page }) => {
    await expect(page.locator("text=API 키가 설정되지 않았습니다")).toBeVisible();
  });

  test("빈 프롬프트로 생성 시 에러", async ({ page }) => {
    await page.click("button:text('생성')");
    await expect(page.locator("text=프롬프트를 입력해주세요")).toBeVisible();
  });

  test("해상도 변경 후 캔버스가 유지된다", async ({ page }) => {
    await page.click("text=64x64");
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("도구 전체 순환이 동작한다", async ({ page }) => {
    for (const tool of ["펜", "지우개", "이동", "마스크"]) {
      await page.click(`text=${tool}`);
    }
    // 마지막으로 펜으로 복귀
    await page.click("text=펜");
  });

  test("팔레트 크기 변경이 동작한다", async ({ page }) => {
    const paletteSelect = page.getByTestId("palette-size-select");
    await paletteSelect.selectOption("8");
    await paletteSelect.selectOption("0"); // 제한없음
  });

  // === canvasHandle store화 회귀 검증 (시나리오 3·4·5) ===
  // 기획서 §7.3 / N4-b — store.loadImageData / store.getImageData 경로가
  // 실제 DOM 인터랙션으로 동작하는지 확인.

  test("DEV 더미 생성 → 캔버스 적용 + 히스토리 +1 (store.loadImageData 경로)", async ({
    page,
  }) => {
    // DEV 버튼은 import.meta.env.DEV에서만 노출. playwright는 dev 서버에서 실행됨.
    const devButton = page.locator("button:has-text('DEV')");
    await expect(devButton).toBeVisible();

    await devButton.click();

    // 히스토리 패널에 항목 1개 표시 (라벨 "히스토리 (1)")
    await expect(page.locator("text=히스토리 (1)")).toBeVisible();
    // Undo 활성화 — store.loadImageData가 PixelCanvas의 imageDataRef를 갱신했음을 의미
    await expect(page.locator("button:has-text('Undo')")).toBeEnabled();
  });

  test("히스토리 항목 클릭 → 캔버스 복원 (store.loadImageData 경로)", async ({
    page,
  }) => {
    // 1차 더미 생성
    await page.locator("button:has-text('DEV')").click();
    await expect(page.locator("text=히스토리 (1)")).toBeVisible();

    // 2차 더미 생성 (다른 항목으로 활성 노드 이동)
    await page.locator("button:has-text('DEV')").click();
    await expect(page.locator("text=히스토리 (2)")).toBeVisible();

    // 활성 항목은 최신(L0). 그 외 첫 번째 비활성 행을 클릭하여 복원 트리거.
    // HistoryGraph 행 = `<div ... onClick> + <img alt="">` 구조.
    // 비활성 행은 hover 클래스를 가진 transparent border-left.
    const inactiveRow = page
      .locator(
        "div.cursor-pointer:has(img):not(.bg-blue-900\\/40)"
      )
      .first();
    await expect(inactiveRow).toBeVisible();
    await inactiveRow.click();

    // 복원 후 캔버스가 정상 (회귀 없음 확인) + 활성 표시(blue-900) 행이 다시 존재
    await expect(page.locator("canvas").first()).toBeVisible();
    await expect(
      page.locator("div.bg-blue-900\\/40:has(img)").first()
    ).toBeVisible();
  });

  test("PNG 내보내기 → 다운로드 트리거 (store.getImageData 경로)", async ({
    page,
  }) => {
    // 더미 생성으로 캔버스에 컨텐츠 채움
    await page.locator("button:has-text('DEV')").click();
    await expect(page.locator("text=히스토리 (1)")).toBeVisible();

    // 다운로드 트리거 — store.getImageData → downloadPng
    const downloadPromise = page.waitForEvent("download", { timeout: 5000 });
    await page.locator("button:has-text('PNG 내보내기')").click();
    const download = await downloadPromise;

    // 파일명이 .png 확장자인지 확인 (기능 작동 자체 검증)
    expect(download.suggestedFilename()).toMatch(/\.png$/i);
  });
});
