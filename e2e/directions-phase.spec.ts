/**
 * directions-phase.spec.ts (PR-β / β-N4) — DEV 모드 기반 e2e.
 *
 * 검증:
 * - 베이스 sprite 만들고 방향 페이즈 진입.
 * - 4 ↔ 8 모드 토글.
 * - DEV 시트 생성 → 4셀(또는 8셀) 채워짐.
 * - 셀별 DEV 재생성 → 단일 셀 갱신.
 * - 1방향만 채워진 상태에서도 "애니메이션 페이즈로" 활성 (M2).
 * - 게이트: 베이스 sprite 없으면 베이스로 redirect.
 */
import { test, expect } from "@playwright/test";
import { createTestProjectAndEnter } from "./_helpers/createTestProject";

async function makeBaseAndEnterDirections(
  page: import("@playwright/test").Page
) {
  await createTestProjectAndEnter(page);
  // 베이스 DEV → 활성 sprite 생성.
  await page.locator("button:has-text('DEV')").first().click();
  await expect(page.locator("text=히스토리 (1)")).toBeVisible();
  await page.getByTestId("base-next-phase").first().click();
  await page.waitForURL(/\/project\/[^/]+\/directions/);
  await expect(page.getByTestId("direction-grid")).toBeVisible();
}

test.describe("방향 페이즈 (PR-β)", () => {
  test("[β-F1] 베이스 sprite 보유 시 방향 페이즈 진입", async ({ page }) => {
    await makeBaseAndEnterDirections(page);
    await expect(page.getByTestId("direction-mode-toggle")).toBeVisible();
    await expect(page.getByTestId("direction-grid")).toBeVisible();
    await expect(page.getByTestId("direction-base-preview")).toBeVisible();
  });

  test("[β-F2] 방향 모드 토글 (4 ↔ 8)", async ({ page }) => {
    await makeBaseAndEnterDirections(page);
    // 기본 4모드.
    await expect(page.getByTestId("direction-cell-N")).toBeVisible();
    await expect(page.getByTestId("direction-cell-S")).toBeVisible();
    // 8 토글.
    await page.getByTestId("direction-mode-8").click();
    // NE/SE 등 대각 셀 visible.
    await expect(page.getByTestId("direction-cell-NE")).toBeVisible();
    await expect(page.getByTestId("direction-cell-SE")).toBeVisible();
    // 4로 복귀 → 대각이 사라짐.
    await page.getByTestId("direction-mode-4").click();
    await expect(page.getByTestId("direction-cell-NE")).toHaveCount(0);
  });

  test("[β-F11] DEV 시트 생성 → 4셀 모두 채워짐 + 애니메이션 진입 활성 (M2)", async ({
    page,
  }) => {
    await makeBaseAndEnterDirections(page);
    // 시작 시 다음 페이즈 비활성.
    const nextBtn = page.getByTestId("directions-next-phase");
    await expect(nextBtn).toBeDisabled();

    // DEV 시트 생성.
    await page.getByTestId("direction-generate-dev").click();
    // 4셀이 filled로 표시 (data-filled=true).
    for (const dir of ["N", "E", "W", "S"]) {
      await expect(
        page.getByTestId(`direction-cell-${dir}`)
      ).toHaveAttribute("data-filled", "true", { timeout: 5000 });
    }
    // 다음 페이즈 활성 (β-F7 — 1방향만 채워져도 OK).
    await expect(nextBtn).toBeEnabled();
  });

  test("[β-F12] DEV 셀 재생성 → 단일 셀 갱신", async ({ page }) => {
    await makeBaseAndEnterDirections(page);
    // 시트 생성으로 4셀 채움.
    await page.getByTestId("direction-generate-dev").click();
    await expect(page.getByTestId("direction-cell-N")).toHaveAttribute(
      "data-filled",
      "true"
    );
    // N 셀 삭제 → 빈 상태.
    await page.getByTestId("direction-cell-clear-N").click();
    await expect(page.getByTestId("direction-cell-N")).toHaveAttribute(
      "data-filled",
      "false"
    );
    // N 셀 DEV 재생성 → 다시 채움.
    await page.getByTestId("direction-cell-dev-regen-N").click();
    await expect(page.getByTestId("direction-cell-N")).toHaveAttribute(
      "data-filled",
      "true",
      { timeout: 5000 }
    );
  });

  test("[β-F13] 8방향 모드: 9칸 중 mid-center는 (empty) skip", async ({
    page,
  }) => {
    await makeBaseAndEnterDirections(page);
    await page.getByTestId("direction-mode-8").click();
    // mid-center의 placeholder 셀 (direction-cell-skip) 1개.
    await expect(page.getByTestId("direction-cell-skip")).toHaveCount(1);
    // 8개 방향 셀 모두 표시.
    for (const dir of ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]) {
      await expect(page.getByTestId(`direction-cell-${dir}`)).toBeVisible();
    }
  });

  test("[β-F1 게이트] 베이스 sprite 없으면 redirect", async ({ page }) => {
    await createTestProjectAndEnter(page);
    // 베이스 sprite 없이 강제 URL 진입.
    const url = page.url();
    const projectId = url.match(/project\/([^/]+)/)?.[1];
    expect(projectId).toBeTruthy();
    await page.goto(`/project/${projectId}/directions`);
    // → 베이스로 redirect.
    await page.waitForURL(/\/project\/[^/]+\/base/);
  });
});
