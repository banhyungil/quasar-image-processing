# ImgPrcPage 리팩토링 방안

## 현황

- `ImgPrcPage.vue` 1557줄, script만 1178줄
- 10개 이상의 독립적 관심사가 하나의 컴포넌트에 혼재
- 노드 리사이즈 로직이 FilterNode/SourceNode에 동일하게 복붙
- useCropManager 내 `computeViewportStatus` 함수 중복 정의
- OsdViewer에 디버그 console.log 잔존
- window 이벤트 리스너 cleanup 누락 위험

## 목표

- ImgPrcPage.vue script를 **composable 분리**로 500줄 이하로 축소
- 중복 코드 제거
- 코딩 가이드라인 준수 (composable은 onUnmounted에서 cleanup, computed prefix `c` 등)

---

## Phase 1: Composable 추출 (ImgPrcPage 분할)

### 1-1. `useFilterGraph.ts` — 노드 그래프 조작

ImgPrcPage.vue에서 추출할 상태/함수:

```
상태:
- nodes, edges
- selectedNodeId, cSelectedNodeIds
- SOURCE_NODE_ID

함수:
- onNodeClick, onPaneClick
- addFilterNode, addCustomFilterNode
- removeFilterNode
- findLastLeaf
- onConnect, hasCycle
- collectPathToNode, collectDescendantLeaves
- relayout
- toggleEnabled
- onChangeFilter
- setNodeSize, onNodeResize, applyNodeSizeAll, nodeSizeInput
- resetCanvas
```

인자:
- `oOrigin` (reactive) — fileId 참조용
- `settingsStore` — nodeSize 접근
- `getDefaultParams` 함수

반환:
- 위 상태/함수 전부

### 1-2. `usePresetManager.ts` — Preset CRUD

```
상태:
- presets, activePresetId
- showSavePresetDialog, presetDialogName, presetDialogDescription
- isEditingPreset, cHasFilterNodes

함수:
- loadPresets
- loadPreset
- openSavePresetDialog, openUpdatePresetDialog
- onConfirmPreset
- removePreset
```

의존:
- `nodes`, `edges` (useFilterGraph에서 제공)
- `oOrigin` — imageUrl 참조
- `flowToSteps`, `stepsToFlow`

### 1-3. `useProcessManager.ts` — Process CRUD

```
상태:
- processList, activeProcessId
- showSaveProcessDialog, processDialogName, isEditingProcess

함수:
- loadProcessList
- onProcessDblClick
- openSaveProcessDialog, openUpdateProcessDialog
- onConfirmProcess
- removeProcess
```

의존:
- `nodes`, `edges` (useFilterGraph에서 제공)
- `oOrigin`, `setOriginalFile`
- `flowToSteps`, `stepsToFlow`

### 1-4. `useOriginImage.ts` — 원본 이미지 관리

```
상태:
- oOrigin, originalInputRef, showImageGallery, droppedFile

함수:
- setOriginalFile
- onOriginalInputChange
- onSelectExistingImage
- onDropFile
```

의존:
- `nodes` (source node 갱신)
- `processAllLeaves` 콜백

### 1-5. `useThumbnailProcessor.ts` — 썸네일 연산

```
상태:
- paramAbortController (내부)

함수:
- processNodeThumbnail
- processAllLeaves
- onParamChange (debounce)
- onParamApply
- buildStepsToNode
```

의존:
- `nodes`, `edges`, `oOrigin.fileId`
- `collectPathToNode`, `collectDescendantLeaves` (useFilterGraph)
- `cropMgr.activeCropId`
- `settingsStore`

### 1-6. `useZoomPopup.ts` — 이미지 확대 팝업

```
상태:
- zoomPopups, cZoomedNodeIds

함수:
- onNodeZoom
- onNodeDownload
- onCopyChain
- closeZoomPopup
- onApplyPreviewToCanvas
```

의존:
- `oOrigin.fileId`, `nodes`, `edges`
- `buildStepsToNode` (useThumbnailProcessor)
- `cropMgr`

---

## Phase 2: 중복 코드 제거

### 2-1. `useNodeResize.ts` — 드래그 리사이즈 composable

FilterNode.vue (40-72줄)과 SourceNode.vue (28-63줄)의 동일 코드를 추출.
VueUse의 `useEventListener` 반환값을 활용하여 동적 등록/해제 처리.

```typescript
import { useEventListener } from '@vueuse/core';

export function useNodeResize(
  nodeWidth: Ref<number>,
  nodeThumbHeight: Ref<number>,
  onComplete: (width: number, height: number) => void,
) {
  const resizing = ref(false);
  const resizeStart = { x: 0, y: 0, w: 0, h: 0 };
  const liveWidth = ref(0);
  const liveHeight = ref(0);

  let cleanupMove: (() => void) | null = null;
  let cleanupUp: (() => void) | null = null;

  function onResizeMouseMove(e: MouseEvent) {
    const dx = e.clientX - resizeStart.x;
    const dy = e.clientY - resizeStart.y;
    liveWidth.value = Math.max(120, Math.round(resizeStart.w + dx));
    liveHeight.value = Math.max(60, Math.round(resizeStart.h + dy));
  }

  function onResizeMouseUp() {
    resizing.value = false;
    cleanupMove?.();
    cleanupUp?.();
    onComplete(liveWidth.value, liveHeight.value);
  }

  function onResizeMouseDown(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    resizing.value = true;
    resizeStart.x = e.clientX;
    resizeStart.y = e.clientY;
    resizeStart.w = nodeWidth.value;
    resizeStart.h = nodeThumbHeight.value;
    liveWidth.value = resizeStart.w;
    liveHeight.value = resizeStart.h;

    // useEventListener 반환값으로 동적 해제
    cleanupMove = useEventListener(window, 'mousemove', onResizeMouseMove);
    cleanupUp = useEventListener(window, 'mouseup', onResizeMouseUp);
  }

  const cWidth = computed(() => resizing.value ? liveWidth.value : nodeWidth.value);
  const cThumbHeight = computed(() => resizing.value ? liveHeight.value : nodeThumbHeight.value);

  return { resizing, cWidth, cThumbHeight, onResizeMouseDown };
}
```

- `useEventListener`는 컴포넌트 unmount 시에도 자동 cleanup되므로 메모리 누수 방지
- mouseup 시 `cleanupMove/cleanupUp` 호출로 즉시 해제

### 2-2. `useCropManager.ts` 내 `computeViewportStatus` 중복 제거

- 내부 함수(54-62줄) 삭제
- export된 함수(18-26줄)만 유지
- composable 내부에서는 export된 함수 호출

---

## Phase 3: 코드 품질 개선

### 3-1. OsdViewer.vue 디버그 로그 제거

제거 대상:
- `console.log('onCanvasDrag')` 
- `console.log('onCanvasKey')`
- `console.log('onCanvasRelease')`
- `console.log('Shift+드래그 시작')`

### 3-2. 에러 처리 통일

`setOriginalFile`의 `console.error`만 사용하는 부분 → `$q.notify` 추가:
```typescript
// Before
console.error('원본 이미지 업로드 실패:', err);

// After
console.error('원본 이미지 업로드 실패:', err);
$q.notify({ type: 'negative', message: '이미지 업로드에 실패했습니다.' });
```

### 3-3. Non-null assertion 안전성 개선

ImgPrcPage.vue 191줄:
```typescript
// Before
const nextCropId = cropMgr.cropList.value[0]!.cropId;

// After
const nextCrop = cropMgr.cropList.value[0];
if (!nextCrop) return;
const nextCropId = nextCrop.cropId;
```

---

## Phase 4: 사이드바 드래그/드롭 정리

### 4-1. 캔버스 드래그/드롭 로직을 `useFilterGraph`에 통합

```
함수:
- onSidebarDragStart
- onCanvasDragOver
- onCanvasDrop
```

---

## 리팩토링 후 ImgPrcPage.vue 구조 예상

```vue
<script setup lang="ts">
// composables
const filterGraph = useFilterGraph(...)
const originImage = useOriginImage(...)
const thumbnailProcessor = useThumbnailProcessor(...)
const presetMgr = usePresetManager(...)
const processMgr = useProcessManager(...)
const zoomPopup = useZoomPopup(...)
const cropMgr = useCropManager(...)

// 사이드바/UI 상태
const sidebarTab = ref<'filters' | 'presets' | 'processes' | 'crops'>('filters')
const splitterSize = ref(20)

// 파라미터 패널
const showOptionPanel = ref(false)
const optionPanelTarget = ref<string | null>(null)
// ...패널 토글 로직

// 커스텀 필터 에디터
const showCustomFilterEditor = ref(false)
// ...에디터 관련

// 초기 로드
onMounted(async () => {
  await Promise.all([presetMgr.loadPresets(), processMgr.loadProcessList()])
})
</script>
```

약 200-300줄 수준으로 축소 예상.

---

## 실행 순서

| 순서 | 작업 | 예상 영향도 |
|------|------|------------|
| 1 | `useNodeResize.ts` 추출 (Phase 2-1) | 낮음 — 독립 컴포넌트 수정 |
| 2 | `computeViewportStatus` 중복 제거 (Phase 2-2) | 낮음 |
| 3 | OsdViewer 디버그 로그 제거 (Phase 3-1) | 낮음 |
| 4 | `useFilterGraph.ts` 추출 (Phase 1-1) | 높음 — 핵심 로직 |
| 5 | `useOriginImage.ts` 추출 (Phase 1-4) | 중간 |
| 6 | `useThumbnailProcessor.ts` 추출 (Phase 1-5) | 높음 — 비동기 로직 |
| 7 | `usePresetManager.ts` 추출 (Phase 1-2) | 중간 |
| 8 | `useProcessManager.ts` 추출 (Phase 1-3) | 중간 |
| 9 | `useZoomPopup.ts` 추출 (Phase 1-6) | 중간 |
| 10 | 에러 처리 통일 + 안전성 개선 (Phase 3-2, 3-3) | 낮음 |

낮은 영향도 작업부터 시작하여 리스크를 최소화하고, 이후 핵심 composable을 순차적으로 분리합니다.

---

## 주의사항

- 각 composable은 setup root scope에서 선언 (코딩 가이드라인)
- composable 내 이벤트 리스너는 반드시 `onUnmounted`에서 해제
- `watch immediate`가 있는 composable은 마지막에 선언
- computed는 `c` prefix 유지
- API 호출은 namespace import 유지 (`filesApi.xxx`)
