import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

const TEST_FILTER_NAME = `e2e-test-${uuidv4().slice(0, 8)}`;

// ── 커스텀 필터 CRUD ─────────────────────────────────────────────────────

test.describe.serial('커스텀 필터 CRUD', () => {
  test('커스텀 필터 생성', async ({ page }) => {
    await page.goto('/');

    // 필터 탭 → "새 커스텀 필터" 클릭
    await page.locator('.q-tab').filter({ hasText: '필터' }).click();
    await page.getByRole('button', { name: '새 커스텀 필터' }).click();

    // 다이얼로그 스코프
    const dialog = page.locator('.custom-filter-editor-dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('커스텀 필터 생성')).toBeVisible();

    // 입력
    await dialog.getByRole('textbox', { name: '이름' }).fill(TEST_FILTER_NAME);
    await dialog.getByRole('textbox', { name: '설명 (선택)' }).fill('E2E test filter');

    // 저장
    await dialog.getByRole('button', { name: '저장' }).click();

    // 다이얼로그 닫힘 + 사이드바에 필터 표시
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText(TEST_FILTER_NAME)).toBeVisible();
  });

  test('커스텀 필터 수정', async ({ page }) => {
    await page.goto('/');
    await page.locator('.q-tab').filter({ hasText: '필터' }).click();

    // 필터 카드의 수정(edit) 버튼
    const filterCard = page.locator('.filter-card').filter({ hasText: TEST_FILTER_NAME });
    await filterCard.locator('button').filter({ hasText: 'edit' }).click();

    // 다이얼로그 (수정 모드)
    const dialog = page.locator('.custom-filter-editor-dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.getByText('커스텀 필터 수정')).toBeVisible();

    // 이름 변경
    const nameInput = dialog.getByRole('textbox', { name: '이름' });
    await nameInput.clear();
    await nameInput.fill(`${TEST_FILTER_NAME}-edited`);

    // 수정 버튼
    await dialog.getByRole('button', { name: '수정' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // 변경된 이름 확인
    await expect(page.getByText(`${TEST_FILTER_NAME}-edited`)).toBeVisible();
  });

  test('커스텀 필터 삭제', async ({ page }) => {
    await page.goto('/');
    await page.locator('.q-tab').filter({ hasText: '필터' }).click();

    // 삭제 버튼
    const filterCard = page
      .locator('.filter-card')
      .filter({ hasText: `${TEST_FILTER_NAME}-edited` });
    await expect(filterCard).toBeVisible();
    await filterCard.locator('button').filter({ hasText: 'delete' }).click();

    // 삭제 확인
    await expect(filterCard).not.toBeVisible({ timeout: 5000 });
  });
});

// ── 커스텀 필터 에디터 ───────────────────────────────────────────────────

test.describe('커스텀 필터 에디터', () => {
  test('파라미터 추가/삭제', async ({ page }) => {
    await page.goto('/');
    await page.locator('.q-tab').filter({ hasText: '필터' }).click();
    await page.getByRole('button', { name: '새 커스텀 필터' }).click();

    const dialog = page.locator('.custom-filter-editor-dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // 파라미터 추가
    await dialog.getByRole('button', { name: '추가' }).click();
    await expect(dialog.locator('td').first()).toBeVisible();

    // 파라미터 삭제
    await dialog.locator('td button').filter({ hasText: 'delete' }).first().click();
    await expect(dialog.getByText('파라미터가 없습니다')).toBeVisible();

    // 취소
    await dialog.getByRole('button', { name: '취소' }).click();
  });

  test('이름 미입력 시 저장 비활성화', async ({ page }) => {
    await page.goto('/');
    await page.locator('.q-tab').filter({ hasText: '필터' }).click();
    await page.getByRole('button', { name: '새 커스텀 필터' }).click();

    const dialog = page.locator('.custom-filter-editor-dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // 이름 비우기
    await dialog.getByRole('textbox', { name: '이름' }).clear();

    // 저장 비활성화 확인
    await expect(dialog.getByRole('button', { name: '저장' })).toBeDisabled();

    await dialog.getByRole('button', { name: '취소' }).click();
  });
});

// ── 커스텀 필터 캔버스 적용 ──────────────────────────────────────────────

test.describe('커스텀 필터 캔버스 적용', () => {
  test('커스텀 필터를 캔버스에 추가', async ({ page }) => {
    await page.goto('/');

    // 1. 필터 생성
    await page.locator('.q-tab').filter({ hasText: '필터' }).click();
    await page.getByRole('button', { name: '새 커스텀 필터' }).click();

    const dialog = page.locator('.custom-filter-editor-dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.getByRole('textbox', { name: '이름' }).fill('canvas-test-filter');
    await dialog.getByRole('button', { name: '저장' }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // 2. 캔버스에 추가 (add 버튼)
    const filterCard = page.locator('.filter-card').filter({ hasText: 'canvas-test-filter' });
    await filterCard.locator('button').filter({ hasText: 'add' }).click();

    // 3. 캔버스에 필터 노드 추가 확인
    await expect(page.locator('.filter-node').first()).toBeVisible({ timeout: 5000 });

    // 4. 정리: 필터 삭제
    await filterCard.locator('button').filter({ hasText: 'delete' }).click();
  });
});
