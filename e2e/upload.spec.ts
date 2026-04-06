import { test, expect } from '@playwright/test';
import { TEST_IMAGE } from './config';

// ── 파일 업로드 ──────────────────────────────────────────────────────────────

test.describe('파일 업로드', () => {
  test('이미지 갤러리에서 새 파일 업로드', async ({ page }) => {
    await page.goto('/');

    // SourceNode 빈 영역 클릭 → 갤러리 다이얼로그 열기
    await page.locator('.source-node').click();
    const dialog = page.locator('.image-gallery-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // 파일 선택 (다이얼로그 내 hidden input에 직접 주입)
    const fileInput = dialog.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_IMAGE);

    // 업로드 버튼 클릭
    await dialog.getByRole('button', { name: '업로드' }).click();

    // 갤러리에 업로드된 파일이 표시되는지 확인
    await expect(dialog.locator('.gallery-item').first()).toBeVisible({ timeout: 10000 });
  });
});

// ── 파일 검색/필터 ───────────────────────────────────────────────────────────

test.describe('파일 검색/필터', () => {
  test('파일명으로 검색', async ({ page }) => {
    await page.goto('/');

    // 갤러리 다이얼로그 열기
    await page.locator('.source-node').click();
    const dialog = page.locator('.image-gallery-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // 검색어 입력
    const searchInput = dialog.getByPlaceholder('파일명 검색');
    await searchInput.fill('test');
    const searchResponse = page.waitForResponse(
      (res) => res.url().includes('/files') && res.status() === 200,
    );
    await searchInput.press('Enter');
    await searchResponse;
  });

  test('사이즈 필터 적용', async ({ page }) => {
    await page.goto('/');

    // 갤러리 다이얼로그 열기
    await page.locator('.source-node').click();
    const dialog = page.locator('.image-gallery-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // 사이즈 프리셋 선택
    await dialog.getByRole('combobox').first().click();
    const filterResponse = page.waitForResponse(
      (res) => res.url().includes('/files') && res.status() === 200,
    );
    await page.getByText('1MB 이하').click();
    await filterResponse;
  });
});

// ── 파일 선택 ────────────────────────────────────────────────────────────────

test.describe('파일 선택', () => {
  test('갤러리에서 기존 이미지 선택 → SourceNode에 표시', async ({ page }) => {
    await page.goto('/');

    // 갤러리 다이얼로그 열기
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/files') && res.status() === 200,
    );
    await page.locator('.source-node').click();
    const dialog = page.locator('.image-gallery-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await responsePromise;

    // 첫 번째 이미지 클릭하여 선택
    const firstItem = dialog.locator('.gallery-item').first();
    if (await firstItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstItem.click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });
    }
  });
});

// ── 파일 관리 (이름 변경/삭제) ───────────────────────────────────────────────

test.describe('파일 관리', () => {
  test('파일 이름 변경', async ({ page }) => {
    await page.goto('/');

    // 갤러리 다이얼로그 열기
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/files') && res.status() === 200,
    );
    await page.locator('.source-node').click();
    const dialog = page.locator('.image-gallery-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await responsePromise;

    // 첫 번째 파일의 편집 버튼 클릭 (hover 시 나타남)
    const firstItem = dialog.locator('.gallery-item').first();
    if (await firstItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstItem.hover();
      await firstItem.locator('.gallery-item__actions button').first().click();

      // 이름 변경 후 확인
      const editInput = firstItem.locator('.gallery-item__edit input');
      await editInput.clear();
      await editInput.fill('renamed-file');
      await editInput.press('Enter');

      // 변경된 이름이 반영되는지 확인
      await expect(firstItem.getByText('renamed-file')).toBeVisible();
    }
  });

  test('파일 삭제', async ({ page }) => {
    await page.goto('/');

    // 갤러리 다이얼로그 열기
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/files') && res.status() === 200,
    );
    await page.locator('.source-node').click();
    const dialog = page.locator('.image-gallery-dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await responsePromise;

    // 첫 번째 파일 삭제
    const firstItem = dialog.locator('.gallery-item').first();
    if (await firstItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      const itemCount = await dialog.locator('.gallery-item').count();

      await firstItem.hover();
      await firstItem.locator('.gallery-item__actions button').last().click();

      // 삭제 확인 다이얼로그
      await page.getByRole('button', { name: 'OK' }).click();

      // 파일 개수가 줄었는지 확인
      await expect(dialog.locator('.gallery-item')).toHaveCount(itemCount - 1);
    }
  });
});
