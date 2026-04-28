import { test, expect, devices } from "@playwright/test";
import { createTestProjectAndEnter } from "./_helpers/createTestProject";

test.use({ ...devices["iPhone 13"] });

test.describe("모바일 레이아웃", () => {
  test.beforeEach(async ({ page }) => {
    await createTestProjectAndEnter(page);
  });

  test("모바일에서 프롬프트 입력이 가능하다", async ({ page }) => {
    await expect(page.locator("text=프롬프트")).toBeVisible();
    await expect(page.locator("textarea")).toBeVisible();
  });

  test("모바일에서 히스토리가 표시된다", async ({ page }) => {
    await expect(page.locator("text=히스토리")).toBeVisible();
  });

  test("모바일에서 PNG 내보내기가 가능하다", async ({ page }) => {
    await expect(page.locator("text=PNG 내보내기")).toBeVisible();
  });

  test("모바일에서 사이드바(도구)는 숨겨진다", async ({ page }) => {
    await expect(page.locator("text=브러시 크기")).not.toBeVisible();
  });
});
