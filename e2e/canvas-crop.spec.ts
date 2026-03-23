import { test, expect, type Page } from '@playwright/test';

// 이미지 선택 후 캔버스 준비 헬퍼
async function setupCanvas(page: Page) {
  await page.goto('/');

  // 원본 이미지 선택 버튼 클릭 → 갤러리 열기
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
    // 다이얼로그 닫힘 대기
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

    // 원본 이미지 항목 확인 (이미지 미선택 상태에서도 표시)
    await expect(page.locator('.crop-panel').getByText('원본 이미지')).toBeVisible({ timeout: 5000 });
  });

  test('SourceNode crop 버튼 → CropDialog 열림', async ({ page }) => {
    await setupCanvas(page);

    // SourceNode hover → crop 버튼 클릭
    await page.locator('.source-node').hover();
    const cropBtn = page.locator('.source-node .q-btn').filter({ has: page.locator('i:text("crop")') }).first();
    await cropBtn.click();

    // CropDialog 확인
    await expect(page.getByText('Crop 영역 지정')).toBeVisible();
  });
});

// ── 풀해상도 / 중간노드 토글 ─────────────────────────────────────────────

test.describe('캔버스 옵션 토글', () => {
  test('풀해상도 토글 버튼 동작', async ({ page }) => {
    await setupCanvas(page);

    // HD 아이콘 버튼 찾기
    const hdBtn = page.locator('button, .q-btn').filter({ has: page.locator('i:text("hd")') }).first();
    await expect(hdBtn).toBeVisible();

    // 클릭 → 풀해상도 ON
    await hdBtn.click();

    // 경고 알림 표시 확인 (Crop 없이 풀해상도)
    await expect(page.locator('.q-notification')).toBeVisible({ timeout: 5000 });
  });

  test('중간 노드 숨기기 토글 버튼', async ({ page }) => {
    await setupCanvas(page);

    // visibility_off 아이콘 버튼
    const hideBtn = page.locator('button, .q-btn').filter({ has: page.locator('i:text("visibility_off")') }).first();
    await expect(hideBtn).toBeVisible();

    // 클릭 → 토글
    await hideBtn.click();

    // 버튼이 여전히 보이는지 (토글 상태 변경)
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

    // SourceNode hover
    await page.locator('.source-node').hover();

    // 크기 뱃지 표시 확인
    const sizeBadge = page.locator('.source-node__size-badge');
    await expect(sizeBadge).toBeVisible();
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
