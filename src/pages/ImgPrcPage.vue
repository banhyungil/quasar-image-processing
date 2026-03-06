<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core';
import type { Node, Edge, Connection } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

import { FN_LIST, FN_OPTIONS_MAP, PARAM_FIELDS } from 'src/constants/imgPrc';
import type { FunctionKey, ParamFieldDef } from 'src/constants/imgPrc';
import type { PrcType } from 'src/types/imgPrcType';
import {
  getPresets,
  createPreset,
  updatePreset as updatePresetApi,
  deletePreset as deletePresetApi,
} from 'src/apis/presetApi';
import type { PresetResponse } from 'src/apis/presetApi';
import { getProcesses, getProcess } from 'src/apis/processApi';
import type { ProcessResponse } from 'src/apis/processApi';
import { batchTreeProcessing } from 'src/apis/imgPrcApi';
import type { TreeBatchStep } from 'src/types/imgPrcType';

import FilterNode from 'src/components/flow/FilterNode.vue';
import SourceNode from 'src/components/flow/SourceNode.vue';
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

// ── 사이드바 탭 ────────────────────────────────────────────────────────────
const sidebarTab = ref<'filters' | 'presets' | 'processes'>('filters');

// ── 파라미터 패널 ──────────────────────────────────────────────────────────
const showOptionPanel = ref(false);
const optionPanelTarget = ref<string | null>(null);

// ── Preset ─────────────────────────────────────────────────────────────────
const presets = ref<PresetResponse[]>([]);
const showSavePresetDialog = ref(false);
const presetName = ref('');
const presetDescription = ref('');
const editingPresetId = ref<string | null>(null);
const showEditPresetDialog = ref(false);
const editPresetName = ref('');
const editPresetDescription = ref('');

// ── 처리목록 ───────────────────────────────────────────────────────────────
const processList = ref<ProcessResponse[]>([]);

// ── 원본 이미지 ────────────────────────────────────────────────────────────
const originalFile = ref<File | null>(null);
const originalPreviewUrl = ref<string | null>(null);
const originalInputRef = ref<HTMLInputElement | null>(null);

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
  const res = await getPresets();
  presets.value = res.items;
}

async function loadProcessList() {
  const res = await getProcesses();
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

const selectedNode = computed(() => {
  if (!optionPanelTarget.value) return null;
  const n = nodes.value.find((n) => n.id === optionPanelTarget.value);
  if (!n || n.type !== 'filter') return null;
  return n;
});

const selectedNodeData = computed<ProcessNodeData | null>(() => {
  return selectedNode.value ? (selectedNode.value.data as ProcessNodeData) : null;
});

const selectedNodeFields = computed<ParamFieldDef[]>(() => {
  if (!selectedNodeData.value) return [];
  return PARAM_FIELDS[selectedNodeData.value.algorithmNm] ?? [];
});

function updateParam(key: string, value: unknown) {
  if (!selectedNodeData.value) return;
  selectedNodeData.value.parameters[key] = value;
}

function resetParams() {
  if (!selectedNodeData.value) return;
  const defaults = getDefaultParams(selectedNodeData.value.algorithmNm);
  Object.assign(selectedNodeData.value.parameters, defaults);
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

  // 마지막 리프 노드를 찾아 자동 연결
  const leafId = findLastLeaf();
  const newEdge: Edge = {
    id: `e-${leafId}-${id}`,
    source: leafId,
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
  for (const nodeId of pathNodeIds) {
    const node = nodes.value.find((n) => n.id === nodeId);
    if (!node || node.type !== 'filter') continue;
    const data = node.data as ProcessNodeData;
    const parentEdge = edges.value.find((e) => e.target === nodeId);
    const parentId = parentEdge?.source === SOURCE_NODE_ID ? null : (parentEdge?.source ?? null);
    steps.push({
      nodeId,
      prcType: data.algorithmNm,
      parameters: { ...data.parameters },
      parentId,
    });
  }
  if (steps.length === 0) return;

  try {
    const result = await batchTreeProcessing(originalFile.value, steps);
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
  }
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

// ── Preset CRUD ────────────────────────────────────────────────────────────
const hasFilterNodes = computed(() => nodes.value.some((n) => n.type === 'filter'));

async function savePreset() {
  if (!presetName.value.trim()) return;
  const steps = flowToSteps(getNodes.value, getEdges.value);
  await createPreset({
    nm: presetName.value.trim(),
    description: presetDescription.value.trim() || null,
    steps: steps.map((s, i) => ({
      algorithmNm: s.algorithmNm,
      stepOrder: i,
      parameters: s.parameters,
      parentId: s.parentId,
    })),
  });
  presetName.value = '';
  presetDescription.value = '';
  showSavePresetDialog.value = false;
  await loadPresets();
}

function loadPreset(preset: PresetResponse) {
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
  void nextTick(() => relayout());
}

function openEditPreset(preset: PresetResponse) {
  editingPresetId.value = preset.id;
  editPresetName.value = preset.nm;
  editPresetDescription.value = preset.description ?? '';
  showEditPresetDialog.value = true;
}

async function confirmEditPreset() {
  if (!editingPresetId.value || !editPresetName.value.trim()) return;
  await updatePresetApi(editingPresetId.value, {
    nm: editPresetName.value.trim(),
    description: editPresetDescription.value.trim() || null,
  });
  showEditPresetDialog.value = false;
  editingPresetId.value = null;
  await loadPresets();
}

async function removePreset(presetId: string) {
  await deletePresetApi(presetId);
  await loadPresets();
}

// ── 처리목록 → 캔버스 로드 ────────────────────────────────────────────────
async function onProcessDblClick(process: ProcessResponse) {
  const detail = await getProcess(process.id);
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
  void nextTick(() => relayout());
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
                class="row items-center no-wrap q-pa-xs q-mb-xs rounded-borders bg-grey-1 preset-item"
              >
                <div class="col text-body2 ellipsis cursor-pointer" @click="loadPreset(preset)">
                  {{ preset.nm }}
                </div>
                <q-btn
                  flat
                  round
                  dense
                  size="xs"
                  icon="edit"
                  color="grey-7"
                  @click.stop="openEditPreset(preset)"
                >
                  <q-tooltip>수정</q-tooltip>
                </q-btn>
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
              <q-list separator>
                <q-item
                  v-for="proc in processList"
                  :key="proc.id"
                  clickable
                  @dblclick="onProcessDblClick(proc)"
                >
                  <q-item-section avatar>
                    <q-icon name="image" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ proc.nm }}</q-item-label>
                    <q-item-label caption>
                      {{ proc.steps.length }}단계
                      <template v-if="proc.totalExecutionMs != null">
                        · {{ proc.totalExecutionMs }}ms
                      </template>
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-badge
                      :color="proc.isLatest ? 'positive' : 'grey-5'"
                      :label="proc.isLatest ? '최신' : '이전'"
                    />
                  </q-item-section>
                </q-item>
              </q-list>
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

        <q-btn flat dense size="sm" icon="account_tree" label="정렬" @click="relayout()">
          <q-tooltip>자동 레이아웃</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          size="sm"
          icon="save"
          label="Preset 저장"
          color="secondary"
          :disabled="!hasFilterNodes"
          @click="showSavePresetDialog = true"
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
          >
            <!-- 커스텀 노드 이벤트 핸들링 -->
            <template #node-filter="nodeProps">
              <FilterNode
                v-bind="nodeProps"
                @open-params="openParamPanel"
                @remove="removeFilterNode"
                @toggle-enabled="toggleEnabled"
              />
            </template>
            <template #node-source="nodeProps">
              <SourceNode v-bind="nodeProps" @pick-image="openOriginalPicker" />
            </template>

            <Background />
          </VueFlow>
        </div>

        <!-- 파라미터 패널 (우측 슬라이드) -->
        <transition name="slide-option">
          <div
            v-if="showOptionPanel && selectedNodeData"
            class="column option-panel"
            style="width: 240px; min-width: 240px; border-left: 1px solid rgba(0, 0, 0, 0.12)"
          >
            <div
              class="row items-center no-wrap q-px-sm q-py-xs"
              style="border-bottom: 1px solid rgba(0, 0, 0, 0.12); flex-shrink: 0"
            >
              <div class="col text-body2 text-weight-medium q-ml-xs">파라미터</div>
              <q-btn flat round dense size="xs" icon="close" @click="showOptionPanel = false" />
            </div>
            <q-scroll-area class="col">
              <div class="q-pa-sm column q-gutter-sm">
                <div class="text-caption text-grey-7 q-mb-xs">{{ selectedNodeData.label }}</div>

                <template v-if="selectedNodeFields.length === 0">
                  <div class="text-caption text-grey-5 text-center q-pt-md">파라미터 없음</div>
                </template>

                <template v-for="field in selectedNodeFields" :key="field.key">
                  <q-input
                    v-if="field.type === 'number'"
                    :model-value="selectedNodeData.parameters[field.key] as number"
                    @update:model-value="updateParam(field.key, Number($event))"
                    :label="field.label"
                    type="number"
                    :min="field.min"
                    :max="field.max"
                    :step="field.step"
                    outlined
                    dense
                  />
                  <q-select
                    v-else-if="field.type === 'select'"
                    :model-value="selectedNodeData.parameters[field.key]"
                    @update:model-value="updateParam(field.key, $event)"
                    :label="field.label"
                    :options="field.options"
                    emit-value
                    map-options
                    outlined
                    dense
                  />
                </template>

                <q-btn
                  flat
                  dense
                  size="sm"
                  label="기본값 초기화"
                  icon="restart_alt"
                  color="grey-7"
                  class="q-mt-sm"
                  @click="resetParams"
                />
              </div>
            </q-scroll-area>
          </div>
        </transition>
      </div>
    </div>

    <!-- ================================================================== -->
    <!-- 다이얼로그                                                          -->
    <!-- ================================================================== -->

    <!-- Preset 저장 다이얼로그 -->
    <q-dialog v-model="showSavePresetDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">Preset 저장</div>
        </q-card-section>
        <q-card-section class="q-pt-none column q-gutter-sm">
          <q-input
            v-model="presetName"
            label="Preset 이름"
            outlined
            dense
            autofocus
            @keyup.enter="savePreset"
          />
          <q-input v-model="presetDescription" label="설명 (선택)" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" v-close-popup />
          <q-btn
            unelevated
            label="저장"
            color="primary"
            :disabled="!presetName.trim()"
            @click="savePreset"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Preset 수정 다이얼로그 -->
    <q-dialog v-model="showEditPresetDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">Preset 수정</div>
        </q-card-section>
        <q-card-section class="q-pt-none column q-gutter-sm">
          <q-input
            v-model="editPresetName"
            label="Preset 이름"
            outlined
            dense
            autofocus
            @keyup.enter="confirmEditPreset"
          />
          <q-input v-model="editPresetDescription" label="설명 (선택)" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" v-close-popup />
          <q-btn
            unelevated
            label="수정"
            color="primary"
            :disabled="!editPresetName.trim()"
            @click="confirmEditPreset"
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

.preset-item {
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
