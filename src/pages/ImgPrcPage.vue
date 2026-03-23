<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import type { Node, Edge, Connection } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

import { PARAM_FIELDS, buildChainFilename } from 'src/constants/imgPrc';
import type { FilterType } from 'src/types/imgPrcType';
import * as presetApi from 'src/apis/presetApi';
import type { PresetResponse } from 'src/apis/presetApi';
import * as processApi from 'src/apis/processApi';
import type { ProcessResponse } from 'src/apis/processApi';
import * as filesApi from 'src/apis/filesApi';
import type { TreeBatchStep, PreviewTempStep } from 'src/types/imgPrcType';
import { API_HOST } from 'src/boot/axios';

import FilterNode from 'src/components/flow/FilterNode.vue';
import SourceNode from 'src/components/flow/SourceNode.vue';
import ParamPanel from 'src/components/flow/ParamPanel.vue';
import ImageZoomPopup from 'src/components/flow/ImageZoomPopup.vue';
import PresetSaveDialog from 'src/components/dialog/PresetSaveDialog.vue';
import ProcessSaveDialog from 'src/components/dialog/ProcessSaveDialog.vue';
import CustomFilterEditorDialog from 'src/components/dialog/CustomFilterEditorDialog.vue';
import ImageGalleryDialog from 'src/components/dialog/ImageGalleryDialog.vue';
import CropDialog from 'src/components/dialog/CropDialog.vue';
import FilterListPanel from 'src/components/sidebar/FilterListPanel.vue';
import PresetListPanel from 'src/components/sidebar/PresetListPanel.vue';
import ProcessListPanel from 'src/components/sidebar/ProcessListPanel.vue';
import CropListPanel from 'src/components/sidebar/CropListPanel.vue';
import { useCropManager } from 'src/composables/useCropManager';
import type { CustomFilter } from 'src/apis/customFilterApi';
import type {
  ProcessNodeData,
  SourceNodeData,
  FlatStep,
  AppNode,
  SourceNode as SourceNodeType,
} from 'src/types/flowTypes';
import { stepsToFlow, flowToSteps } from 'src/utils/flowConverter';
import { applyDagreLayout } from 'src/utils/flowLayout';
import { useSettingsStore } from 'src/stores/settings-store';
import { useQuasar } from 'quasar';

const settingsStore = useSettingsStore();
const $q = useQuasar();

const SOURCE_NODE_ID = 'source';

// ── vue-flow ───────────────────────────────────────────────────────────────
const nodes = ref<AppNode[]>([
  {
    id: SOURCE_NODE_ID,
    type: 'source',
    position: { x: 0, y: 0 },
    data: { previewUrl: null, thumbnailUrl: null },
  },
]);
const edges = ref<Edge[]>([]);

const { addNodes, addEdges, removeNodes } = useVueFlow();

// ── 노드 선택 ────────────────────────────────────────────────────────────
const selectedNodeId = ref<string | null>(null);

function onNodeClick({ node }: { node: Node }) {
  if (selectedNodeId.value === node.id) {
    selectedNodeId.value = null;
    toggleParamPanel(node.id, false);
  } else {
    selectedNodeId.value = node.id;
    if (node.type === 'filter') {
      toggleParamPanel(node.id);
    }
  }
}

function onPaneClick() {
  selectedNodeId.value = null;
}

// ── 사이드바 탭 ────────────────────────────────────────────────────────────
const sidebarTab = ref<'filters' | 'presets' | 'processes' | 'crops'>('filters');
const splitterSize = ref(20);

// ── 파라미터 패널 ──────────────────────────────────────────────────────────
const showOptionPanel = ref(false);
const optionPanelTarget = ref<string | null>(null);

// ── Preset ─────────────────────────────────────────────────────────────────
const presets = ref<PresetResponse[]>([]);
const activePresetId = ref<string | null>(null);
const showSavePresetDialog = ref(false);
const presetDialogName = ref('');
const presetDialogDescription = ref('');

// ── 처리목록 ───────────────────────────────────────────────────────────────
const processList = ref<ProcessResponse[]>([]);
const activeProcessId = ref<string | null>(null);

// ── 원본 이미지 ────────────────────────────────────────────────────────────
const oOrigin = ref<{ fileId: string | null; imageUrl: string | null }>({
  fileId: null,
  imageUrl: null,
});
const originalInputRef = ref<HTMLInputElement | null>(null);
const showImageGallery = ref(false);
const droppedFile = ref<File | null>(null);

// ── Crop 관리 ────────────────────────────────────────────────────────────
const canvasFileId = computed(() => oOrigin.value.fileId);
const canvasNodeSteps = ref<TreeBatchStep[]>([]);
const canvasNodeId = ref('source');
const cropMgr = useCropManager(canvasFileId, canvasNodeSteps, canvasNodeId);

const cOriginalThumbnailUrl = computed(() =>
  oOrigin.value.fileId ? `${API_HOST}/api/files/thumbnail/${oOrigin.value.fileId}` : null,
);

const showCropDialog = ref(false);
const cropDialogSrc = ref('');
const cropDialogDziUrl = ref<string | undefined>(undefined);

async function onSourceCrop() {
  if (!oOrigin.value.fileId) return;
  try {
    const res = await filesApi.getOriginSizeUrl(oOrigin.value.fileId, [], 'source');
    cropDialogDziUrl.value = res.dziUrl ? API_HOST + res.dziUrl : undefined;
    cropDialogSrc.value = res.imageUrl ? API_HOST + res.imageUrl : (oOrigin.value.imageUrl ?? '');
    showCropDialog.value = true;
  } catch {
    cropDialogSrc.value = oOrigin.value.imageUrl ?? '';
    showCropDialog.value = true;
  }
}

function onCanvasCropCreate() {
  void onSourceCrop();
}

function updateSourceNodeImage(cropId: string | null) {
  const sourceNode = nodes.value.find((n) => n.id === SOURCE_NODE_ID);
  if (!sourceNode || sourceNode.type !== 'source') return;
  const data = sourceNode.data as SourceNodeData;

  if (cropId) {
    const crop = cropMgr.cropList.value.find((c) => c.cropId === cropId);
    if (crop) {
      data.previewUrl = crop.nodeImageUrl;
      data.thumbnailUrl = null;
    }
  } else {
    data.previewUrl = oOrigin.value.imageUrl;
    data.thumbnailUrl = oOrigin.value.fileId
      ? `${API_HOST}/api/files/thumbnail/${oOrigin.value.fileId}`
      : null;
  }
}

function onSelectCrop(cropId: string) {
  cropMgr.activeCropId.value = cropId;
  updateSourceNodeImage(cropId);
  processAllLeaves();
}

function onRemoveCrop(cropId: string) {
  const wasActive = cropMgr.activeCropId.value === cropId;
  cropMgr.removeCrop(cropId);
  if (!wasActive) return;
  if (cropMgr.cropList.value.length === 0) {
    cropMgr.activeCropId.value = null;
    updateSourceNodeImage(null);
    processAllLeaves();
  } else {
    const nextCropId = cropMgr.cropList.value[0]!.cropId;
    cropMgr.activeCropId.value = nextCropId;
    updateSourceNodeImage(nextCropId);
    processAllLeaves();
  }
}

function onClearCrop() {
  cropMgr.activeCropId.value = null;
  updateSourceNodeImage(null);
  processAllLeaves();
}

function toggleFullResolution() {
  settingsStore.isFullResolution = !settingsStore.isFullResolution;
  processAllLeaves();
}

function toggleHideIntermediateNodes() {
  settingsStore.hideIntermediateNodes = !settingsStore.hideIntermediateNodes;
  processAllLeaves();
}

async function onCropViewport(viewport: { x: number; y: number; w: number; h: number }) {
  if (!cropMgr.validateViewport(viewport)) return;
  const crop = await cropMgr.createCrop(viewport);
  if (crop) {
    sidebarTab.value = 'crops';
    cropMgr.activeCropId.value = crop.cropId;
  }
}

function onDropFile(file: File) {
  droppedFile.value = file;
  showImageGallery.value = true;
}

/** 원본 이미지 설정 + 서버 업로드 (fileId 획득) */
async function setOriginalFile(file: File | null) {
  if (file == null) {
    if (oOrigin.value.imageUrl) {
      URL.revokeObjectURL(oOrigin.value.imageUrl);
    }
    oOrigin.value = { fileId: null, imageUrl: null };
    if (originalInputRef.value) {
      originalInputRef.value.value = '';
    }
  } else {
    if (!file.type.startsWith('image/')) return;

    if (oOrigin.value.imageUrl) {
      URL.revokeObjectURL(oOrigin.value.imageUrl);
    }
    oOrigin.value.imageUrl = URL.createObjectURL(file);

    // content hash 기반 중복 방지는 서버에서 처리
    document.body.style.cursor = 'wait';
    try {
      const uploaded = await filesApi.uploadFile(file);
      oOrigin.value.fileId = uploaded.id;
    } catch (err) {
      console.error('원본 이미지 업로드 실패:', err);
    } finally {
      document.body.style.cursor = 'default';
    }
  }
  // 소스 노드 previewUrl 동기화
  // type predicate로 반환노드타입 확정
  const sourceNode = nodes.value.find((n): n is SourceNodeType => n.type === 'source');
  if (sourceNode) {
    sourceNode.data.previewUrl = oOrigin.value.imageUrl;
    sourceNode.data.thumbnailUrl = oOrigin.value.fileId
      ? `${API_HOST}/api/files/thumbnail/${oOrigin.value.fileId}`
      : null;
  }

  processAllLeaves();
}

function openOriginalPicker() {
  originalInputRef.value?.click();
}

function onOriginalInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  void setOriginalFile(input.files?.[0] ?? null);
}

function onSelectExistingImage(tFile: {
  id: string;
  originNm: string;
  path: string;
  mimeType: string;
}) {
  oOrigin.value.fileId = tFile.id;
  if (oOrigin.value.imageUrl) URL.revokeObjectURL(oOrigin.value.imageUrl);
  oOrigin.value.imageUrl = `${API_HOST}/${tFile.path}`;

  const sourceNode = nodes.value.find((n): n is SourceNodeType => n.type === 'source');
  if (sourceNode) {
    sourceNode.data.previewUrl = oOrigin.value.imageUrl;
    sourceNode.data.thumbnailUrl = `${API_HOST}/api/files/thumbnail/${tFile.id}`;
  }
  processAllLeaves();
}

// ── 초기 데이터 로드 ───────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadPresets(), loadProcessList()]);
});

async function loadPresets() {
  const res = await presetApi.getPresets();
  presets.value = res.items;
}

async function loadProcessList() {
  const res = await processApi.getProcesses();
  processList.value = res.items;
}

// ── 파라미터 패널 ──────────────────────────────────────────────────────────
function getDefaultParams(filterType: string): Record<string, unknown> {
  const fields = PARAM_FIELDS[filterType];
  if (!fields) return {};
  return Object.fromEntries(fields.map((f) => [f.key, f.default]));
}

function toggleParamPanel(nodeId: string, isOpen: boolean = true) {
  if (isOpen) {
    optionPanelTarget.value = nodeId;
    showOptionPanel.value = true;
  } else {
    showOptionPanel.value = false;
    optionPanelTarget.value = null;
  }
}

const cSelNodeData = computed<ProcessNodeData | null>(() => {
  if (!optionPanelTarget.value) return null;
  const n = nodes.value.find((n) => n.id === optionPanelTarget.value);
  if (!n || n.type !== 'filter') return null;
  return n.data;
});

function onParamApply(updated: ProcessNodeData) {
  if (!oOrigin.value.fileId || !optionPanelTarget.value) return;

  // 파라미터를 노드에 반영
  const node = nodes.value.find((n) => n.id === optionPanelTarget.value);
  if (node && node.type === 'filter') {
    node.data.parameters = { ...updated.parameters };
  }

  const descendants = collectDescendantLeaves(optionPanelTarget.value);
  for (const leafId of descendants) {
    void processNodeThumbnail(leafId);
  }
}

// 파라미터 실시간 변경: debounce + abort
let paramAbortController: AbortController | null = null;

const onParamChange = useDebounceFn((parameters: Record<string, unknown>) => {
  if (!oOrigin.value.fileId || !optionPanelTarget.value) return;

  // 이전 요청 취소
  paramAbortController?.abort();
  paramAbortController = new AbortController();

  // 파라미터를 노드에 반영
  const node = nodes.value.find((n) => n.id === optionPanelTarget.value);
  if (node && node.type === 'filter') {
    node.data.parameters = { ...parameters };
  }

  const signal = paramAbortController.signal;
  const descendants = collectDescendantLeaves(optionPanelTarget.value);
  for (const leafId of descendants) {
    void processNodeThumbnail(leafId, { signal });
  }
}, 200);

// ── 노드 추가 (사이드바 클릭) ──────────────────────────────────────────────
function addFilterNode(filterType: FilterType, label: string) {
  const id = crypto.randomUUID();
  const newNode: Node<ProcessNodeData> = {
    id,
    type: 'filter',
    position: { x: 0, y: 0 },
    data: {
      algorithmNm: filterType,
      label,
      enabled: true,
      parameters: getDefaultParams(filterType),
      imageUrl: null,
      executionMs: null,
    },
  };

  // 선택된 노드가 있으면 그 하위에, 없으면 마지막 리프에 연결
  const parentId = selectedNodeId.value ?? findLastLeaf();
  const newEdge: Edge = {
    id: `e-${parentId}-${id}`,
    source: parentId,
    target: id,
    animated: true,
  };

  addNodes([newNode]);
  addEdges([newEdge]);
  toggleParamPanel(id);

  void nextTick(() => {
    relayout();
    if (oOrigin.value.fileId) {
      void processNodeThumbnail(id);
    }
  });
}

// ── 커스텀 필터 ─────────────────────────────────────────────────────────────
const showCustomFilterEditor = ref(false);
const editingCustomFilter = ref<CustomFilter | undefined>();
const filterListPanelRef = ref<InstanceType<typeof FilterListPanel> | null>(null);

function openCustomFilterEditor(cf?: CustomFilter) {
  editingCustomFilter.value = cf;
  showCustomFilterEditor.value = true;
}

function onCustomFilterSaved() {
  filterListPanelRef.value?.loadCustomFilters();
}

function addCustomFilterNode(cf: CustomFilter) {
  const id = crypto.randomUUID();
  const paramDefs = Array.isArray(cf.params)
    ? (cf.params as unknown as Array<{ key: string; default: unknown }>)
    : [];
  const defaultParams: Record<string, unknown> = {
    filterId: cf.id,
    ...Object.fromEntries(paramDefs.map((p) => [p.key, p.default])),
  };

  const newNode: Node<ProcessNodeData> = {
    id,
    type: 'filter',
    position: { x: 0, y: 0 },
    data: {
      algorithmNm: 'custom' as FilterType,
      label: cf.nm,
      enabled: true,
      parameters: defaultParams,
      imageUrl: null,
      executionMs: null,
    },
  };

  const parentId = selectedNodeId.value ?? findLastLeaf();
  const newEdge: Edge = {
    id: `e-${parentId}-${id}`,
    source: parentId,
    target: id,
    animated: true,
  };

  addNodes([newNode]);
  addEdges([newEdge]);
  toggleParamPanel(id);

  void nextTick(() => {
    relayout();
    if (oOrigin.value.fileId) {
      void processNodeThumbnail(id);
    }
  });
}

/** 현재 그래프에서 outgoing edge가 없는 첫 번째 노드(리프) ID를 반환 */
function findLastLeaf(): string {
  const sources = new Set(edges.value.map((e) => e.source));
  const allNodeIds = nodes.value.map((n) => n.id);
  // source가 아닌 노드 = 리프
  const leaves = allNodeIds.filter((id) => !sources.has(id));
  // 리프가 없으면 source 노드에 연결
  return leaves.length > 0 ? leaves[leaves.length - 1]! : SOURCE_NODE_ID;
}

// ── 썸네일 연산 ────────────────────────────────────────────────────────────

/** 특정 노드까지의 경로(source→…→nodeId)에 대해 batch-tree API를 호출하여 썸네일을 갱신 */
async function processNodeThumbnail(targetNodeId: string, options?: { signal?: AbortSignal }) {
  if (!oOrigin.value.fileId) return;

  // source → targetNodeId 경로에 있는 노드 수집
  const pathNodeIds = collectPathToNode(targetNodeId);
  const steps: TreeBatchStep[] = [];
  const enabledIds = new Set<string>(); // 실제 연산에 포함된 노드 ID

  for (const nodeId of pathNodeIds) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node || node.type !== 'filter') continue;
    const data = node.data;

    if (!data.enabled) {
      continue;
    }

    // parentId: 경로상 직전 enabled 노드, 없으면 null(= source)
    let parentId: string | null = null;
    const parentEdge = edges.value.find((e) => e.target === nodeId);
    let cursor = parentEdge?.source ?? null;
    while (cursor && cursor !== SOURCE_NODE_ID) {
      if (enabledIds.has(cursor)) {
        parentId = cursor;
        break;
      }
      const pe = edges.value.find((e) => e.target === cursor);
      cursor = pe?.source ?? null;
    }

    enabledIds.add(nodeId);
    steps.push({
      nodeId,
      filterType: data.algorithmNm,
      parameters: { ...data.parameters },
      parentId,
    });
  }
  if (steps.length === 0) return;

  const thumbSize = settingsStore.isFullResolution
    ? undefined
    : settingsStore.nodeSize.thumbResolution;
  const activeCropIdVal = cropMgr.activeCropId.value ?? undefined;

  // 중간 노드 숨기기 시 리프 노드만 이미지 반환 요청 (연산은 전체, 인코딩만 절약)
  const leafIds = collectDescendantLeaves(SOURCE_NODE_ID);
  const returnNodeIds = settingsStore.hideIntermediateNodes ? leafIds : undefined;

  const result = await filesApi.batchTreeProcessing(oOrigin.value.fileId, steps, {
    thumbnailSize: thumbSize,
    cropId: activeCropIdVal,
    returnNodeIds,
    signal: options?.signal,
  });

  // 결과를 각 노드에 매핑 (백엔드에서 이미지 미반환 노드는 빈 문자열)
  for (const nr of result.results) {
    const node = nodes.value.find((n) => n.id === nr.nodeId);
    if (node && node.type === 'filter') {
      if (nr.imageUrl) {
        node.data.imageUrl = nr.imageUrl.startsWith('data:') ? nr.imageUrl : API_HOST + nr.imageUrl;
        node.data.executionMs = nr.executionMs;
      } else {
        node.data.imageUrl = null;
        node.data.executionMs = null;
      }
    }
  }
}

/** source 노드에서 targetNodeId까지의 경로에 있는 filter 노드 ID를 순서대로 반환 */
function collectPathToNode(targetNodeId: string): string[] {
  const path: string[] = [];
  let current: string | null = targetNodeId;
  while (current && current !== SOURCE_NODE_ID) {
    path.unshift(current);
    const parentEdge = edges.value.find((e) => e.target === current);
    current = parentEdge?.source ?? null;
  }
  return path;
}

// ── 노드 삭제 ──────────────────────────────────────────────────────────────
function removeFilterNode(nodeId: string) {
  if (nodeId === SOURCE_NODE_ID) return;
  if (optionPanelTarget.value === nodeId) {
    showOptionPanel.value = false;
    optionPanelTarget.value = null;
  }

  // 부모 엣지 찾기
  const parentEdge = edges.value.find((e) => e.target === nodeId);
  const parentId = parentEdge?.source ?? SOURCE_NODE_ID;

  // 자식 엣지들 → 부모에 연결
  const childEdges = edges.value.filter((e) => e.source === nodeId);
  const newEdges: Edge[] = childEdges.map((ce) => ({
    id: `e-${parentId}-${ce.target}`,
    source: parentId,
    target: ce.target,
    animated: true,
  }));

  removeNodes([nodeId]);
  addEdges(newEdges);

  void nextTick(() => relayout());
}

// ── enabled 토글 ───────────────────────────────────────────────────────────
function toggleEnabled(nodeId: string) {
  const node = nodes.value.find((n) => n.id === nodeId);
  if (node && node.type === 'filter') {
    node.data.enabled = !node.data.enabled;
    if (oOrigin.value.fileId) {
      // 해당 노드 + 하위 모든 리프 노드 재연산
      const descendants = collectDescendantLeaves(nodeId);
      for (const leafId of descendants) {
        void processNodeThumbnail(leafId);
      }
    }
  }
}

function onChangeFilter(nodeId: string, filterType: FilterType, label: string, filterId?: string) {
  const node = nodes.value.find((n) => n.id === nodeId);
  if (!node || node.type !== 'filter') return;
  const data = node.data;
  data.algorithmNm = filterType;
  data.label = label;
  data.parameters = getDefaultParams(filterType);
  if (filterId) {
    data.parameters.filterId = filterId;
  }
  data.imageUrl = null;
  data.executionMs = null;

  if (oOrigin.value.fileId) {
    const descendants = collectDescendantLeaves(nodeId);
    for (const leafId of descendants) {
      void processNodeThumbnail(leafId);
    }
  }

  // 파라미터 패널이 열려있으면 새 알고리즘의 파라미터로 갱신
  if (optionPanelTarget.value === nodeId) {
    showOptionPanel.value = true;
  }
}

/** nodeId 자신 포함, 하위의 모든 리프 노드 ID를 반환 */
function collectDescendantLeaves(nodeId: string): string[] {
  const children = edges.value.filter((e) => e.source === nodeId).map((e) => e.target);
  if (children.length === 0) return [nodeId];
  const leaves: string[] = [];
  for (const childId of children) {
    leaves.push(...collectDescendantLeaves(childId));
  }
  return leaves;
}

// ── 엣지 연결 (드래그) ────────────────────────────────────────────────────
function onConnect(connection: Connection) {
  if (!connection.source || !connection.target) return;
  // 순환 참조 방지
  if (hasCycle(connection.source, connection.target)) return;

  const newEdge: Edge = {
    id: `e-${connection.source}-${connection.target}`,
    source: connection.source,
    target: connection.target,
    animated: true,
  };
  addEdges([newEdge]);
}

function hasCycle(source: string, target: string): boolean {
  // target에서 시작해서 source에 도달 가능하면 순환
  const visited = new Set<string>();
  const stack = [source];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges.value) {
      if (edge.target === current) {
        stack.push(edge.source);
      }
    }
  }
  return false;
}

// ── 자동 레이아웃 ──────────────────────────────────────────────────────────
function relayout() {
  const layouted = applyDagreLayout(nodes.value, edges.value);
  for (const ln of layouted) {
    const node = nodes.value.find((n) => n.id === ln.id);
    if (node) {
      node.position = { ...ln.position };
    }
  }
}

// ── 사이드바 드래그 → 캔버스 드롭 ─────────────────────────────────────────
function onSidebarDragStart(event: DragEvent, filterType: FilterType, label: string) {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData('application/vueflow-filtertype', filterType);
  event.dataTransfer.setData('application/vueflow-label', label);
  event.dataTransfer.effectAllowed = 'move';
}

function onCanvasDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onCanvasDrop(event: DragEvent) {
  const filterType = event.dataTransfer?.getData('application/vueflow-filtertype') as
    | FilterType
    | undefined;
  const label = event.dataTransfer?.getData('application/vueflow-label');
  if (!filterType || !label) return;

  if (filterType === 'custom') {
    const filterId = event.dataTransfer?.getData('application/vueflow-filter-id');
    if (filterId) {
      // 커스텀 필터를 FilterListPanel의 목록에서 찾아 노드 추가
      const cf = filterListPanelRef.value
        ? (
            filterListPanelRef.value as unknown as { customFilters: CustomFilter[] }
          ).customFilters?.find((c: CustomFilter) => c.id === filterId)
        : undefined;
      if (cf) addCustomFilterNode(cf);
    }
    return;
  }

  addFilterNode(filterType, label);
}

// ── 전체 노드 초기화 ─────────────────────────────────────────────────────
function resetCanvas() {
  nodes.value = [
    {
      id: SOURCE_NODE_ID,
      type: 'source',
      position: { x: 0, y: 0 },
      data: {
        previewUrl: oOrigin.value.imageUrl,
        thumbnailUrl: oOrigin.value.fileId
          ? `${API_HOST}/api/files/thumbnail/${oOrigin.value.fileId}`
          : null,
      },
    },
  ];
  edges.value = [];
  selectedNodeId.value = null;
  showOptionPanel.value = false;
  optionPanelTarget.value = null;
  activePresetId.value = null;
  activeProcessId.value = null;
}

// ── Preset CRUD ────────────────────────────────────────────────────────────
const cHasFilterNodes = computed(() => nodes.value.some((n) => n.type === 'filter'));

const isEditingPreset = ref(false);

function openSavePresetDialog() {
  isEditingPreset.value = false;
  const active = presets.value.find((p) => p.id === activePresetId.value);
  presetDialogName.value = active ? `${active.nm} copy` : '';
  presetDialogDescription.value = active ? `${active.description}` : '';
  showSavePresetDialog.value = true;
}

function openUpdatePresetDialog() {
  if (!activePresetId.value) return;
  isEditingPreset.value = true;
  const active = presets.value.find((p) => p.id === activePresetId.value);
  presetDialogName.value = active?.nm ?? '';
  presetDialogDescription.value = active?.description ?? '';
  showSavePresetDialog.value = true;
}

async function onConfirmPreset(name: string, description: string) {
  const steps = flowToSteps(nodes.value, edges.value);
  const stepPayload = steps.map((s, i) => ({
    algorithmNm: s.algorithmNm,
    stepOrder: i,
    parameters: s.parameters,
    clientId: s.id,
    parentClientId: s.parentId,
  }));

  if (isEditingPreset.value && activePresetId.value) {
    await presetApi.updatePreset(activePresetId.value, {
      nm: name,
      description: description || null,
      steps: stepPayload,
    });
  } else {
    const created = await presetApi.createPreset({
      nm: name,
      description: description || null,
      steps: stepPayload,
    });
    activePresetId.value = created.id;
  }
  showSavePresetDialog.value = false;
  await loadPresets();
}

function loadPreset(preset: PresetResponse) {
  activePresetId.value = preset.id;
  const flatSteps: FlatStep[] = preset.steps.map((s) => ({
    id: s.id ?? crypto.randomUUID(),
    parentId: s.parentId ?? null,
    algorithmNm: s.algorithmNm,
    stepOrder: s.stepOrder,
    parameters: { ...getDefaultParams(s.algorithmNm), ...(s.parameters ?? {}) },
    isEnabled: true,
  }));
  const flow = stepsToFlow(flatSteps, oOrigin.value.imageUrl);
  nodes.value = flow.nodes;
  edges.value = flow.edges;
  void nextTick(() => {
    relayout();
    processAllLeaves();
  });
}

async function removePreset(presetId: string) {
  await presetApi.deletePreset(presetId);
  if (activePresetId.value === presetId) {
    activePresetId.value = null;
  }
  await loadPresets();
}

// ── 처리목록 → 캔버스 로드 ────────────────────────────────────────────────
async function onProcessDblClick(process: ProcessResponse) {
  activeProcessId.value = process.id;
  const detail = await processApi.getProcess(process.id);

  // 원본 이미지를 서버에서 fetch → File 객체로 변환
  if (detail.filePath) {
    const res = await fetch(`${API_HOST}/${detail.filePath}`);
    const blob = await res.blob();
    const fileName = detail.filePath.split('/').pop() ?? 'image.png';
    const file = new File([blob], fileName, { type: blob.type });

    void setOriginalFile(file);
  }

  const flatSteps: FlatStep[] = detail.steps.map((s) => ({
    id: s.id ?? crypto.randomUUID(),
    parentId: s.parentId ?? null,
    algorithmNm: s.algorithmNm,
    stepOrder: s.stepOrder,
    parameters: { ...getDefaultParams(s.algorithmNm), ...(s.parameters ?? {}) },
    isEnabled: s.isEnabled,
    executionMs: s.executionMs ?? null,
  }));

  const flow = stepsToFlow(flatSteps, oOrigin.value.imageUrl);
  nodes.value = flow.nodes;
  edges.value = flow.edges;
  void nextTick(() => {
    relayout();
    processAllLeaves();
  });
}

/** 모든 리프 노드에 대해 썸네일 연산 실행 */
function processAllLeaves() {
  if (!oOrigin.value.fileId) return;
  const leaves = collectDescendantLeaves(SOURCE_NODE_ID);
  for (const leafId of leaves) {
    void processNodeThumbnail(leafId);
  }
}

// ── 처리 데이터 저장/수정/삭제 ────────────────────────────────────────────
const showSaveProcessDialog = ref(false);
const processDialogName = ref('');
const isEditingProcess = ref(false);

function openSaveProcessDialog() {
  isEditingProcess.value = false;
  const active = processList.value.find((p) => p.id === activeProcessId.value);
  processDialogName.value = active ? `${active.nm} copy` : '';
  showSaveProcessDialog.value = true;
}

function openUpdateProcessDialog() {
  if (!activeProcessId.value) return;
  isEditingProcess.value = true;
  const active = processList.value.find((p) => p.id === activeProcessId.value);
  processDialogName.value = active?.nm ?? '';
  showSaveProcessDialog.value = true;
}

async function onConfirmProcess(name: string) {
  if (!oOrigin.value.fileId) return;

  const steps = flowToSteps(nodes.value, edges.value);
  const stepPayload = steps.map((s, i) => ({
    algorithmNm: s.algorithmNm,
    stepOrder: i,
    parameters: s.parameters,
    isEnabled: s.isEnabled ?? true,
    clientId: s.id,
    parentClientId: s.parentId,
  }));

  if (isEditingProcess.value && activeProcessId.value) {
    await processApi.updateProcess(activeProcessId.value, {
      nm: name,
      steps: stepPayload,
    });
  } else {
    const fileId = oOrigin.value.fileId;
    const created = await processApi.createProcess({
      nm: name,
      fileId,
      steps: stepPayload,
    });
    activeProcessId.value = created.id;
  }
  showSaveProcessDialog.value = false;
  await loadProcessList();
}

async function removeProcess(processId: string) {
  await processApi.deleteProcess(processId);
  if (activeProcessId.value === processId) {
    activeProcessId.value = null;
  }
  await loadProcessList();
}

// ── 이미지 확대 팝업 (모달리스, 복수) ─────────────────────────────────────────
interface ZoomPopup {
  id: string;
  nodeId: string;
  src: string;
  dziUrl?: string;
  title: string;
  loading?: boolean;
  nodeSteps: TreeBatchStep[];
}
const zoomPopups = ref<ZoomPopup[]>([]);
const cZoomedNodeIds = computed(() => new Set(zoomPopups.value.map((p) => p.nodeId)));

function closeZoomPopup(popupId: string) {
  zoomPopups.value = zoomPopups.value.filter((p) => p.id !== popupId);
}

/** 확대 팝업에서 임시 필터를 캔버스 노드에 반영 */
function onApplyPreviewToCanvas(parentNodeId: string, steps: PreviewTempStep[]) {
  for (const step of steps) {
    const id = crypto.randomUUID();
    const newNode: Node<ProcessNodeData> = {
      id,
      type: 'filter',
      position: { x: 0, y: 0 },
      data: {
        algorithmNm: step.filterType,
        label: step.filterType,
        enabled: true,
        parameters: { ...(step.parameters ?? {}) },
        imageUrl: null,
        executionMs: null,
      },
    };
    const newEdge: Edge = {
      id: `e-${parentNodeId}-${id}`,
      source: parentNodeId,
      target: id,
      animated: true,
    };
    addNodes([newNode]);
    addEdges([newEdge]);
    parentNodeId = id; // 다음 step은 이 노드의 하위에
  }
  void nextTick(() => {
    relayout();
    processAllLeaves();
  });
}

/**
 * 확대 이미지 표시
 * 확대 이미지 표시시에는 원본 해상도로 표시
 *
 * @param nodeId
 */
/** 타겟 노드까지의 steps를 구축한다 (zoom, download 공용). */
function buildStepsToNode(nodeId: string): TreeBatchStep[] {
  const pathNodeIds = collectPathToNode(nodeId);
  const steps: TreeBatchStep[] = [];
  const enabledIds = new Set<string>();

  for (const nid of pathNodeIds) {
    const node = nodes.value.find((n) => n.id === nid);
    if (!node || node.type !== 'filter') continue;
    if (!node.data.enabled) continue;

    let parentId: string | null = null;
    const parentEdge = edges.value.find((e) => e.target === nid);
    let cursor = parentEdge?.source ?? null;
    while (cursor && cursor !== SOURCE_NODE_ID) {
      if (enabledIds.has(cursor)) {
        parentId = cursor;
        break;
      }
      const pe = edges.value.find((e) => e.target === cursor);
      cursor = pe?.source ?? null;
    }

    enabledIds.add(nid);
    steps.push({
      nodeId: nid,
      filterType: node.data.algorithmNm,
      parameters: { ...node.data.parameters },
      parentId,
    });
  }
  return steps;
}

async function onNodeZoom(nodeId: string) {
  if (zoomPopups.value.some((p) => p.nodeId === nodeId)) return;

  if (!oOrigin.value.fileId) return;

  const isSource = nodeId === SOURCE_NODE_ID;
  const steps = isSource ? [] : buildStepsToNode(nodeId);
  if (!isSource && steps.length === 0) return;

  $q.loading.show({ message: '처리 중...' });
  const result = await filesApi
    .getOriginSizeUrl(oOrigin.value.fileId, steps, nodeId)
    .finally(() => $q.loading.hide())
    .catch(() => null);
  if (!result) return;

  const node = nodes.value.find((n) => n.id === nodeId);
  const filterData = node?.type === 'filter' ? node.data : null;
  const oUrl = (() => {
    const obj: { src: string; dziUrl?: string } = { src: '', dziUrl: undefined };
    if (result.imageUrl) obj.src = API_HOST + result.imageUrl;
    else if (result.dziUrl) obj.dziUrl = API_HOST + result.dziUrl;
    return obj;
  })();

  zoomPopups.value.push({
    id: crypto.randomUUID(),
    nodeId,
    title: isSource ? '원본 이미지' : (filterData?.label ?? '처리 결과'),
    nodeSteps: steps,
    ...oUrl,
  });
}

async function onNodeDownload(nodeId: string) {
  if (!oOrigin.value.fileId) return;

  const steps = buildStepsToNode(nodeId);
  if (steps.length === 0) return;

  const blob = await filesApi.downloadNodeImage(oOrigin.value.fileId, steps, nodeId);
  const filterTypes = steps.map((s) => s.filterType);
  const chainSuffix = buildChainFilename(filterTypes);
  const baseName = 'image';

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}_${chainSuffix}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

async function onCopyChain(nodeId: string) {
  const steps = buildStepsToNode(nodeId);
  if (steps.length === 0) return;

  const lines = steps.map((s, i) => {
    const fields = PARAM_FIELDS[s.filterType];
    const paramStr = fields
      ?.map((f) => {
        const v = s.parameters?.[f.key] ?? f.default;
        return `${f.label}=${JSON.stringify(v)}`;
      })
      .join(', ');
    return `${i + 1}. ${s.filterType}${paramStr ? ` (${paramStr})` : ''}`;
  });

  await navigator.clipboard.writeText(lines.join('\n'));
}
</script>

<template>
  <q-page class="overflow-hidden">
    <!-- absolute-full을 통해 page 전체 확장 -->
    <q-splitter v-model="splitterSize" :limits="[15, 40]" class="absolute-full">
      <template #before>
        <!-- ================================================================== -->
        <!-- 1. 사이드바: 탭 (필터함수 / Preset / 처리목록)                      -->
        <!-- ================================================================== -->
        <div class="column fit">
          <q-tabs
            v-model="sidebarTab"
            dense
            align="justify"
            active-color="primary"
            indicator-color="primary"
            narrow-indicator
            class="text-grey-7"
            style="flex-shrink: 0"
          >
            <q-tab name="filters" icon="filter_alt" label="필터" />
            <q-tab name="presets" icon="bookmarks" label="Preset" />
            <q-tab name="processes" icon="list_alt" label="처리목록" />
            <q-tab name="crops" icon="crop" label="Crop" />
          </q-tabs>
          <q-separator />

          <q-tab-panels v-model="sidebarTab" animated class="col" style="min-height: 0">
            <!-- 가. 필터함수 탭 -->
            <q-tab-panel name="filters" class="q-pa-none" style="height: 100%">
              <FilterListPanel
                ref="filterListPanelRef"
                @add-filter="addFilterNode"
                @add-custom-filter="addCustomFilterNode"
                @drag-start="onSidebarDragStart"
                @open-editor="openCustomFilterEditor"
              />
            </q-tab-panel>

            <!-- 나. Preset 탭 -->
            <q-tab-panel name="presets" class="q-pa-none" style="height: 100%">
              <PresetListPanel
                :presets="presets"
                :active-preset-id="activePresetId"
                @load="loadPreset"
                @remove="removePreset"
              />
            </q-tab-panel>

            <!-- 다. 처리목록 탭 -->
            <q-tab-panel name="processes" class="q-pa-none" style="height: 100%">
              <ProcessListPanel
                :process-list="processList"
                :active-process-id="activeProcessId"
                @load="onProcessDblClick"
                @remove="removeProcess"
              />
            </q-tab-panel>

            <!-- 라. Crop 탭 -->
            <q-tab-panel name="crops" class="q-pa-none" style="height: 100%">
              <CropListPanel
                :crop-list="cropMgr.cropList.value"
                :active-crop-id="cropMgr.activeCropId.value"
                :original-thumbnail-url="cOriginalThumbnailUrl"
                @create-crop="onCanvasCropCreate"
                @select-crop="onSelectCrop"
                @remove-crop="onRemoveCrop"
                @clear-crop="onClearCrop"
              />
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </template>

      <template #after>
        <!-- ================================================================== -->
        <!-- 2. Node Flow 메인 섹션                                              -->
        <!-- ================================================================== -->
        <div class="column fit overflow-hidden">
          <!-- 상단 툴바 -->
          <div
            class="row items-center no-wrap q-px-sm q-py-xs q-gutter-x-sm"
            style="flex-shrink: 0; border-bottom: 1px solid rgba(0, 0, 0, 0.12)"
          >
            <q-btn
              flat
              dense
              size="sm"
              icon="image"
              :label="oOrigin.fileId ? '원본 이미지 선택됨' : '원본 이미지 선택'"
              @click="openOriginalPicker"
            />
            <q-btn
              v-if="oOrigin.fileId"
              flat
              dense
              round
              size="xs"
              icon="close"
              color="grey-6"
              @click="setOriginalFile(null)"
            >
              <q-tooltip>원본 초기화</q-tooltip>
            </q-btn>

            <q-separator vertical inset class="q-mx-xs" />

            <!-- 캔버스 옵션 -->
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="hd"
              :color="settingsStore.isFullResolution ? 'primary' : 'grey-6'"
              @click="toggleFullResolution"
            >
              <q-tooltip>풀해상도 {{ settingsStore.isFullResolution ? 'ON' : 'OFF' }}</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="visibility_off"
              :color="settingsStore.hideIntermediateNodes ? 'primary' : 'grey-6'"
              @click="toggleHideIntermediateNodes"
            >
              <q-tooltip
                >중간 노드 숨기기
                {{ settingsStore.hideIntermediateNodes ? 'ON' : 'OFF' }}</q-tooltip
              >
            </q-btn>

            <q-space />

            <q-btn
              flat
              dense
              size="sm"
              icon="delete_sweep"
              label="초기화"
              color="negative"
              :disabled="!cHasFilterNodes"
              @click="resetCanvas"
            >
              <q-tooltip>전체 노드 초기화</q-tooltip>
            </q-btn>
            <q-btn flat dense size="sm" icon="account_tree" label="정렬" @click="relayout()">
              <q-tooltip>자동 레이아웃</q-tooltip>
            </q-btn>
            <q-btn
              v-if="activeProcessId"
              flat
              dense
              size="sm"
              icon="edit_note"
              label="처리 수정"
              color="primary"
              :disabled="!cHasFilterNodes || !oOrigin.fileId"
              @click="openUpdateProcessDialog"
            >
              <q-tooltip>처리 데이터 수정</q-tooltip>
            </q-btn>
            <q-btn
              flat
              dense
              size="sm"
              icon="save_alt"
              label="처리 저장"
              color="primary"
              :disabled="!cHasFilterNodes || !oOrigin.fileId"
              @click="openSaveProcessDialog"
            >
              <q-tooltip>처리 데이터 저장</q-tooltip>
            </q-btn>
            <q-btn
              v-if="activePresetId"
              flat
              dense
              size="sm"
              icon="edit"
              label="Preset 수정"
              color="secondary"
              :disabled="!cHasFilterNodes"
              @click="openUpdatePresetDialog"
            />
            <q-btn
              flat
              dense
              size="sm"
              icon="save"
              label="Preset 저장"
              color="secondary"
              :disabled="!cHasFilterNodes"
              @click="openSavePresetDialog"
            />
          </div>

          <input
            ref="originalInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onOriginalInputChange"
          />

          <!-- vue-flow 캔버스 + 파라미터 패널 -->
          <div class="col row min-h-0 overflow-hidden">
            <!-- 캔버스 -->
            <div class="col" @dragover="onCanvasDragOver" @drop="onCanvasDrop">
              <VueFlow
                v-model:nodes="nodes"
                v-model:edges="edges"
                :default-viewport="{ zoom: 1, x: 0, y: 0 }"
                :min-zoom="0.2"
                :max-zoom="3"
                class="flow-canvas"
                @connect="onConnect"
                @node-click="onNodeClick"
                @pane-click="onPaneClick"
              >
                <!-- 커스텀 노드 이벤트 핸들링 -->
                <template #node-filter="nodeProps">
                  <FilterNode
                    v-bind="nodeProps"
                    :selected="selectedNodeId === nodeProps.id"
                    :zoomed="cZoomedNodeIds.has(nodeProps.id)"
                    @remove="removeFilterNode"
                    @toggle-enabled="toggleEnabled"
                    @change-filter="onChangeFilter"
                    @zoom="onNodeZoom"
                    @download="onNodeDownload"
                    @copy-chain="onCopyChain"
                  />
                </template>
                <template #node-source="nodeProps">
                  <SourceNode
                    v-bind="nodeProps"
                    :zoomed="cZoomedNodeIds.has(nodeProps.id)"
                    @pick-existing="showImageGallery = true"
                    @drop-file="onDropFile"
                    @clear-image="setOriginalFile(null)"
                    @zoom="onNodeZoom"
                    @crop="onSourceCrop"
                  />
                </template>

                <Background />
              </VueFlow>
            </div>

            <!-- 파라미터 패널 (우측 슬라이드) -->
            <transition name="slide-option">
              <ParamPanel
                v-show="showOptionPanel"
                :node-data="cSelNodeData ?? undefined"
                :custom-filters="(filterListPanelRef as any)?.customFilters"
                @close="showOptionPanel = false"
                @apply="onParamApply"
                @change="onParamChange"
                @change-filter="
                  (filterType, label, filterId) =>
                    optionPanelTarget &&
                    onChangeFilter(optionPanelTarget, filterType, label, filterId)
                "
              />
            </transition>
          </div>
        </div>
      </template>
    </q-splitter>

    <!-- ================================================================== -->
    <!-- 다이얼로그                                                          -->
    <!-- ================================================================== -->

    <PresetSaveDialog
      v-model="showSavePresetDialog"
      :is-editing="isEditingPreset"
      :initial-name="presetDialogName"
      :initial-description="presetDialogDescription"
      @confirm="onConfirmPreset"
    />

    <ProcessSaveDialog
      v-model="showSaveProcessDialog"
      :is-editing="isEditingProcess"
      :initial-name="processDialogName"
      @confirm="onConfirmProcess"
    />

    <CustomFilterEditorDialog
      v-model="showCustomFilterEditor"
      :custom-filter="editingCustomFilter"
      @saved="onCustomFilterSaved"
    />

    <ImageGalleryDialog
      v-model="showImageGallery"
      :initial-file="droppedFile"
      @select="onSelectExistingImage"
      @update:model-value="!$event && (droppedFile = null)"
    />

    <!-- Crop 다이얼로그 -->
    <CropDialog
      v-if="oOrigin.fileId"
      v-model="showCropDialog"
      :src="cropDialogSrc"
      :dzi-url="cropDialogDziUrl"
      :crop-list="cropMgr.cropList.value"
      @save-viewport="onCropViewport"
      @region-select="onCropViewport"
    />

    <!-- 이미지 확대 팝업 (복수 모달리스) -->
    <ImageZoomPopup
      v-for="popup in zoomPopups"
      :key="popup.id"
      :src="popup.src"
      :dzi-url="popup.dziUrl"
      :title="popup.title"
      :file-id="oOrigin.fileId"
      :node-steps="popup.nodeSteps"
      :node-id="popup.nodeId"
      @close="closeZoomPopup(popup.id)"
      @apply-to-canvas="onApplyPreviewToCanvas(popup.nodeId, $event)"
    />
  </q-page>
</template>

<style scoped>
.min-h-0 {
  min-height: 0;
}

.flow-canvas {
  width: 100%;
  height: 100%;
}

.slide-option-enter-active,
.slide-option-leave-active {
  transition:
    width 0.2s ease,
    min-width 0.2s ease,
    opacity 0.2s ease;
  overflow: hidden;
}

.slide-option-enter-from,
.slide-option-leave-to {
  width: 0 !important;
  min-width: 0 !important;
  opacity: 0;
}
</style>
