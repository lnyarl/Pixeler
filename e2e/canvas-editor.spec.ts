import { test, expect } from "@playwright/test";
import { createTestProjectAndEnter } from "./_helpers/createTestProject";

test.describe("캔버스 에디터 (1단계)", () => {
  test.beforeEach(async ({ page }) => {
    await createTestProjectAndEnter(page);
  });

  test("앱이 로드되고 레이아웃이 표시된다", async ({ page }) => {
    await expect(page.getByTestId("wizard-project-name")).toBeVisible();
    await expect(page.locator("text=도구")).toBeVisible();
    await expect(page.locator("text=AI 제공자")).toBeVisible();
  });

  test("해상도 프리셋 선택이 동작한다", async ({ page }) => {
    await page.click("text=16x16");
    await expect(page.locator("text=16x16").first()).toBeVisible();

    await page.click("text=64x64");
    await expect(page.locator("text=64x64").first()).toBeVisible();
  });

  test("커스텀 해상도 범위 밖 입력 시 에러 표시", async ({ page }) => {
    const input = page.locator("input[type='number']");
    await input.fill("200");
    await page.click("text=적용");
    await expect(page.locator("text=8~128")).toBeVisible();
  });

  test("캔버스가 표시된다", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
  });

  test("펜으로 그리면 캔버스에 변화가 생긴다", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    // 캔버스 중앙 클릭
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // 그리기 후 Undo 버튼이 활성화 되었는지 확인
    const undoButton = page.locator("text=Undo");
    await expect(undoButton).toBeEnabled();
  });

  test("Undo 후 Redo가 활성화된다", async ({ page }) => {
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Canvas not found");

    // 그리기
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Undo
    await page.click("text=Undo");
    const redoButton = page.locator("text=Redo");
    await expect(redoButton).toBeEnabled();
  });

  test("그리드 토글이 동작한다", async ({ page }) => {
    const gridButton = page.locator("text=그리드");
    await expect(gridButton).toBeVisible();
    await gridButton.click();
    // 토글 후에도 앱이 정상 동작
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("도구 전환이 동작한다", async ({ page }) => {
    await page.click("text=지우개");
    await expect(page.locator("text=지우개")).toBeVisible();
    await page.click("text=펜");
  });
});
