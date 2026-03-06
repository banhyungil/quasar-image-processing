# Vue Flow 핵심기능 정리

## 개요

`@vue-flow/core` + `@vue-flow/background` + `@dagrejs/dagre`를 사용한 이미지 처리 파이프라인 DAG 캔버스.

---

## 프로젝트 구조

```
src/
├── pages/
│   └── ImgPrcPage.vue            # 메인 페이지 (사이드바 + 캔버스 + 파라미터 패널)
├── components/flow/
│   ├── SourceNode.vue             # 원본 이미지 커스텀 노드
│   └── FilterNode.vue             # 필터 처리 커스텀 노드
├── types/
│   └── flowTypes.ts               # ProcessNodeData, SourceNodeData, FlatStep 타입
├── utils/
│   ├── flowLayout.ts              # dagre 자동 레이아웃
│   └── flowConverter.ts           # steps <-> flow 변환
```

---

## 1. 커스텀 노드

### SourceNode (원본 이미지)
- `type: 'source'`, 고정 ID `'source'`
- 클릭 시 이미지 업로드 (`pick-image` 이벤트)
- Output Handle만 존재 (하단)
- 데이터: `{ previewUrl: string | null }`

### FilterNode (필터 처리)
- `type: 'filter'`, UUID 기반 ID
- Input Handle (상단) + Output Handle (하단)
- 헤더: 라벨 + 파라미터 열기 / 활성화 토글 / 삭제 버튼
- 바디: base64 썸네일 이미지 + 실행시간(ms) 뱃지
- 이벤트: `open-params`, `remove`, `toggle-enabled`

### 등록 방식
`<VueFlow>` 템플릿 슬롯으로 등록 (`:node-types` prop 대신):
```vue
<template #node-filter="nodeProps">
  <FilterNode v-bind="nodeProps" @open-params="..." />
</template>
<template #node-source="nodeProps">
  <SourceNode v-bind="nodeProps" @pick-image="..." />
</template>
```

---

## 2. 노드 추가

### 사이드바 클릭 추가
`addFilterNode(prcType, label)`:
1. UUID 생성
2. 마지막 리프 노드 탐색 (`findLastLeaf`)
3. `addNodes()` + `addEdges()`로 노드/엣지 추가
4. `nextTick` 후 자동 레이아웃 + 썸네일 연산

### 드래그 앤 드롭 추가
- 사이드바 필터 카드에 `draggable="true"` + `@dragstart`
- 캔버스에 `@dragover` + `@drop`
- `dataTransfer`로 `prcType`, `label` 전달
- 드롭 시 `addFilterNode()` 호출

---

## 3. 노드 삭제

`removeFilterNode(nodeId)`:
1. 삭제할 노드의 부모 엣지 탐색
2. 자식 엣지들을 부모에 재연결 (그래프 끊김 방지)
3. `removeNodes()` + `addEdges()`
4. `nextTick` 후 자동 레이아웃

---

## 4. 엣지 연결 & 순환 방지

`onConnect(connection)`:
- 유저가 Handle 드래그로 엣지 생성 시 호출
- `hasCycle(source, target)`: BFS로 순환 참조 탐지
- 순환이면 연결 거부

---

## 5. 자동 레이아웃 (dagre)

`applyDagreLayout(nodes, edges, direction)`:
- `@dagrejs/dagre` 사용, 방향: TB (Top → Bottom)
- 노드 크기: 220x200 (필터), 220x180 (소스)
- 간격: nodesep=40, ranksep=60
- dagre 계산 후 position 보정 (중심 → 좌상단)

`relayout()`:
- `getNodes.value` / `getEdges.value`로 현재 상태 읽기
- 계산된 position을 `nodes.value`에 반영

---

## 6. 썸네일 연산

`processNodeThumbnail(targetNodeId)`:
1. `collectPathToNode()`: 타겟에서 source까지 엣지를 역추적하여 경로 수집
2. 경로의 각 filter 노드 → `TreeBatchStep[]` 변환
3. `batchTreeProcessing(originalFile, steps)` API 호출
4. 응답의 `results[].thumbnail` / `executionMs`를 각 노드 data에 매핑

### 주의사항
- `addEdges()` 후 `edges.value` 동기화는 비동기 → **반드시 `nextTick` 이후에 호출**

---

## 7. Flow <-> Steps 변환

### `stepsToFlow(steps, sourcePreviewUrl)` (API → 캔버스)
- `FlatStep[]` → `Node[]` + `Edge[]`
- source 노드 자동 추가
- `parentId === null` → source 노드에 연결
- dagre 레이아웃 자동 적용

### `flowToSteps(nodes, edges)` (캔버스 → API)
- filter 노드만 추출
- source 노드 제외
- `parentId === 'source'` → `null`로 매핑

---

## 8. Preset / Process 연동

### Preset
- **저장**: `flowToSteps()` → `createPreset()` API
- **불러오기**: preset.steps → `stepsToFlow()` → `nodes.value` / `edges.value` 직접 할당

### Process (처리목록)
- **불러오기**: 더블클릭 → `getProcess()` → `stepsToFlow()` → 캔버스에 반영

---

## 9. 파라미터 패널

- 노드의 `tune` 버튼 클릭 시 우측 슬라이드 패널 표시
- `PARAM_FIELDS[prcType]` 기반으로 동적 폼 렌더링 (number input, select)
- 실시간 바인딩: `updateParam(key, value)` → `node.data.parameters[key]` 직접 수정
- 기본값 초기화: `resetParams()`

---

## 10. 줌 비활성화

```vue
<VueFlow
  :zoom-on-scroll="false"
  :zoom-on-pinch="false"
  :zoom-on-double-click="false"
  :min-zoom="1"
  :max-zoom="1"
/>
```

Controls 컴포넌트 미사용.

---

## 11. useVueFlow 사용 패턴

```ts
const nodes = ref<Node[]>([...]);
const edges = ref<Edge[]>([]);

const { addNodes, addEdges, removeNodes, getNodes, getEdges } = useVueFlow();
```

- `v-model:nodes` / `v-model:edges`로 양방향 바인딩
- `addNodes()` / `addEdges()` / `removeNodes()`: 내부 스토어 조작 (ref 반영은 비동기)
- `getNodes` / `getEdges`: 내부 스토어의 computed (즉시 반영)
- `nodes.value` / `edges.value`: ref 바인딩 (nextTick 이후 동기화)

### 중요: ref vs 내부 스토어 타이밍
| 접근 방식 | 반영 시점 | 용도 |
|---|---|---|
| `getNodes.value` | 즉시 | dagre 레이아웃 계산 |
| `nodes.value` | nextTick 이후 | 템플릿 렌더링, 데이터 읽기 |
