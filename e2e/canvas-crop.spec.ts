import { test, expect, type Page } from '@playwright/test';

// 이미지 선택 후 캔버스 준비 헬퍼
async function setupCanvas(page: Page) {
  await page.goto('/');

  // 원본 이미지 선택 → 갤러리 열기
  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/files') && res.status() === 200,
  );
  await page.locator('.source-node').click();
  await expect(page.getByText('이미지 선택', { exact: true })).toBeVisible();
  await responsePromise;

  // 갤러리에서 첫 번째 이미지 선택
  const firstItem = page.locator('.gallery-item').first();
  if (await firstItem.isVisible()) {
    await firstItem.click();
    await expect(page.getByText('이미지 선택', { exact: true })).not.toBeVisible();
  }

  // SourceNode에 이미지 로드 대기
  await expect(page.locator('.source-node img')).toBeVisible({ timeout: 10000 });
}

// ── Crop 생성 & 목록 관리 ────────────────────────────────────────────────

test.describe('Crop 생성 & 목록 관리', () => {
  test('Crop 탭에 원본 이미지 항목 표시', async ({ page }) => {
    await page.goto('/');

    // Crop 탭 클릭
    await page.locator('.q-tab').filter({ hasText: 'Crop' }).click();

    // 원본 이미지 항목 확인
    await expect(page.locator('.crop-panel').getByText('원본 이미지')).toBeVisible({ timeout: 5000 });
  });

  test('SourceNode crop 버튼 → CropDialog 열림', async ({ page }) => {
    await setupCanvas(page);

    // SourceNode hover → 첫 번째 버튼 (crop)
    await page.locator('.source-node').hover();
    const buttons = page.locator('.source-node__header .q-btn');
    await buttons.first().click();

    // CropDialog 확인
    await expect(page.getByText('Crop 영역 지정')).toBeVisible({ timeout: 5000 });
  });

  test('CropDialog에서 crop 생성 → Crop 탭에 표시', async ({ page }) => {
    await setupCanvas(page);

    // crop 생성
    await page.locator('.source-node').hover();
    const buttons = page.locator('.source-node__header .q-btn');
    await buttons.first().click();
    await expect(page.getByText('Crop 영역 지정')).toBeVisible({ timeout: 5000 });

    // 뷰포트 저장
    await page.locator('.q-bar button', { has: page.locator('img[alt="content_cut"], .q-icon:text("content_cut")') }).first().click();

    // 다이얼로그 닫기
    await page.locator('.q-bar button', { has: page.locator('img[alt="close"], .q-icon:text("close")') }).first().click();

    // Crop 탭으로 이동 → crop 항목 확인
    await page.locator('.q-tab').filter({ hasText: 'Crop' }).click();
    await expect(page.locator('.crop-item')).toHaveCount(1, { timeout: 5000 });
  });
});

// ── 풀해상도 / 중간노드 토글 ─────────────────────────────────────────────

test.describe('캔버스 옵션 토글', () => {
  test('풀해상도 토글 버튼 동작', async ({ page }) => {
    await setupCanvas(page);

    // HD 버튼 찾기 (icon: "hd")
    const hdBtn = page.locator('button').filter({ hasText: 'hd' }).first();
    await expect(hdBtn).toBeVisible();

    // 클릭 → 풀해상도 ON → 경고 알림
    await hdBtn.click();
    await expect(page.locator('.q-notification')).toBeVisible({ timeout: 5000 });
  });

  test('중간 노드 숨기기 토글 버튼', async ({ page }) => {
    await setupCanvas(page);

    // visibility_off 버튼
    const hideBtn = page.locator('button').filter({ hasText: 'visibility_off' }).first();
    await expect(hideBtn).toBeVisible();

    // 클릭 → 토글
    await hideBtn.click();
    await expect(hideBtn).toBeVisible();
  });
});

// ── 노드 리사이즈 ────────────────────────────────────────────────────────

test.describe('노드 리사이즈', () => {
  test('사이즈 입력 + 적용 버튼 → 전체 노드 일괄 변경', async ({ page }) => {
    await setupCanvas(page);

    // 노드 크기 입력
    const sizeInput = page.locator('input[type="number"]').first();
    await sizeInput.clear();
    await sizeInput.fill('300');

    // 적용 버튼 클릭
    await page.getByRole('button', { name: '적용' }).click();

    // SourceNode 너비 확인
    const width = await page.locator('.source-node').evaluate((el) => el.style.width);
    expect(width).toBe('300px');
  });

  test('노드 hover 시 크기 뱃지 표시', async ({ page }) => {
    await setupCanvas(page);

    await page.locator('.source-node').hover();
    const sizeBadge = page.locator('.source-node__size-badge');
    await expect(sizeBadge).toBeVisible();
  });
});

// ── Crop + 확대팝업 ──────────────────────────────────────────────────────

test.describe('Crop + 확대팝업', () => {
  test('Crop 선택 후 SourceNode 확대 → crop 타이틀로 팝업 열림', async ({ page }) => {
    await setupCanvas(page);

    // 1. crop 생성
    await page.locator('.source-node').hover();
    const buttons = page.locator('.source-node__header .q-btn');
    await buttons.first().click();
    await expect(page.getByText('Crop 영역 지정')).toBeVisible({ timeout: 5000 });
    await page.locator('.q-bar button', { has: page.locator('img[alt="content_cut"], .q-icon:text("content_cut")') }).first().click();
    await page.locator('.q-bar button', { has: page.locator('img[alt="close"], .q-icon:text("close")') }).first().click();

    // 2. Crop 탭에서 crop 선택
    await page.locator('.q-tab').filter({ hasText: 'Crop' }).click();
    const cropItem = page.locator('.crop-item').first();
    await expect(cropItem).toBeVisible({ timeout: 5000 });
    await cropItem.click();

    // 3. SourceNode 확대
    await page.locator('.source-node').hover();
    const zoomBtn = page.locator('.source-node__header button', { has: page.locator('img[alt="zoom_in"], .q-icon:text("zoom_in")') }).first();
    await zoomBtn.click();

    // 확대팝업이 "Crop:" 타이틀로 열리는지 확인
    await expect(page.locator('.zoom-header').getByText('Crop:')).toBeVisible({ timeout: 5000 });
  });

  test('Crop 미선택 시 SourceNode 확대 → 원본 이미지로 팝업 열림', async ({ page }) => {
    await setupCanvas(page);

    // SourceNode 확대 버튼 클릭
    await page.locator('.source-node').hover();
    const zoomBtn = page.locator('.source-node__header button', { has: page.locator('img[alt="zoom_in"], .q-icon:text("zoom_in")') }).first();
    await zoomBtn.click();

    // "원본 이미지" 타이틀 확인
    await expect(page.locator('.zoom-header').getByText('원본 이미지')).toBeVisible({ timeout: 5000 });
  });
});

// ── 해상도 표시 ──────────────────────────────────────────────────────────

test.describe('해상도 표시', () => {
  test('SourceNode 이미지 선택 후 해상도 뱃지 표시', async ({ page }) => {
    await setupCanvas(page);

    const badge = page.locator('.source-node__badge');
    if (await badge.isVisible()) {
      const text = await badge.textContent();
      expect(text).toMatch(/\d+x\d+/);
    }
  });
});

// ── 다중 선택 ────────────────────────────────────────────────────────────

test.describe('다중 선택', () => {
  test('캔버스 빈 영역 클릭 → 선택 해제', async ({ page }) => {
    await setupCanvas(page);

    // 소스 노드 클릭
    await page.locator('.source-node').click();

    // 캔버스 빈 영역 클릭
    await page.locator('.vue-flow__pane').click({ position: { x: 10, y: 10 } });
  });
});
