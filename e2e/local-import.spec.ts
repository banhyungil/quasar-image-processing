import { test, expect } from '@playwright/test';
import { TEST_IMAGE_DIR } from './config';

/** ImageGalleryDialog → LocalImportDialog 열기 헬퍼 */
async function openLocalImportDialog(page: import('@playwright/test').Page) {
  await page.goto('/');

  // SourceNode 클릭 → 갤러리 다이얼로그 열기
  await page.locator('.source-node').click();
  const galleryDialog = page.locator('.image-gallery-dialog');
  await expect(galleryDialog).toBeVisible({ timeout: 10000 });

  // "로컬 이미지 가져오기" 영역 클릭 → LocalImportDialog 열기
  await galleryDialog.getByText('로컬 이미지 가져오기').click();
  const dialog = page.locator('.local-import-dialog');
  await expect(dialog).toBeVisible({ timeout: 10000 });

  return dialog;
}

// ── 썸네일 옵션 ─────────────────────────────────────────────────────────────

test.describe('로컬 파일 스캔 — 썸네일 옵션', () => {
  test('썸네일 체크박스 기본 상태 확인', async ({ page }) => {
    const dialog = await openLocalImportDialog(page);

    // "썸네일 표시" 체크박스가 기본 checked 상태인지 검증
    const checkbox = dialog.getByLabel('썸네일 표시');
    await expect(checkbox).toBeChecked();
  });

  test('썸네일 ON 상태로 스캔', async ({ page }) => {
    const dialog = await openLocalImportDialog(page);

    // 썸네일 체크박스 checked 확인
    const checkbox = dialog.getByLabel('썸네일 표시');
    await expect(checkbox).toBeChecked();

    // 디렉토리 경로 입력
    const dirInput = dialog.getByPlaceholder('디렉토리 경로');
    await dirInput.fill(TEST_IMAGE_DIR);

    // API 요청 대기 — useThumbnail: true 확인
    const requestPromise = page.waitForRequest((req) => req.url().includes('/files/local/scan'));
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/files/local/scan') && res.status() === 200,
    );

    // 스캔 버튼 클릭
    await dialog.getByRole('button', { name: '스캔' }).click();

    const request = await requestPromise;
    const body = request.postDataJSON();
    expect(body.useThumbnail).toBe(true);

    await responsePromise;

    // 스캔 결과에 <img> 태그(썸네일 이미지)가 표시되는지 검증
    const firstItem = dialog.locator('.local-import-item').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    await expect(firstItem.locator('img.local-import-item__img')).toBeVisible();
  });

  test('썸네일 OFF 상태로 스캔', async ({ page }) => {
    const dialog = await openLocalImportDialog(page);

    // 썸네일 체크박스 해제
    const checkbox = dialog.getByLabel('썸네일 표시');
    await expect(checkbox).toBeChecked();
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();

    // 디렉토리 경로 입력
    const dirInput = dialog.getByPlaceholder('디렉토리 경로');
    await dirInput.fill(TEST_IMAGE_DIR);

    // API 요청 대기 — useThumbnail: false 확인
    const requestPromise = page.waitForRequest((req) => req.url().includes('/files/local/scan'));
    const responsePromise = page.waitForResponse(
      (res) => res.url().includes('/files/local/scan') && res.status() === 200,
    );

    // 스캔 버튼 클릭
    await dialog.getByRole('button', { name: '스캔' }).click();

    const request = await requestPromise;
    const body = request.postDataJSON();
    expect(body.useThumbnail).toBe(false);

    await responsePromise;

    // 스캔 결과에 placeholder 아이콘이 표시되는지 검증 (썸네일 URL 없음)
    const firstItem = dialog.locator('.local-import-item').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    await expect(firstItem.locator('.q-icon')).toBeVisible();
  });

  test('썸네일 토글 후 재스캔', async ({ page }) => {
    const dialog = await openLocalImportDialog(page);

    // 1. 썸네일 OFF로 스캔
    const checkbox = dialog.getByLabel('썸네일 표시');
    await checkbox.uncheck();

    const dirInput = dialog.getByPlaceholder('디렉토리 경로');
    await dirInput.fill(TEST_IMAGE_DIR);

    const responsePromise1 = page.waitForResponse(
      (res) => res.url().includes('/files/local/scan') && res.status() === 200,
    );
    await dialog.getByRole('button', { name: '스캔' }).click();
    await responsePromise1;

    // OFF 결과: placeholder 아이콘 확인
    const firstItem = dialog.locator('.local-import-item').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });
    await expect(firstItem.locator('.q-icon')).toBeVisible();

    // 2. 썸네일 ON으로 재스캔
    await checkbox.check();

    const requestPromise2 = page.waitForRequest((req) => req.url().includes('/files/local/scan'));
    const responsePromise2 = page.waitForResponse(
      (res) => res.url().includes('/files/local/scan') && res.status() === 200,
    );
    await dialog.getByRole('button', { name: '스캔' }).click();

    const request2 = await requestPromise2;
    const body2 = request2.postDataJSON();
    expect(body2.useThumbnail).toBe(true);

    await responsePromise2;

    // ON 결과: 썸네일 이미지로 변경되었는지 검증
    const firstItemAfter = dialog.locator('.local-import-item').first();
    await expect(firstItemAfter).toBeVisible({ timeout: 10000 });
    await expect(firstItemAfter.locator('img.local-import-item__img')).toBeVisible();
  });
});
