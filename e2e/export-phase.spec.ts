/**
 * export-phase.spec.ts (PR-δ / δ-N3) — DEV 모드 기반 e2e.
 *
 * 검증:
 * - 베이스 + 방향 + 애니메이션 → export 진입 → 시트/JSON 미리보기.
 * - PNG 다운로드 트리거 (M7 — ZIP 아님).
 * - JSON 다운로드 트리거.
 * - 옵션 변경 (레이아웃 / 패딩 / 배경) 즉시 반영.
 * - 빈 프로젝트 (sprite 0개) → export 진입 시 베이스로 redirect.
 */
import { test, expect, type Page } from "@playwright/test";
import { createTestProjectAndEnter } from "./_helpers/createTestProject";

async function makeFullProject(page: Page) {
  await createTestProjectAndEnter(page);
  // 베이스 DEV.
  await page.locator("button:has-text('DEV')").first().click();
  await expect(page.locator("text=히스토리 (1)")).toBeVisible();
  // 방향 페이즈.
  await page.getByTestId("base-next-phase").first().click();
  await page.waitForURL(/\/project\/[^/]+\/directions/);
  await expect(page.getByTestId("direction-grid")).toBeVisible();
  // DEV 시트 생성 → 4방향 모두 채움.
  await page.getByTestId("direction-generate-dev").click();
  await expect(page.getByTestId("direction-cell-S")).toHaveAttribute(
    "data-filled",
    "true",
    { timeout: 5000 }
  );
  // 애니메이션 페이즈.
  await page.getByTestId("directions-next-phase").click();
  await page.waitForURL(/\/project\/[^/]+\/animations/);
  await expect(page.getByTestId("animations-phase")).toBeVisible();
  // DEV 애니메이션 시트 생성.
  await page.getByTestId("animation-generate-dev").click();
  await expect(page.getByTestId("animation-frame-grid")).toHaveAttribute(
    "data-frame-count",
    "4",
    { timeout: 10000 }
  );
}

test.describe("Export 페이즈 (PR-δ)", () => {
  test("[δ-F1] 풀 프로젝트 → export 진입 + 시트 미리보기 + meta 미리보기", async ({
    page,
  }) => {
    await makeFullProject(page);
    // export 페이즈로.
    await page.getByTestId("phase-step-export").click();
    await page.waitForURL(/\/project\/[^/]+\/export/);
    await expect(page.getByTestId("export-phase")).toBeVisible();
    await expect(page.getByTestId("export-sheet-preview")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByTestId("export-meta-preview")).toBeVisible();
    // meta JSON에 version: 1 포함.
    const metaText = await page.getByTestId("export-meta-preview").innerText();
    expect(metaText).toContain('"version": 1');
    expect(metaText).toContain('"animations"');
  });

  test("[δ-F4/F5/F6] 옵션 변경 즉시 반영 (레이아웃/패딩/배경)", async ({
    page,
  }) => {
    await makeFullProject(page);
    await page.getByTestId("phase-step-export").click();
    await expect(page.getByTestId("export-phase")).toBeVisible();
    // 레이아웃 평면.
    await page.getByTestId("export-layout-flat").click();
    // meta JSON 다시 그려짐 — 평면 모드여도 sheet 키는 동일.
    await expect(page.getByTestId("export-meta-preview")).toBeVisible();
    // 패딩 2 — meta가 padding: 2로 갱신될 때까지 polling.
    await page.getByTestId("export-padding-2").click();
    await expect
      .poll(
        async () =>
          await page.getByTestId("export-meta-preview").innerText(),
        { timeout: 5000 }
      )
      .toContain('"padding": 2');
    // 배경 단색.
    await page.getByTestId("export-bg-solid").click();
    await expect(page.getByTestId("export-bg-color")).toBeVisible();
    await expect
      .poll(
        async () =>
          await page.getByTestId("export-meta-preview").innerText(),
        { timeout: 5000 }
      )
      .not.toContain('"background": "transparent"');
  });

  test("[δ-F7] PNG 다운로드 트리거 (M7 — ZIP 아님)", async ({ page }) => {
    await makeFullProject(page);
    await page.getByTestId("phase-step-export").click();
    await expect(page.getByTestId("export-phase")).toBeVisible();
    await expect(page.getByTestId("export-download-png")).toBeEnabled({
      timeout: 5000,
    });
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download-png").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test("[δ-F8] JSON 다운로드 트리거 (M7 — ZIP 아님)", async ({ page }) => {
    await makeFullProject(page);
    await page.getByTestId("phase-step-export").click();
    await expect(page.getByTestId("export-phase")).toBeVisible();
    await expect(page.getByTestId("export-download-json")).toBeEnabled({
      timeout: 5000,
    });
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-download-json").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);
  });

  test("[δ-F1 게이트] 빈 프로젝트로 export URL 직접 진입 → 베이스로 redirect", async ({
    page,
  }) => {
    // 새 프로젝트 생성하지만 sprite 만들지 않음.
    await createTestProjectAndEnter(page);
    const url = page.url();
    const projectId = url.match(/project\/([^/]+)/)?.[1];
    expect(projectId).toBeTruthy();
    await page.goto(`/project/${projectId}/export`);
    await page.waitForURL(/\/project\/[^/]+\/base/);
  });

  test("[δ-F9 m5] 베이스 없이 방향만 export → meta.json base: null", async ({
    page,
  }) => {
    await createTestProjectAndEnter(page);
    // 베이스 DEV — 일단 만들어야 방향 페이즈에 진입 가능.
    await page.locator("button:has-text('DEV')").first().click();
    await page.getByTestId("base-next-phase").first().click();
    await page.waitForURL(/\/project\/[^/]+\/directions/);
    await page.getByTestId("direction-generate-dev").click();
    await expect(page.getByTestId("direction-cell-S")).toHaveAttribute(
      "data-filled",
      "true",
      { timeout: 5000 }
    );
    // 바로 export.
    await page.getByTestId("phase-step-export").click();
    await page.waitForURL(/\/project\/[^/]+\/export/);
    await expect(page.getByTestId("export-phase")).toBeVisible();
    // 베이스 포함 체크 해제.
    await page.getByTestId("export-include-base").uncheck();
    // meta JSON에 base: null — polling으로 비동기 재합성 대기.
    await expect
      .poll(
        async () =>
          await page.getByTestId("export-meta-preview").innerText(),
        { timeout: 5000 }
      )
      .toContain('"base": null');
  });
});
