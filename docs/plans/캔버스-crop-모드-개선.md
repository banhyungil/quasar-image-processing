# 캔버스 Crop 모드 & 풀해상도 개선

## Context

현재 캔버스에서는 모든 노드를 썸네일(기본 250px)로 처리한다.
풀해상도 검토를 위해서는 확대팝업을 열어야 하는데, 이를 캔버스 자체에서 가능하게 개선한다.

핵심 아이디어:
- 별도 모드 없이 단일 캔버스에서 Crop/풀해상도 기능 추가
- Crop과 해상도는 독립적으로 선택 가능
  - Crop: 처리 영역을 줄이는 용도
  - 해상도: 썸네일/풀해상도 자유 선택 (저해상도 이미지는 Crop 없이도 풀해상도 가능)
- 중간 노드 숨기기: 최종 노드만 연산하여 성능 절약

## 현재 구조 참고

### 노드 사이즈 프리셋 (settings-store.ts:4-10)
```
xs: { width: 140, thumbHeight: 80,  thumbResolution: 150 }
sm: { width: 170, thumbHeight: 110, thumbResolution: 200 }
md: { width: 200, thumbHeight: 130, thumbResolution: 250 }  ← 기본값
lg: { width: 260, thumbHeight: 170, thumbResolution: 300 }
xl: { width: 320, thumbHeight: 210, thumbResolution: 400 }
```

### Crop 검증 기준 (useCropManager.ts:14-15)
```
MIN_CROP_PIXELS = 2,500     (50x50)
MAX_CROP_PIXELS = 16,000,000 (4000x4000)
```

### 처리 흐름 (ImgPrcPage.vue:367-419)
```
processNodeThumbnail(nodeId)
  → collectPathToNode() → batchTreeProcessing(fileId, steps, { thumbnailSize })
  → node.data.imageUrl = result.imageUrl
```

## 변경 파일

| 파일 | 작업 | 설명 |
|---|---|---|
| `src/stores/settings-store.ts` | 수정 | 풀해상도/중간노드숨기기 토글 추가 |
| `src/pages/ImgPrcPage.vue` | 수정 | Crop 연동, 처리 로직 분기, 노드 숨기기 |
| `src/components/sidebar/CropListPanel.vue` | **신규** | Crop 목록 관리 패널 |
| `src/components/flow/FilterNode.vue` | 수정 | 노드 리사이즈 핸들, 숨기기 옵션 |
| `src/components/flow/SourceNode.vue` | 수정 | Crop 영역 지정 UI |

## 구현 계획

### 1. settings-store 확장

```ts
useFullResolution: false      // 풀해상도 토글 (독립적, Crop과 무관)
hideIntermediateNodes: false   // 중간 노드 숨기기 토글
```

### 2. 사이드바에 Crop 탭 추가

ImgPrcPage.vue의 기존 사이드바 탭(필터/Preset/처리목록)에 **Crop 탭** 추가.
신규 `CropListPanel.vue` 컴포넌트 사용.

**CropListPanel 기능:**
- Crop 목록 표시 (썸네일 + 사이즈)
- Crop 선택/삭제
- 새 Crop 생성 버튼
- 뷰포트 사이즈 검증 표시 (too-small / ok / too-large)

기존 `useCropManager` 컴포저블을 ImgPrcPage에서 사용.

### 3. 처리 로직 분기

`processNodeThumbnail()` 수정 — Crop과 해상도를 독립적으로 처리:

```
const thumbSize = useFullResolution ? undefined : settingsStore.nodeSize.thumbResolution;

if (activeCrop) {
  // Crop 선택됨 → crop 영역 기준으로 처리
  batchTreeProcessing(fileId, steps, { thumbnailSize: thumbSize, cropId: activeCrop.id })
} else {
  // Crop 없음 → 전체 이미지 처리
  batchTreeProcessing(fileId, steps, { thumbnailSize: thumbSize })
}
```

| Crop | 해상도 | 동작 |
|---|---|---|
| X | 썸네일 | 기존과 동일 |
| X | 풀해상도 | 전체 이미지를 원본 해상도로 처리 (저해상도 이미지에 적합) |
| O | 썸네일 | Crop 영역을 축소해서 처리 |
| O | 풀해상도 | Crop 영역을 원본 해상도로 처리 (고해상도 이미지에 적합) |

풀해상도 토글 또는 Crop 변경 시 전체 노드 재처리.

### 4. 중간 노드 숨기기

**토글 옵션:** 설정 또는 툴바에 "중간 노드 숨기기" 토글

활성화 시:
- 최종 리프 노드만 `processNodeThumbnail()` 실행
- 중간 노드의 이미지 영역 숨기기 (노드 자체는 유지, 이미지만 미표시)
- 연산 절약 + 캔버스 깔끔

### 5. 노드 크기 자유 조절

기존 프리셋(xs~xl)은 유지하면서, 3가지 방식으로 자유롭게 크기 조절 가능:

**A. 드래그 리사이즈 (개별 노드)**
- 노드 우하단 모서리에 리사이즈 핸들 추가
- 드래그로 width/height 자유 조절
- 개별 노드마다 독립적인 사이즈 가능

**B. 다중 선택 리사이즈**
- Ctrl+클릭 또는 드래그 영역으로 다중 선택
- 선택된 노드 중 하나를 리사이즈하면 나머지도 동일 비율로 적용

**C. 사이즈 입력창 (전체 일괄 적용)**
- 설정 또는 툴바에 width/height 입력 필드 추가
- 값 입력 시 모든 노드를 해당 크기로 일괄 변경
- 기존 프리셋 버튼과 병행 (프리셋 = 자주 쓰는 사이즈 단축키)

노드 크기 변경 시 `thumbResolution`도 연동:
- width에 비례하여 thumbResolution 자동 계산 (예: width * 1.2)
- 풀해상도 모드에서는 thumbResolution 무시

### 6. Crop 영역 지정

SourceNode에서 Crop 생성:
- 기존 확대팝업의 OsdViewer Shift+드래그 패턴 재사용
- 또는 SourceNode 클릭 시 Crop 다이얼로그 열기
- `useCropManager.createCrop(viewport)` 호출

### 7. 사이즈 검증

풀해상도 진입 시 `computeViewportStatus()` 활용:
- `too-large` (16M px 초과): 경고 표시 + 처리 차단 또는 확인 후 진행
- `too-small` (2,500 px 미만): 안내 메시지
- `ok`: 바로 처리

## UX 흐름

```
1. 사용자가 캔버스에서 필터 체인 구성 (썸네일로 동작)
2. 저해상도 이미지 → 풀해상도 토글 ON → 바로 원본 해상도로 확인
3. 고해상도 이미지 → Crop 생성 → 영역 지정 → 풀해상도 ON → 크롭 영역만 풀해상도로 확인
4. 노드 크기를 드래그/입력으로 키워서 결과 확인
5. 필요 시 중간 노드 숨기기 ON → 최종 결과만 확인
6. 검토 완료 → Crop 해제 / 풀해상도 OFF로 복귀
```

## 검증

1. 기본 동작 → 기존 썸네일 처리와 동일하게 동작 확인
2. 풀해상도 토글 ON (Crop 없이) → 원본 해상도로 처리 확인
3. Crop 생성 → 사이드바 Crop 목록에 표시 확인
4. Crop + 풀해상도 → Crop 영역만 원본 해상도로 처리 확인
5. 사이즈 검증 → too-large 시 경고 표시 확인
6. 중간 노드 숨기기 → 리프 노드만 연산 확인
7. 노드 드래그 리사이즈 → 개별 노드 크기 변경 확인
8. 다중 선택 리사이즈 → 선택 노드 동시 크기 변경 확인
9. 사이즈 입력창 → 전체 노드 일괄 크기 변경 확인
