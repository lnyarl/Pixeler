import { test, expect } from "@playwright/test";

test.describe("MVP 전체 워크플로우", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("앱 로드 시 모든 주요 UI 요소가 표시된다", async ({ page }) => {
    await expect(page.locator("text=Pixeler")).toBeVisible();
    await expect(page.locator("text=도구")).toBeVisible();
    await expect(page.locator("text=AI 제공자")).toBeVisible();
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
});
