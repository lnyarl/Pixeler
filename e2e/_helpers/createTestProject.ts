import type { Page } from "@playwright/test";

/**
 * 테스트 setup 헬퍼 (C4) — 새 프로젝트를 생성하고 베이스 페이즈로 이동.
 *
 * 기존 e2e가 `await page.goto("/")`로 단일 페이지에 진입하던 것을 PR-α 라우터 도입 후
 * helper로 교체. 이후 expect 로직은 베이스 페이즈가 single-image와 등가이므로 그대로 작동.
 *
 * 모바일 viewport에서는 캔버스가 표시되지 않으므로 (mobile 분기), 'wizard-project-name' 표시까지만 기다림.
 */
export async function createTestProjectAndEnter(
  page: Page,
  opts?: { name?: string }
): Promise<void> {
  const name = opts?.name ?? `테스트 ${Date.now()}`;
  await page.goto("/");
  // 새 프로젝트 폼 열기.
  await page.getByTestId("hub-new-project").click();
  // 이름 입력.
  await page.getByTestId("hub-new-project-name").fill(name);
  // 만들기.
  await page.getByTestId("hub-new-project-confirm").click();
  // 베이스 페이즈 진입 — wizard chrome (프로젝트 이름) visible까지.
  await page.waitForURL(/\/project\/[^/]+\/base/);
  await page
    .getByTestId("wizard-project-name")
    .waitFor({ state: "visible" });
}
