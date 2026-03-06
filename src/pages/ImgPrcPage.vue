<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core';
import type { Node, Edge, Connection } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

import { FN_LIST, FN_OPTIONS_MAP, PARAM_FIELDS } from 'src/constants/imgPrc';
import type { FunctionKey } from 'src/constants/imgPrc';
import type { PrcType } from 'src/types/imgPrcType';
import * as presetApi from 'src/apis/presetApi';
import type { PresetResponse } from 'src/apis/presetApi';
import * as processApi from 'src/apis/processApi';
import type { ProcessResponse } from 'src/apis/processApi';
import * as imgPrcApi from 'src/apis/imgPrcApi';
import type { TreeBatchStep } from 'src/types/imgPrcType';
import { API_HOST } from 'src/boot/axios';

import FilterNode from 'src/components/flow/FilterNode.vue';
import SourceNode from 'src/components/flow/SourceNode.vue';
import ParamPanel from 'src/components/flow/ParamPanel.vue';
import type { ProcessNodeData, SourceNodeData, FlatStep } from 'src/types/flowTypes';
import { stepsToFlow, flowToSteps } from 'src/utils/flowConverter';
import { applyDagreLayout } from 'src/utils/flowLayout';

const CATEGORY_ICONS: Record<FunctionKey, string> = {
  filtering: 'filter_alt',
  blurring: 'blur_on',
  findContour: 'category',
  brightness: 'brightness_6',
  threshold: 'tonality',
};

const SOURCE_NODE_ID = 'source';

// ── vue-flow ───────────────────────────────────────────────────────────────
const nodes = ref<Node[]>([
  {
    id: SOURCE_NODE_ID,
    type: 'source',
    position: { x: 0, y: 0 },
    data: { previewUrl: null } as SourceNodeData,
  },
]);
const edges = ref<Edge[]>([]);

const { addNodes, addEdges, removeNodes, getNodes, getEdges } = useVueFlow();

// ── 노드 선택 ────────────────────────────────────────────────────────────
const selectedNodeId = ref<string | null>(null);

function onNodeClick({ node }: { node: Node }) {
  selectedNodeId.value = selectedNodeId.value === node.id ? null : node.id;
}

function onPaneClick() {
  selectedNodeId.value = null;
}

// ── 사이드바 탭 ────────────────────────────────────────────────────────────
const sidebarTab = ref<'filters' | 'presets' | 'processes'>('filters');

// ── 파라미터 패널 ──────────────────────────────────────────────────────────
const showOptionPanel = ref(false);
const optionPanelTarget = ref<string | null>(null);

// ── Preset ─────────────────────────────────────────────────────────────────
const presets = ref<PresetResponse[]>([]);
const activePresetId = ref<string | null>(null);
const showSavePresetDialog = ref(false);
const presetName = ref('');
const presetDescription = ref('');

// ── 처리목록 ───────────────────────────────────────────────────────────────
const processList = ref<ProcessResponse[]>([]);
const activeProcessId = ref<string | null>(null);

// ── 원본 이미지 ────────────────────────────────────────────────────────────
const originalFile = ref<File | null>(null);
const originalPreviewUrl = ref<string | null>(null);
const originalInputRef = ref<HTMLInputElement | null>(null);

/** 원본 이미지 설정 */
function setOriginalFile(file: File | null) {
  if (file == null) {
    originalFile.value = null;
    if (originalPreviewUrl.value) {
      URL.revokeObjectURL(originalPreviewUrl.value);
      originalPreviewUrl.value = null;
    }
    if (originalInputRef.value) {
      originalInputRef.value.value = '';
    }
  } else {
    if (!file.type.startsWith('image/')) return;
    originalFile.value = file;
    if (originalPreviewUrl.value) {
      URL.revokeObjectURL(originalPreviewUrl.value);
    }
    originalPreviewUrl.value = URL.createObjectURL(file);
  }
  // 소스 노드 previewUrl 동기화
  const sourceNode = nodes.value.find((n) => n.id === SOURCE_NODE_ID);
  if (sourceNode) {
    (sourceNode.data as SourceNodeData).previewUrl = originalPreviewUrl.value;
  }

  processAllLeaves();
}

function openOriginalPicker() {
  originalInputRef.value?.click();
}

function onOriginalInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  setOriginalFile(input.files?.[0] ?? null);
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
function getDefaultParams(prcType: string): Record<string, unknown> {
  const fields = PARAM_FIELDS[prcType];
  if (!fields) return {};
  return Object.fromEntries(fields.map((f) => [f.key, f.default]));
}

function openParamPanel(nodeId: string) {
  if (optionPanelTarget.value === nodeId && showOptionPanel.value) {
    showOptionPanel.value = false;
    optionPanelTarget.value = null;
  } else {
    optionPanelTarget.value = nodeId;
    showOptionPanel.value = true;
  }
}

const selectedNodeData = computed<ProcessNodeData | null>(() => {
  if (!optionPanelTarget.value) return null;
  const n = nodes.value.find((n) => n.id === optionPanelTarget.value);
  if (!n || n.type !== 'filter') return null;
  return n.data as ProcessNodeData;
});

function onParamApply() {
  if (!originalFile.value || !optionPanelTarget.value) return;
  const descendants = collectDescendantLeaves(optionPanelTarget.value);
  for (const leafId of descendants) {
    void processNodeThumbnail(leafId);
  }
}

// ── 노드 추가 (사이드바 클릭) ──────────────────────────────────────────────
function addFilterNode(prcType: PrcType, label: string) {
  const id = crypto.randomUUID();
  const newNode: Node<ProcessNodeData> = {
    id,
    type: 'filter',
    position: { x: 0, y: 0 },
    data: {
      algorithmNm: prcType,
      label,
      enabled: true,
      parameters: getDefaultParams(prcType),
      thumbnail: null,
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

  void nextTick(() => {
    relayout();
    // 원본 이미지가 있으면 썸네일 연산 (nextTick 이후 edges.value 동기화 완료)
    if (originalFile.value) {
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
async function processNodeThumbnail(targetNodeId: string) {
  if (!originalFile.value) return;

  // source → targetNodeId 경로에 있는 노드 수집
  const pathNodeIds = collectPathToNode(targetNodeId);
  const steps: TreeBatchStep[] = [];
  const enabledIds = new Set<string>(); // 실제 연산에 포함된 노드 ID

  for (const nodeId of pathNodeIds) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node || node.type !== 'filter') continue;
    const data = node.data as ProcessNodeData;

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
      prcType: data.algorithmNm,
      parameters: { ...data.parameters },
      parentId,
    });
  }
  if (steps.length === 0) return;

  try {
    const result = await imgPrcApi.batchTreeProcessing(originalFile.value, steps);
    // 결과를 각 노드에 매핑
    for (const nr of result.results) {
      const node = nodes.value.find((n) => n.id === nr.nodeId);
      if (node && node.type === 'filter') {
        const data = node.data as ProcessNodeData;
        data.thumbnail = nr.thumbnail;
        data.executionMs = nr.executionMs;
      }
    }
  } catch (err) {
    console.error('썸네일 연산 실패:', err);
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
    (node.data as ProcessNodeData).enabled = !(node.data as ProcessNodeData).enabled;
    if (originalFile.value) {
      // 해당 노드 + 하위 모든 리프 노드 재연산
      const descendants = collectDescendantLeaves(nodeId);
      for (const leafId of descendants) {
        void processNodeThumbnail(leafId);
      }
    }
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
  const layouted = applyDagreLayout(getNodes.value, getEdges.value);
  for (const ln of layouted) {
    const node = nodes.value.find((n) => n.id === ln.id);
    if (node) {
      node.position = { ...ln.position };
    }
  }
}

// ── 사이드바 드래그 → 캔버스 드롭 ─────────────────────────────────────────
function onSidebarDragStart(event: DragEvent, prcType: PrcType, label: string) {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData('application/vueflow-prctype', prcType);
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
  const prcType = event.dataTransfer?.getData('application/vueflow-prctype') as PrcType | undefined;
  const label = event.dataTransfer?.getData('application/vueflow-label');
  if (!prcType || !label) return;
  addFilterNode(prcType, label);
}

// ── 전체 노드 초기화 ─────────────────────────────────────────────────────
function resetCanvas() {
  nodes.value = [
    {
      id: SOURCE_NODE_ID,
      type: 'source',
      position: { x: 0, y: 0 },
      data: { previewUrl: originalPreviewUrl.value } as SourceNodeData,
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
const hasFilterNodes = computed(() => nodes.value.some((n) => n.type === 'filter'));

const isEditingPreset = ref(false);

function openSavePresetDialog() {
  isEditingPreset.value = false;
  const active = presets.value.find((p) => p.id === activePresetId.value);
  presetName.value = active ? `${active.nm} copy` : '';
  presetDescription.value = active ? `${active.description}` : '';
  showSavePresetDialog.value = true;
}

function openUpdatePresetDialog() {
  if (!activePresetId.value) return;
  isEditingPreset.value = true;
  const active = presets.value.find((p) => p.id === activePresetId.value);
  presetName.value = active?.nm ?? '';
  presetDescription.value = active?.description ?? '';
  showSavePresetDialog.value = true;
}

async function confirmPresetDialog() {
  if (!presetName.value.trim()) return;
  const steps = flowToSteps(getNodes.value, getEdges.value);
  const stepPayload = steps.map((s, i) => ({
    algorithmNm: s.algorithmNm,
    stepOrder: i,
    parameters: s.parameters,
    clientId: s.id,
    parentClientId: s.parentId,
  }));

  if (isEditingPreset.value && activePresetId.value) {
    await presetApi.updatePreset(activePresetId.value, {
      nm: presetName.value.trim(),
      description: presetDescription.value.trim() || null,
      steps: stepPayload,
    });
  } else {
    const created = await presetApi.createPreset({
      nm: presetName.value.trim(),
      description: presetDescription.value.trim() || null,
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
  const flow = stepsToFlow(flatSteps, originalPreviewUrl.value);
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
    setOriginalFile(file);
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

  const flow = stepsToFlow(flatSteps, originalPreviewUrl.value);
  nodes.value = flow.nodes;
  edges.value = flow.edges;
  void nextTick(() => {
    relayout();
    processAllLeaves();
  });
}

/** 모든 리프 노드에 대해 썸네일 연산 실행 */
function processAllLeaves() {
  if (!originalFile.value) return;
  const leaves = collectDescendantLeaves(SOURCE_NODE_ID);
  for (const leafId of leaves) {
    void processNodeThumbnail(leafId);
  }
}

// ── 처리 데이터 저장/수정/삭제 ────────────────────────────────────────────
const showSaveProcessDialog = ref(false);
const processName = ref('');
const isEditingProcess = ref(false);

function openSaveProcessDialog() {
  isEditingProcess.value = false;
  const active = processList.value.find((p) => p.id === activeProcessId.value);
  processName.value = active ? `${active.nm} copy` : '';
  showSaveProcessDialog.value = true;
}

function openUpdateProcessDialog() {
  if (!activeProcessId.value) return;
  isEditingProcess.value = true;
  const active = processList.value.find((p) => p.id === activeProcessId.value);
  processName.value = active?.nm ?? '';
  showSaveProcessDialog.value = true;
}

async function saveProcessDialog() {
  if (!processName.value.trim() || !originalFile.value) return;

  const steps = flowToSteps(getNodes.value, getEdges.value);
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
      nm: processName.value.trim(),
      steps: stepPayload,
    });
  } else {
    // 원본 이미지 업로드 → fileId 획득
    const uploaded = await imgPrcApi.uploadFile(originalFile.value);
    const created = await processApi.createProcess({
      nm: processName.value.trim(),
      fileId: uploaded.id,
      steps: stepPayload,
    });
    activeProcessId.value = created.id;
  }
  processName.value = '';
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
</script>

<template>
  <q-page class="fit row overflow-hidden">
    <!-- ================================================================== -->
    <!-- 1. 사이드바: 탭 (필터함수 / Preset / 처리목록)                      -->
    <!-- ================================================================== -->
    <div
      class="column"
      style="width: 280px; min-width: 280px; border-right: 1px solid rgba(0, 0, 0, 0.12)"
    >
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
      </q-tabs>
      <q-separator />

      <q-tab-panels v-model="sidebarTab" animated class="col" style="min-height: 0">
        <!-- 가. 필터함수 탭 -->
        <q-tab-panel name="filters" class="q-pa-none" style="height: 100%">
          <q-scroll-area style="height: 100%">
            <q-list>
              <q-expansion-item
                v-for="fn in FN_LIST"
                :key="fn.value"
                :icon="CATEGORY_ICONS[fn.value]"
                :label="fn.label"
                default-opened
                expand-separator
              >
                <div
                  v-for="option in FN_OPTIONS_MAP[fn.value]"
                  :key="option.value"
                  class="q-px-sm q-py-xs"
                  draggable="true"
                  @dragstart="onSidebarDragStart($event, option.value, option.label)"
                >
                  <q-card flat bordered class="filter-card">
                    <q-card-section class="q-pa-xs row items-center no-wrap q-gutter-x-xs">
                      <q-icon
                        :name="CATEGORY_ICONS[fn.value]"
                        size="xs"
                        color="primary"
                        class="q-ml-xs"
                      />
                      <div class="col text-caption ellipsis">{{ option.label }}</div>
                      <q-btn
                        flat
                        round
                        dense
                        size="xs"
                        icon="add"
                        color="positive"
                        @click="addFilterNode(option.value, option.label)"
                      >
                        <q-tooltip>노드에 추가</q-tooltip>
                      </q-btn>
                    </q-card-section>
                  </q-card>
                </div>
              </q-expansion-item>
            </q-list>
          </q-scroll-area>
        </q-tab-panel>

        <!-- 나. Preset 탭 -->
        <q-tab-panel name="presets" class="q-pa-none" style="height: 100%">
          <q-scroll-area style="height: 100%">
            <div class="q-pa-sm">
              <div v-if="presets.length === 0" class="text-center text-caption text-grey-6 q-pa-md">
                저장된 Preset이 없습니다
              </div>
              <div
                v-for="preset in presets"
                :key="preset.id"
                class="row items-center no-wrap q-pa-xs q-mb-xs rounded-borders preset-item"
                :class="activePresetId === preset.id ? 'bg-light-blue-1' : 'bg-grey-1'"
              >
                <div class="col text-body2 ellipsis cursor-pointer" @click="loadPreset(preset)">
                  {{ preset.nm }}
                </div>
                <q-btn
                  flat
                  round
                  dense
                  size="xs"
                  icon="delete"
                  color="negative"
                  @click.stop="removePreset(preset.id)"
                >
                  <q-tooltip>삭제</q-tooltip>
                </q-btn>
              </div>
            </div>
          </q-scroll-area>
        </q-tab-panel>

        <!-- 다. 처리목록 탭 -->
        <q-tab-panel name="processes" class="q-pa-none" style="height: 100%">
          <q-scroll-area style="height: 100%">
            <div class="q-pa-sm">
              <div
                v-if="processList.length === 0"
                class="text-center text-caption text-grey-6 q-pa-md"
              >
                처리된 이미지가 없습니다
              </div>
              <div
                v-for="proc in processList"
                :key="proc.id"
                class="row items-center no-wrap q-pa-xs q-mb-xs rounded-borders process-item"
                :class="activeProcessId === proc.id ? 'bg-light-blue-1' : 'bg-grey-1'"
              >
                <q-avatar square size="40px" class="q-mr-xs" style="flex-shrink: 0">
                  <img
                    v-if="proc.filePath"
                    :src="`${API_HOST}/${proc.filePath}`"
                    style="object-fit: cover"
                  />
                  <q-icon v-else name="image" color="grey-5" />
                </q-avatar>
                <div class="col cursor-pointer" @dblclick="onProcessDblClick(proc)">
                  <div class="text-body2 ellipsis">{{ proc.nm }}</div>
                  <div class="text-caption text-grey-6">
                    {{ proc.steps.length }}단계
                    <template v-if="proc.totalExecutionMs != null">
                      · {{ proc.totalExecutionMs }}ms
                    </template>
                  </div>
                </div>
                <q-badge
                  :color="proc.isLatest ? 'positive' : 'grey-5'"
                  :label="proc.isLatest ? '최신' : '이전'"
                  class="q-mr-xs"
                />
                <q-btn
                  flat
                  round
                  dense
                  size="xs"
                  icon="delete"
                  color="negative"
                  @click.stop="removeProcess(proc.id)"
                >
                  <q-tooltip>삭제</q-tooltip>
                </q-btn>
              </div>
            </div>
          </q-scroll-area>
        </q-tab-panel>
      </q-tab-panels>
    </div>

    <!-- ================================================================== -->
    <!-- 2. Node Flow 메인 섹션                                              -->
    <!-- ================================================================== -->
    <div class="col column min-h-0 overflow-hidden">
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
          :label="originalFile ? originalFile.name : '원본 이미지 선택'"
          @click="openOriginalPicker"
        />
        <q-btn
          v-if="originalFile"
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

        <q-space />

        <q-btn
          flat
          dense
          size="sm"
          icon="delete_sweep"
          label="초기화"
          color="negative"
          :disabled="!hasFilterNodes"
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
          :disabled="!hasFilterNodes || !originalFile"
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
          :disabled="!hasFilterNodes || !originalFile"
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
          :disabled="!hasFilterNodes"
          @click="openUpdatePresetDialog"
        />
        <q-btn
          flat
          dense
          size="sm"
          icon="save"
          label="Preset 저장"
          color="secondary"
          :disabled="!hasFilterNodes"
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
                @open-params="openParamPanel"
                @remove="removeFilterNode"
                @toggle-enabled="toggleEnabled"
              />
            </template>
            <template #node-source="nodeProps">
              <SourceNode
                v-bind="nodeProps"
                @pick-image="openOriginalPicker"
                @clear-image="setOriginalFile(null)"
              />
            </template>

            <Background />
          </VueFlow>
        </div>

        <!-- 파라미터 패널 (우측 슬라이드) -->
        <transition name="slide-option">
          <ParamPanel
            v-if="showOptionPanel && selectedNodeData"
            :node-data="selectedNodeData"
            @close="showOptionPanel = false"
            @apply="onParamApply"
          />
        </transition>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 다이얼로그                                                          -->
    <!-- ================================================================== -->

    <!-- Preset 저장/수정 다이얼로그 -->
    <q-dialog v-model="showSavePresetDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">{{ isEditingPreset ? 'Preset 수정' : 'Preset 저장' }}</div>
        </q-card-section>
        <q-card-section class="q-pt-none column q-gutter-sm">
          <q-input
            v-model="presetName"
            label="Preset 이름"
            outlined
            dense
            autofocus
            @keyup.enter="confirmPresetDialog"
          />
          <q-input v-model="presetDescription" label="설명 (선택)" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" v-close-popup />
          <q-btn
            unelevated
            :label="isEditingPreset ? '수정' : '저장'"
            color="primary"
            :disabled="!presetName.trim()"
            @click="confirmPresetDialog"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- 처리 저장/수정 다이얼로그 -->
    <q-dialog v-model="showSaveProcessDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">
            {{ isEditingProcess ? '처리 데이터 수정' : '처리 데이터 저장' }}
          </div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <q-input
            v-model="processName"
            label="처리 이름"
            outlined
            dense
            autofocus
            @keyup.enter="saveProcessDialog"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" v-close-popup />
          <q-btn
            unelevated
            :label="isEditingProcess ? '수정' : '저장'"
            color="primary"
            :disabled="!processName.trim()"
            @click="saveProcessDialog"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
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

.filter-card {
  cursor: grab;
}

.filter-card:active {
  cursor: grabbing;
}

.preset-item,
.process-item {
  border: 1px solid rgba(0, 0, 0, 0.1);
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
