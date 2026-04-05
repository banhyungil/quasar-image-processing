# Composable 순수화 — 상위 조율 패턴 적용 방안

## 현황

현재 composable들이 외부 함수를 options로 주입받아 내부에서 호출하고 있다.

```typescript
const presetMgr = usePresetMgr({
  nodes, edges,
  oOriginImageUrl: ...,
  getDefaultParams: graph.getDefaultParams,     // 주입
  relayout: graph.relayout,                     // 주입
  processAllLeaves: () => thumbProc.processAllLeaves(), // 주입
});
```

**문제:**
- composable이 다른 composable의 내부를 알고 호출하는 구조
- 인자 수가 많아지고, 의존 방향이 모호해짐
- 테스트 시 mock 함수를 넘겨야 함

## 목표

- composable은 **자기 관심사만 처리** (상태 관리 + API 호출)
- 부수효과 연쇄 (`relayout`, `processAllLeaves`)는 **페이지가 조율**
- 주입 함수 제거 → options가 간결해짐

## 원칙

1. **composable은 자기 상태를 변경하고 결과를 반환한다** — 다른 composable의 함수를 호출하지 않음
2. **연쇄 동작은 페이지의 핸들러가 조합한다** — "프리셋 로드 → 레이아웃 → 썸네일" 흐름은 페이지 책임
3. **순수 변환 로직은 composable 외부에 export 함수로 분리 가능** — 테스트 용이

---

## 변경 대상

### usePresetMgr

**Before:**
```typescript
export function usePresetMgr({
  nodes, edges, oOriginImageUrl,
  getDefaultParams,    // 제거 대상
  relayout,            // 제거 대상
  processAllLeaves,    // 제거 대상
}) {
  function loadPreset(preset) {
    const flatSteps = preset.steps.map(s => ({
      ...getDefaultParams(s.algorithmNm), ...(s.parameters ?? {}),
      // ...
    }));
    const flow = stepsToFlow(flatSteps, oOriginImageUrl.value);
    nodes.value = flow.nodes;
    edges.value = flow.edges;
    nextTick(() => {
      relayout();
      processAllLeaves();
    });
  }

  async function onConfirmPreset(name, description) {
    // ...API 호출...
    await loadPresets();
  }
}
```

**After:**
```typescript
// 순수 변환 함수 (export, 테스트 가능)
export function buildPresetFlow(
  preset: PresetRes,
  getDefaultParams: (type: string) => Record<string, unknown>,
  imageUrl: string | null,
) {
  const flatSteps = preset.steps.map(s => ({
    id: String(s.id),
    parentId: s.parentId != null ? String(s.parentId) : null,
    algorithmNm: s.algorithmNm,
    stepOrder: s.stepOrder,
    parameters: { ...getDefaultParams(s.algorithmNm), ...(s.parameters ?? {}) },
    isEnabled: true,
  }));
  return stepsToFlow(flatSteps, imageUrl);
}

export function usePresetMgr({
  nodes,
  edges,
}: {
  nodes: Ref<AppNode[]>;
  edges: Ref<Edge[]>;
}) {
  // 상태 관리만
  function loadPreset(preset: PresetRes, flow: { nodes: AppNode[]; edges: Edge[] }) {
    activePresetId.value = preset.id;
    nodes.value = flow.nodes;
    edges.value = flow.edges;
  }
  // ...
}
```

**페이지 조율:**
```typescript
function onLoadPreset(preset: PresetRes) {
  const flow = buildPresetFlow(preset, graph.getDefaultParams, oOrigin.value.imageUrl);
  presetMgr.loadPreset(preset, flow);
  nextTick(() => {
    graph.relayout();
    thumbnailProcessor.processAllLeaves();
  });
}
```

### useProcessMgr

**Before:**
```typescript
export function useProcessMgr({
  nodes, edges, oOriginFileId,
  getDefaultParams,    // 제거 대상
  setOriginalFile,     // 제거 대상
  relayout,            // 제거 대상
  processAllLeaves,    // 제거 대상
})
```

**After:**
```typescript
// 순수 변환 함수
export function buildProcessFlow(
  detail: ProcessDetailRes,
  getDefaultParams: (type: string) => Record<string, unknown>,
) {
  const flatSteps = detail.steps.map(s => ({ ... }));
  return stepsToFlow(flatSteps, null);
}

export function useProcessMgr({
  nodes,
  edges,
  oOriginFileId,
}: {
  nodes: Ref<AppNode[]>;
  edges: Ref<Edge[]>;
  oOriginFileId: Ref<number | null>;
}) {
  // API 호출 + 상태 관리만
  async function loadProcess(processId: number) {
    activeProcessId.value = processId;
    return await processesApi.fetchById(processId);
  }

  function applyProcessFlow(flow: { nodes: AppNode[]; edges: Edge[] }) {
    nodes.value = flow.nodes;
    edges.value = flow.edges;
  }
  // ...
}
```

**페이지 조율:**
```typescript
async function onProcessDblClick(process: ProcessRes) {
  const detail = await processMgr.loadProcess(process.id);

  if (detail.filePath) {
    const res = await fetch(`${API_HOST}/${detail.filePath}`);
    const blob = await res.blob();
    const file = new File([blob], detail.filePath.split('/').pop() ?? 'image.png', { type: blob.type });
    await setOriginalFile(file);
  }

  const flow = buildProcessFlow(detail, graph.getDefaultParams);
  processMgr.applyProcessFlow(flow);
  nextTick(() => {
    graph.relayout();
    thumbnailProcessor.processAllLeaves();
  });
}
```

### useFilterGraph

**Before:** `callbacks` 객체로 `toggleParamPanel`, `processNodeThumbnail`, `processAllLeaves` 주입

**After:**
```typescript
export function useFilterGraph({
  oOriginFileId,
  nodes,
  edges,
}: {
  oOriginFileId: Ref<number | null>;
  nodes?: Ref<AppNode[]>;
  edges?: Ref<Edge[]>;
}) {
  // addFilterNode은 노드만 추가하고 반환
  function addFilterNode(filterType, label) {
    // ... 노드/엣지 추가
    nextTick(() => relayout());
    return id; // 노드 ID 반환
  }
}
```

**페이지 조율:**
```typescript
function onAddFilter(filterType: FilterType, label: string) {
  const nodeId = graph.addFilterNode(filterType, label);
  toggleParamPanel(nodeId);
  if (oOrigin.value.fileId) {
    thumbnailProcessor.processNodeThumbnail(nodeId);
  }
}
```

### useOriginImage

**Before:** `onProcessAllLeaves` 콜백 주입

**After:**
```typescript
export function useOriginImage({
  nodes,
}: {
  nodes: Ref<AppNode[]>;
}) {
  // setOriginalFile은 이미지 설정만 하고 반환
  async function setOriginalFile(file: File | null, cropCleanup?: () => void) {
    // ... 업로드 + source 노드 동기화
    // processAllLeaves 호출하지 않음
  }
}
```

**페이지 조율:**
```typescript
async function onSetOriginalFile(file: File | null) {
  await originImage.setOriginalFile(file, file == null ? () => cropMgr.cleanupAll() : undefined);
  thumbnailProcessor.processAllLeaves();
}
```

### useZoomPopup

**Before:** `addNodes`, `addEdges`, `relayout`, `processAllLeaves`, `buildStepsToNode` 주입

**After:**
```typescript
export function useZoomPopup({
  nodes,
  oOriginFileId,
  activeCrop,
  buildStepsToNode,
}: {
  nodes: Ref<AppNode[]>;
  oOriginFileId: Ref<number | null>;
  activeCrop: Ref<CropItem | null>;
  buildStepsToNode: (nodeId: string) => TreeBatchStep[];
}) {
  // onApplyPreviewToCanvas는 steps만 반환, 실제 노드 추가는 안 함
  // onNodeZoom, onNodeDownload, onCopyChain은 자체 완결 (API 호출 후 자기 상태만 변경)
}
```

> `buildStepsToNode`은 graph의 순수 알고리즘이므로 주입 유지가 합리적 (or 별도 util로 추출)

---

## 주입 제거 요약

| composable | 제거되는 주입 함수 | 남는 options |
|---|---|---|
| `useFilterGraph` | `callbacks` 전체 | `oOriginFileId`, `nodes?`, `edges?` |
| `useOriginImage` | `onProcessAllLeaves` | `nodes` |
| `usePresetMgr` | `getDefaultParams`, `relayout`, `processAllLeaves`, `oOriginImageUrl` | `nodes`, `edges` |
| `useProcessMgr` | `getDefaultParams`, `setOriginalFile`, `relayout`, `processAllLeaves` | `nodes`, `edges`, `oOriginFileId` |
| `useZoomPopup` | `addNodes`, `addEdges`, `relayout`, `processAllLeaves` | `nodes`, `oOriginFileId`, `activeCrop`, `buildStepsToNode` |

## 페이지에 추가되는 조율 함수

| 함수 | 역할 |
|---|---|
| `onAddFilter` | 노드 추가 + 파라미터 패널 + 썸네일 |
| `onLoadPreset` | flow 변환 + 프리셋 로드 + 레이아웃 + 썸네일 |
| `onProcessDblClick` | 원본 로드 + flow 변환 + 레이아웃 + 썸네일 |
| `onSetOriginalFile` | 원본 설정 + crop 정리 + 썸네일 |
| `onApplyPreview` | 노드 추가 + 레이아웃 + 썸네일 |

## 부수 효과

- `thumbnailCallbacks` 지연 콜백 패턴 완전 제거
- composable 간 순환 참조 해소 (선언 순서 자유)
- 각 composable 단독 테스트 가능 (mock 주입 불필요)
