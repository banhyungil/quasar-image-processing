# E2E 테스트 환경 (Playwright)

## 1. 설치

```bash
# Playwright 테스트 러너
npm install -D @playwright/test

# 브라우저 다운로드 (Chromium)
npx playwright install chromium
```

## 2. 설정 파일 — `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npx quasar dev', // 테스트 전 dev 서버 자동 실행
    port: 9000,
    reuseExistingServer: true, // 이미 실행 중이면 재사용
  },
  use: {
    baseURL: 'http://localhost:9000', // 프론트엔드 dev 서버 주소 (백엔드 X)
    viewport: { width: 1920, height: 1080 },
    trace: 'on', // 매 테스트마다 트레이스 기록 (DOM 스냅샷 + 네트워크 + 콘솔)
    video: 'on', // 매 테스트마다 영상 녹화 (webm)
    screenshot: 'on', // 매 테스트마다 스크린샷 촬영
  },
});
```

### trace vs video

|        | trace                              | video                 |
| ------ | ---------------------------------- | --------------------- |
| 형태   | 단계별 DOM 스냅샷 + 네트워크 로그  | 단순 화면 녹화 (webm) |
| 탐색   | 타임라인에서 단계별 클릭 탐색 가능 | 재생/일시정지만 가능  |
| 디버깅 | DOM 요소 검사, 네트워크 요청 확인  | 화면만 보임           |

### 녹화 옵션

| 값                    | 동작                             |
| --------------------- | -------------------------------- |
| `'on'`                | 항상 기록                        |
| `'retain-on-failure'` | 실패한 테스트만 보존 (용량 절약) |
| `'off'`               | 비활성화                         |

## 3. 테스트 파일 구조

```
e2e/                     ← E2E 테스트 디렉토리
├── fixtures/
│   └── test.png         ← 테스트용 파일
└── upload.spec.ts       ← 테스트 파일

test-results/            ← 실행 결과 (자동 생성)
├── video.webm           ← 녹화 영상
└── trace.zip            ← 트레이스 파일
```

## 4. 실행 스크립트

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:gen": "playwright codegen --output e2e/recorded.spec.ts --viewport-size=1920,1080 http://localhost:9000"
}
```

| 명령                                        | 용도                                              |
| ------------------------------------------- | ------------------------------------------------- |
| `npm run test:e2e`                          | 전체 테스트 실행 (headless)                       |
| `npm run test:e2e:ui`                       | UI 모드 — 단계별 스크린샷 타임라인으로 확인       |
| `npm run test:e2e:gen`                      | Codegen — 브라우저 조작을 녹화하여 코드 자동 생성 |
| `npx playwright test --headed`              | 브라우저 창 열고 실행 (육안 확인)                 |
| `npx playwright test --headed`                | 느리게 보려면 config에서 `launchOptions.slowMo` 설정 |
| `npx playwright show-report`                | HTML 리포트에서 결과/영상 확인                    |

## 5. Codegen 사용법

```bash
# 1. dev 서버 먼저 실행 (codegen은 webServer 설정을 사용하지 않음)
npx quasar dev

# 2. 별도 터미널에서 codegen 실행
npm run test:e2e:gen
```

- 브라우저에서 직접 조작하면 실시간으로 테스트 코드 생성
- 창을 닫으면 `--output`으로 지정한 파일에 저장
- 생성된 코드는 **초안**으로 활용하고 셀렉터를 다듬어야 함

### 셀렉터 우선순위 (안정적인 순)

| 우선순위 | 방식        | 예시                                    |
| -------- | ----------- | --------------------------------------- |
| 1        | 텍스트      | `getByText('업로드')`                   |
| 2        | Role        | `getByRole('button', { name: '삭제' })` |
| 3        | Placeholder | `getByPlaceholder('파일명 검색')`       |
| 4        | data-testid | `getByTestId('upload-btn')`             |
| 5        | CSS 클래스  | `.gallery-item`                         |

- codegen이 UUID/동적 ID로 셀렉터를 잡는 경우 깨지기 쉬우므로 위 기준으로 수정할 것

## 6. VS Code 확장 — Playwright Test for VSCode

- 확장 ID: `ms-playwright.playwright`
- 별도 설정 없이 `playwright.config.ts`를 자동 인식
- 기능:
  - 사이드바 Testing 탭에서 테스트 목록 확인 / 개별 실행
  - 트레이스 뷰어 내장
  - Record 버튼으로 codegen 실행 가능

## 7. APP 이용 가이드 영상 생성

E2E 테스트를 활용하여 앱 사용 가이드 영상을 자동 생성할 수 있다.

### 실행 방법

```bash
# headed 모드로 녹화 (slowMo는 config에서 설정)
npx playwright test --headed
```

`test-results/`에 webm 영상이 저장된다.

### 자연스러운 영상을 위한 설정

| 설정                                                         | 용도                                     |
| ------------------------------------------------------------ | ---------------------------------------- |
| config에 `launchOptions: { slowMo: 1000 }` | 동작 간격을 늘려서 따라가기 쉽게         |
| `await page.waitForTimeout(1000)`                            | 테스트 코드 내에서 특정 화면에 잠시 멈춤 |
| `video: { mode: 'on', size: { width: 1920, height: 1080 } }` | config에서 고해상도 녹화 설정            |

### 장점

- 시나리오별 테스트를 작성해두면 **기능 변경 시 가이드 영상도 자동 재생성** 가능
- 문서 유지보수 비용 감소
- 테스트와 가이드를 동시에 관리

## CLI 옵션

### 파일 지정

```bash
npx playwright test e2e/upload.spec.ts
```

### 테스트명으로 필터 (-g 옵션)

```bash
npx playwright test -g "파일 업로드"
```

### 특정 describe 전체

```bash
npx playwright test -g "파일 관리"
```

## 8. 단위 테스트와의 관계

```
        /  E2E  \        ← 적게, 핵심 시나리오만 (Playwright)
       /─────────\
      /  단위 테스트 \    ← 많이, 빠르게 (Vitest)
     /──────────────\
```

|      | 단위 테스트               | E2E 테스트                    |
| ---- | ------------------------- | ----------------------------- |
| 도구 | Vitest                    | Playwright                    |
| 대상 | API 함수의 요청 조립 로직 | 브라우저에서 전체 사용자 흐름 |
| 속도 | 빠름 (ms)                 | 느림 (초)                     |
| 서버 | 불필요 (mock)             | 프론트 + 백엔드 모두 필요     |
| 위치 | `tests/`                  | `e2e/`                        |
