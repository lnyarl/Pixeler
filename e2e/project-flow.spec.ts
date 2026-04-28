/**
 * project-flow.spec.ts (PR-α): 새 프로젝트 → 베이스 sprite (DEV) → 새로고침 → 복원.
 *
 * α-N5 검증.
 */

import { test, expect } from "@playwright/test";
import { createTestProjectAndEnter } from "./_helpers/createTestProject";

test.describe("프로젝트 인프라 흐름 (PR-α)", () => {
  test("[α-F1/F2] 허브에서 새 프로젝트 생성 후 베이스 페이즈 진입", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("hub-new-project")).toBeVisible();
    await page.getByTestId("hub-new-project").click();
    await page.getByTestId("hub-new-project-name").fill("e2e Project");
    await page.getByTestId("hub-new-project-confirm").click();
    await page.waitForURL(/\/project\/[^/]+\/base/);
    await expect(page.locator("canvas").first()).toBeVisible();
  });

  test("[α-F3/F4] 허브에 카드 표시 + 카드 클릭 시 lastPhase로 이동", async ({
    page,
  }) => {
    const name = `Card ${Date.now()}`;
    await createTestProjectAndEnter(page, { name });
    // 허브로 복귀.
    await page.getByTestId("wizard-hub-button").click();
    await page.waitForURL("/");
    // 카드가 보임.
    await expect(page.locator(`text=${name}`)).toBeVisible();
    // 카드 클릭.
    await page.locator(`text=${name}`).first().click({ trial: false });
    // "이어 작업" 버튼 클릭.
    await page
      .getByTestId("hub-project-card")
      .filter({ hasText: name })
      .getByText("이어 작업")
      .click();
    await page.waitForURL(/\/project\/[^/]+\/base/);
  });

  test("[α-F9/F10] 베이스 sprite 없을 때는 다음 페이즈 비활성, DEV 클릭 후 활성", async ({
    page,
  }) => {
    await createTestProjectAndEnter(page);
    const nextBtn = page.getByTestId("base-next-phase").first();
    await expect(nextBtn).toBeDisabled();
    // DEV 더미 생성.
    await page.locator("button:has-text('DEV')").first().click();
    await expect(page.locator("text=히스토리 (1)")).toBeVisible();
    await expect(nextBtn).toBeEnabled();
  });

  test("[α-F11] 다음 페이즈 클릭 시 directions placeholder 진입", async ({
    page,
  }) => {
    await createTestProjectAndEnter(page);
    await page.locator("button:has-text('DEV')").first().click();
    await expect(page.locator("text=히스토리 (1)")).toBeVisible();
    await page.getByTestId("base-next-phase").first().click();
    await page.waitForURL(/\/project\/[^/]+\/directions/);
    await expect(page.locator("text=준비 중")).toBeVisible();
    // 베이스로 돌아가기.
    await page.getByTestId("directions-back-base").click();
    await page.waitForURL(/\/project\/[^/]+\/base/);
  });

  test("[α-F12] 새로고침 후 베이스 sprite 복원", async ({ page }) => {
    await createTestProjectAndEnter(page, { name: "persist-test" });
    await page.locator("button:has-text('DEV')").first().click();
    await expect(page.locator("text=히스토리 (1)")).toBeVisible();
    // 수동 저장 버튼 클릭 — 새로고침 전 IndexedDB 반영 보장.
    await page.getByTestId("wizard-save-button").click();
    // 충분히 기다림 (transaction).
    await page.waitForTimeout(300);
    await page.reload();
    // 같은 URL이라 BasePhaseRoute가 다시 로드 + 히스토리 복원.
    await page.waitForURL(/\/project\/[^/]+\/base/);
    // 히스토리 1개가 다시 표시.
    await expect(page.locator("text=히스토리 (1)")).toBeVisible({
      timeout: 10000,
    });
  });

  test("[α-F17] 프로젝트 이름 표시 + inline rename", async ({ page }) => {
    await createTestProjectAndEnter(page, { name: "rename-orig" });
    await expect(page.getByTestId("wizard-project-name")).toContainText(
      "rename-orig"
    );
    await page.getByTestId("wizard-project-name").click();
    const input = page.getByTestId("wizard-rename-input");
    await input.fill("rename-new");
    await input.press("Enter");
    await expect(page.getByTestId("wizard-project-name")).toContainText(
      "rename-new"
    );
  });

  test("[α-F18] Header에 허브로 버튼 → 클릭 시 허브 이동", async ({ page }) => {
    await createTestProjectAndEnter(page);
    await page.getByTestId("wizard-hub-button").click();
    await page.waitForURL("/");
    await expect(page.getByTestId("hub-new-project")).toBeVisible();
  });
});
