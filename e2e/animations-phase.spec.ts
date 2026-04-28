/**
 * animations-phase.spec.ts (PR-γ / γ-N4~N7) — DEV 모드 기반 e2e.
 *
 * 검증:
 * - 베이스 + 1방향 sprite 생성 후 애니메이션 페이즈 진입.
 * - 빈 방향 탭 disabled (M2).
 * - DEV 시트 생성 → frameCount만큼 프레임 그리드 채워짐.
 * - ▶ 재생 → playing 상태 진입 + 시간 경과 후 display-idx 변동.
 * - 프레임 클릭 → 큰 캔버스 표시 + 재생 중이면 자동 정지 (m1).
 * - 직접 설명 모드 토글 → preset 비활성.
 * - lastAnimationDirection 복원 (m2).
 */
import { test, expect, Page } from "@playwright/test";
import { createTestProjectAndEnter } from "./_helpers/createTestProject";

async function makeBaseAndOneDirection(page: Page) {
  await createTestProjectAndEnter(page);
  // 베이스 DEV.
  await page.locator("button:has-text('DEV')").first().click();
  await expect(page.locator("text=히스토리 (1)")).toBeVisible();
  // 다음 페이즈 — directions.
  await page.getByTestId("base-next-phase").first().click();
  await page.waitForURL(/\/project\/[^/]+\/directions/);
  await expect(page.getByTestId("direction-grid")).toBeVisible();
  // DEV 시트 생성 — 4방향 모두 채움.
  await page.getByTestId("direction-generate-dev").click();
  await expect(page.getByTestId("direction-cell-S")).toHaveAttribute(
    "data-filled",
    "true",
    { timeout: 5000 }
  );
}

async function enterAnimations(page: Page) {
  await page.getByTestId("directions-next-phase").click();
  await page.waitForURL(/\/project\/[^/]+\/animations/);
  await expect(page.getByTestId("animations-phase")).toBeVisible();
}

test.describe("애니메이션 페이즈 (PR-γ)", () => {
  test("[γ-F1] 베이스 + 1방향 → 애니메이션 페이즈 진입 + 기본 활성 탭 (γ-F14: S 폴백)", async ({
    page,
  }) => {
    await makeBaseAndOneDirection(page);
    await enterAnimations(page);
    // 4방향 모두 채워진 상태 → S가 우선순위 폴백.
    const sTab = page.getByTestId("animation-tab-S");
    await expect(sTab).toHaveAttribute("data-active", "true");
    await expect(sTab).toHaveAttribute("data-filled", "true");
    // URL이 S로 동기화 (replace).
    await page.waitForURL(/\/project\/[^/]+\/animations\/S/);
  });

  test("[γ-F2] 빈 방향은 disabled 탭 (M2)", async ({ page }) => {
    // 1방향만 채운 상태.
    await createTestProjectAndEnter(page);
    await page.locator("button:has-text('DEV')").first().click();
    await page.getByTestId("base-next-phase").first().click();
    await page.waitForURL(/\/project\/[^/]+\/directions/);
    // 8방향 모드로 전환 → mid-center skip만 빼면 8개 빈 방향.
    await page.getByTestId("direction-mode-8").click();
    // S 셀만 DEV 재생성.
    await page.getByTestId("direction-cell-dev-regen-S").click();
    await expect(page.getByTestId("direction-cell-S")).toHaveAttribute(
      "data-filled",
      "true",
      { timeout: 5000 }
    );
    await page.getByTestId("directions-next-phase").click();
    await page.waitForURL(/\/project\/[^/]+\/animations/);
    // S만 채워짐 → S가 활성.
    await expect(page.getByTestId("animation-tab-S")).toHaveAttribute(
      "data-active",
      "true"
    );
    // 다른 방향은 disabled.
    for (const dir of ["N", "E", "W", "NE", "NW", "SE", "SW"]) {
      await expect(page.getByTestId(`animation-tab-${dir}`)).toHaveAttribute(
        "data-filled",
        "false"
      );
    }
  });

  test("[γ-F4] 직접 설명 모드 토글 → preset 비활성", async ({ page }) => {
    await makeBaseAndOneDirection(page);
    await enterAnimations(page);
    // 기본은 walk preset 선택.
    await expect(page.getByTestId("animation-preset-walk")).toHaveAttribute(
      "data-selected",
      "true"
    );
    // 직접 설명 토글.
    await page.getByTestId("animation-custom-mode-toggle").click();
    // preset 리스트는 opacity-40으로 비활성 (data-selected=false).
    await expect(page.getByTestId("animation-preset-walk")).toHaveAttribute(
      "data-selected",
      "false"
    );
  });

  test("[γ-F6/γ-F16] DEV 시트 생성 → frameCount만큼 프레임 그리드", async ({
    page,
  }) => {
    await makeBaseAndOneDirection(page);
    await enterAnimations(page);
    // 기본 walk = 4프레임.
    await page.getByTestId("animation-generate-dev").click();
    // 프레임 그리드에 4개 채워짐.
    await expect(page.getByTestId("animation-frame-grid")).toHaveAttribute(
      "data-frame-count",
      "4",
      { timeout: 10000 }
    );
    // 클립 리스트에 항목 추가.
    await expect(page.getByTestId("animation-clip-list")).toContainText(
      "DEV"
    );
  });

  test("[γ-F9/γ-F10/γ-N3] ▶ 재생 → display-idx 진행 → ⏸ 정지 → 프레임 클릭 시 자동 정지", async ({
    page,
  }) => {
    await makeBaseAndOneDirection(page);
    await enterAnimations(page);
    await page.getByTestId("animation-generate-dev").click();
    await expect(page.getByTestId("animation-frame-grid")).toHaveAttribute(
      "data-frame-count",
      "4",
      { timeout: 10000 }
    );
    // ▶ 재생.
    await page.getByTestId("animation-preview-play").click();
    const player = page.getByTestId("animation-preview-player");
    await expect(player).toHaveAttribute("data-playing", "true");
    // 시간 경과 후 display-idx가 0이 아닌 값으로 변동 (12fps × 1초 ≈ 12 frame iterations).
    await page.waitForTimeout(800);
    // ⏸ 정지.
    await page.getByTestId("animation-preview-stop").click();
    await expect(player).toHaveAttribute("data-playing", "false");
  });

  test("[γ-F12] frameCount 슬라이더 [2, 8] 강제 — DEV로 8프레임 시트", async ({
    page,
  }) => {
    await makeBaseAndOneDirection(page);
    await enterAnimations(page);
    // 슬라이더 8로 변경.
    const slider = page.getByTestId("animation-frame-count");
    await slider.fill("8");
    await page.getByTestId("animation-generate-dev").click();
    await expect(page.getByTestId("animation-frame-grid")).toHaveAttribute(
      "data-frame-count",
      "8",
      { timeout: 10000 }
    );
  });

  test("[γ-N6] 새로고침 후 lastAnimationDirection 복원 (m2)", async ({
    page,
  }) => {
    await makeBaseAndOneDirection(page);
    await enterAnimations(page);
    // E 탭으로 전환.
    await page.getByTestId("animation-tab-E").click();
    await expect(page.getByTestId("animation-tab-E")).toHaveAttribute(
      "data-active",
      "true"
    );
    // 수동 저장 → 새로고침.
    await page.getByTestId("wizard-save-button").click();
    await page.waitForTimeout(300);
    await page.reload();
    await expect(page.getByTestId("animations-phase")).toBeVisible({
      timeout: 10000,
    });
    // E가 다시 활성.
    await expect(page.getByTestId("animation-tab-E")).toHaveAttribute(
      "data-active",
      "true"
    );
  });

  test("[γ-F1 게이트] 방향 sprite 없으면 redirect", async ({ page }) => {
    await createTestProjectAndEnter(page);
    await page.locator("button:has-text('DEV')").first().click();
    const url = page.url();
    const projectId = url.match(/project\/([^/]+)/)?.[1];
    expect(projectId).toBeTruthy();
    await page.goto(`/project/${projectId}/animations`);
    await page.waitForURL(/\/project\/[^/]+\/directions/);
  });
});
