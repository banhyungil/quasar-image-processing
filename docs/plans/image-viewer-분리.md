# 이미지 뷰어 페이지 분리 (v2)

## Context

확대팝업(ImageZoomPopup)의 기능들을 전체 영역에서 편하게 사용할 수 있도록 별도 페이지로 분리한다.
기존 캔버스의 사이드메뉴/옵션패널 구조를 재사용하고, Crop 탭만 추가한다.
`apply-to-canvas`(캔버스 연동)는 제외한다.

## 변경 파일

| 파일 | 작업 | 변경량 |
|---|---|---|
| `src/pages/ImageViewerPage.vue` | **신규** | ~300줄 |
| `src/components/sidebar/CropListPanel.vue` | **신규** | ~100줄 |
| `src/router/routes.ts` | 라우트 추가 | +5줄 |
| `src/components/AppSidebar.vue` | 네비 링크 추가 | +6줄 |

기존 파일(ImageZoomPopup, ZoomSidePanel, ImgPrcPage 등) 변경 없음.

## 레이아웃

```
/viewer 페이지
┌──────────────────────────────────────────────────────┐
│ 상단 툴바: [이미지 선택] [이미지명] [줌레벨]          │
├─────────┬────────────────────────────────┬───────────┤
│ 사이드바 │  메인 영역 (모드 탭)            │ 옵션패널  │
│         │  ┌──────────────────────────┐  │ (ParamPanel│
│ [필터]  │  │ 탐색 | 크롭 | 비교 | TL │  │  재사용)  │
│ [Crop]  │  ├──────────────────────────┤  │           │
│         │  │                          │  │           │
│         │  │  OsdViewer / 비교뷰 /    │  │           │
│         │  │  타임라인뷰              │  │           │
│         │  │                          │  │           │
│         │  └──────────────────────────┘  │           │
└─────────┴────────────────────────────────┴───────────┘
```

## 구현 계획

### 1. `src/router/routes.ts` — `/viewer` 라우트 추가

```ts
{ path: 'viewer', name: 'image-viewer', component: () => import('pages/ImageViewerPage.vue') }
```

### 2. `src/components/AppSidebar.vue` — 네비 링크 추가

```ts
{ title: '이미지 뷰어', caption: '이미지 탐색/필터', icon: 'image_search', to: { name: 'image-viewer' } }
```

### 3. `src/components/sidebar/CropListPanel.vue` — 신규 컴포넌트

ZoomSidePanel.vue의 Crop 목록 섹션(44~99줄)을 독립 컴포넌트로 추출

**props:**
- `cropList: CropItem[]`
- `activeCropId: string | null`

**emits:**
- `create-crop`
- `select-crop(cropId)`
- `remove-crop(cropId)`

### 4. `src/pages/ImageViewerPage.vue` — 신규 페이지

**사이드바 (좌측):**
- `q-tabs` + `q-tab-panels`로 탭 구성
  - `필터` 탭: 기존 `FilterListPanel` 재사용
  - `Crop` 탭: 새 `CropListPanel` 사용

**메인 영역 (중앙):**
- 상단: 이미지 선택 버튼 + 모드 탭 (`q-btn-toggle`: 탐색/크롭/비교/타임라인)
- 뷰어: ImageZoomPopup.vue 309~403줄의 템플릿 패턴 동일
  - explore: `OsdViewer`
  - crop: 크롭 이미지
  - compare: 좌우 `OsdViewer` 비교
  - timeline: `TimelineViewer`

**옵션 패널 (우측):**
- 기존 `ParamPanel` 재사용
- 사이드바에서 필터 클릭 시 표시

**이미지 선택 흐름:**
- "이미지 선택" 버튼 → `ImageGalleryDialog` 재사용
- 선택 시 `fileId` 설정 → `filesApi.getOriginSizeUrl(fileId, [], 'source')` 호출
- DZI 또는 이미지 URL을 OsdViewer에 전달

**재사용 컴포저블:**
- `useCropManager(fileId, nodeSteps=[], nodeId='source')`
- `usePreviewManager(fileId, activeCrop, tempSteps)`

**재사용 컴포넌트:**
- `FilterListPanel` — 필터 목록/추가 (기존 그대로)
- `ParamPanel` — 파라미터 편집 (기존 그대로)
- `OsdViewer` — 이미지 뷰어 (기존 그대로)
- `TimelineViewer` — 타임라인 (기존 그대로)
- `ImageGalleryDialog` — 이미지 선택 (기존 그대로)

## 검증

1. `/viewer` 접속 → 페이지 렌더링 확인
2. 이미지 선택 → OsdViewer에 표시 확인
3. 사이드바 필터 탭 → 필터 추가 → 크롭 자동 생성 → 비교 모드 전환 확인
4. 사이드바 Crop 탭 → 크롭 목록 관리 확인
5. 타임라인 모드 동작 확인
6. 기존 `ImgPrcPage`의 캔버스/확대팝업이 그대로 동작하는지 확인
