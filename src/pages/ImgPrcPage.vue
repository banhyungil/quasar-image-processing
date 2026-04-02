<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

import * as filesApi from 'src/apis/filesApi';
import type { TreeBatchStep } from 'src/types/imgPrcType';
import type { ProcessNodeData, SourceNodeData } from 'src/types/flowTypes';
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
import { useSettingsStore } from 'src/stores/settings-store';
import { useCropManager } from 'src/composables/useCropManager';
import { useFilterGraph, SOURCE_NODE_ID } from 'src/composables/useFilterGraph';
import { useOriginImage } from 'src/composables/useOriginImage';
import { useThumbnailProcessor } from 'src/composables/useThumbnailProcessor';
import { usePresetMgr } from 'src/composables/usePresetMgr';
import { useProcessMgr } from 'src/composables/useProcessMgr';
import { useZoomPopup } from 'src/composables/useZoomPopup';
import { useQuasar } from 'quasar';

import type { Edge } from '@vue-flow/core';
import type { AppNode } from 'src/types/flowTypes';
import type { CustomFilter } from 'src/apis/customFiltersApi';

const settingsStore = useSettingsStore();
const $q = useQuasar();

// ── 파라미터 패널 ──────────────────────────────────────────────────────────
const showOptionPanel = ref(false);
const optionPanelTarget = ref<string | null>(null);

function toggleParamPanel(nodeId: string, isOpen: boolean = true) {
  if (isOpen) {
    optionPanelTarget.value = nodeId;
    showOptionPanel.value = true;
  } else {
    showOptionPanel.value = false;
    optionPanelTarget.value = null;
  }
}

// ── Composables ──────────────────────────────────────────────────────────

// 공유 노드/엣지 ref — 순환 의존 해소
const nodes = ref<AppNode[]>([
  {
    id: SOURCE_NODE_ID,
    type: 'source',
    position: { x: 0, y: 0 },
    data: { previewUrl: null, thumbnailUrl: null },
  },
]);
const edges = ref<Edge[]>([]);

// 지연 콜백: composable 간 순환 참조 해소용
const thumbnailCallbacks = {
  processNodeThumbnail: (_nodeId: string) => {},
  processAllLeaves: () => {},
};

// 1. 원본 이미지
const originImage = useOriginImage(nodes, () => thumbnailCallbacks.processAllLeaves());

// 2. 그래프 (공유 nodes/edges 사용)
const graph = useFilterGraph(
  computed(() => originImage.oOrigin.value.fileId),
  {
    onToggleParamPanel: toggleParamPanel,
    onProcessNodeThumbnail: (id) => thumbnailCallbacks.processNodeThumbnail(id),
    onProcessAllLeaves: () => thumbnailCallbacks.processAllLeaves(),
  },
  nodes,
  edges,
);

// 3. Crop 관리
const canvasFileId = computed(() => originImage.oOrigin.value.fileId);
const canvasNodeSteps = ref<TreeBatchStep[]>([]);
const canvasNodeId = ref('source');
const cropMgr = useCropManager(canvasFileId, canvasNodeSteps, canvasNodeId);

// 4. 썸네일 프로세서
const thumbnailProcessor = useThumbnailProcessor(
  nodes,
  edges,
  computed(() => originImage.oOrigin.value.fileId),
  cropMgr.activeCropId,
  graph.collectPathToNode,
  graph.collectDescendantLeaves,
);

// 지연 콜백 연결
thumbnailCallbacks.processNodeThumbnail = (id) => void thumbnailProcessor.processNodeThumbnail(id);
thumbnailCallbacks.processAllLeaves = () => thumbnailProcessor.processAllLeaves();

// 5. Preset 관리
const presetMgr = usePresetMgr(
  nodes,
  edges,
  computed(() => originImage.oOrigin.value.imageUrl),
  graph.getDefaultParams,
  graph.relayout,
  () => thumbnailProcessor.processAllLeaves(),
);

// 6. Process 관리
const processMgr = useProcessMgr(
  nodes,
  edges,
  computed(() => originImage.oOrigin.value.fileId),
  graph.getDefaultParams,
  (file) => originImage.setOriginalFile(file),
  graph.relayout,
  () => thumbnailProcessor.processAllLeaves(),
);

// 7. 줌 팝업
const { addNodes, addEdges } = useVueFlow();
const zoomPopup = useZoomPopup(
  nodes,
  edges,
  computed(() => originImage.oOrigin.value.fileId),
  cropMgr.activeCrop,
  thumbnailProcessor.buildStepsToNode,
  addNodes,
  addEdges,
  graph.relayout,
  () => thumbnailProcessor.processAllLeaves(),
);

// ── 사이드바 ──────────────────────────────────────────────────────────────
const sidebarTab = ref<'filters' | 'presets' | 'processes' | 'crops'>('filters');
const splitterSize = ref(20);

// ── 커스텀 필터 에디터 ─────────────────────────────────────────────────────
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

// ── Crop 핸들러 ──────────────────────────────────────────────────────────
const cOriginalThumbnailUrl = computed(() =>
  originImage.oOrigin.value.fileId
    ? `${API_HOST}/api/files/thumbnail/${originImage.oOrigin.value.fileId}`
    : null,
);

const showCropDialog = ref(false);
const cropDialogSrc = ref('');
const cropDialogDziUrl = ref<string | undefined>(undefined);

async function onSourceCrop() {
  if (!originImage.oOrigin.value.fileId) return;
  try {
    const res = await filesApi.fetchOriginSizeUrl(originImage.oOrigin.value.fileId, [], 'source');
    cropDialogDziUrl.value = res.dziUrl ? API_HOST + res.dziUrl : undefined;
    cropDialogSrc.value = res.imageUrl
      ? API_HOST + res.imageUrl
      : (originImage.oOrigin.value.imageUrl ?? '');
    showCropDialog.value = true;
  } catch {
    cropDialogSrc.value = originImage.oOrigin.value.imageUrl ?? '';
    showCropDialog.value = true;
  }
}

function onCanvasCropCreate() {
  void onSourceCrop();
}

function updateSourceNodeImage(cropId: string | null) {
  const sourceNode = graph.nodes.value.find((n) => n.id === SOURCE_NODE_ID);
  if (!sourceNode || sourceNode.type !== 'source') return;
  const data = sourceNode.data;

  if (cropId) {
    const crop = cropMgr.cropList.value.find((c) => c.cropId === cropId);
    if (crop) {
      data.previewUrl = crop.nodeImageUrl;
      data.thumbnailUrl = null;
      data.width = crop.viewport.w;
      data.height = crop.viewport.h;
    }
  } else {
    data.previewUrl = originImage.oOrigin.value.imageUrl;
    data.thumbnailUrl = originImage.oOrigin.value.fileId
      ? `${API_HOST}/api/files/thumbnail/${originImage.oOrigin.value.fileId}`
      : null;
    data.width = originImage.oOrigin.value.width;
    data.height = originImage.oOrigin.value.height;
  }
}

function onSelectCrop(cropId: string) {
  cropMgr.activeCropId.value = cropId;
  updateSourceNodeImage(cropId);
  thumbnailProcessor.processAllLeaves();
}

function onRemoveCrop(cropId: string) {
  const wasActive = cropMgr.activeCropId.value === cropId;
  cropMgr.removeCrop(cropId);
  if (!wasActive) return;
  if (cropMgr.cropList.value.length === 0) {
    cropMgr.activeCropId.value = null;
    updateSourceNodeImage(null);
    thumbnailProcessor.processAllLeaves();
  } else {
    const nextCrop = cropMgr.cropList.value[0];
    if (!nextCrop) return;
    cropMgr.activeCropId.value = nextCrop.cropId;
    updateSourceNodeImage(nextCrop.cropId);
    thumbnailProcessor.processAllLeaves();
  }
}

function onClearCrop() {
  cropMgr.activeCropId.value = null;
  updateSourceNodeImage(null);
  thumbnailProcessor.processAllLeaves();
}

async function onCropViewport(viewport: { x: number; y: number; w: number; h: number }) {
  if (!cropMgr.validateViewport(viewport)) return;
  const crop = await cropMgr.createCrop(viewport);
  if (crop) {
    sidebarTab.value = 'crops';
    cropMgr.activeCropId.value = crop.cropId;
  }
}

// ── 설정 토글 ──────────────────────────────────────────────────────────────
function toggleFullResolution() {
  if (!settingsStore.isFullResolution) {
    const sourceNode = graph.nodes.value.find((n) => n.id === SOURCE_NODE_ID);
    if (sourceNode && sourceNode.type === 'source') {
      const data = sourceNode.data;
      if (data.previewUrl && !cropMgr.activeCropId.value) {
        $q.notify({
          type: 'warning',
          message:
            '풀해상도 모드: 대용량 이미지는 처리 시간이 길어질 수 있습니다. Crop을 사용하면 성능이 향상됩니다.',
          timeout: 4000,
        });
      }
    }
  }
  settingsStore.isFullResolution = !settingsStore.isFullResolution;
  thumbnailProcessor.processAllLeaves();
}

function toggleHideIntermediateNodes() {
  settingsStore.hideIntermediateNodes = !settingsStore.hideIntermediateNodes;
  thumbnailProcessor.processAllLeaves();
}

// ── 파라미터 패널 computed ─────────────────────────────────────────────────
const cSelNodeData = computed<ProcessNodeData | null>(() => {
  if (!optionPanelTarget.value) return null;
  const n = nodes.value.find((n) => n.id === optionPanelTarget.value);
  if (!n || n.type !== 'filter') return null;
  return n.data;
});

function onParamApply(updated: ProcessNodeData) {
  thumbnailProcessor.onParamApply(updated, optionPanelTarget.value);
}

function onParamChange(parameters: Record<string, unknown>) {
  void thumbnailProcessor.onParamChange(parameters, optionPanelTarget.value);
}

// ── 캔버스 초기화 래퍼 ────────────────────────────────────────────────────
function resetCanvas() {
  graph.resetCanvas(originImage.oOrigin.value.imageUrl, originImage.oOrigin.value.fileId, API_HOST);
  showOptionPanel.value = false;
  optionPanelTarget.value = null;
  presetMgr.activePresetId.value = null;
  processMgr.activeProcessId.value = null;
}

// ── 노드 삭제 래퍼 (패널 닫기 포함) ─────────────────────────────────────────
function removeFilterNode(nodeId: string) {
  if (optionPanelTarget.value === nodeId) {
    showOptionPanel.value = false;
    optionPanelTarget.value = null;
  }
  graph.removeFilterNode(nodeId);
}

// ── 필터 변경 래퍼 (패널 갱신 포함) ─────────────────────────────────────────
function onChangeFilter(...args: Parameters<typeof graph.onChangeFilter>) {
  graph.onChangeFilter(...args);
  if (optionPanelTarget.value === args[0]) {
    showOptionPanel.value = true;
  }
}

// ── 캔버스 드롭 래퍼 ─────────────────────────────────────────────────────
function onCanvasDrop(event: DragEvent) {
  graph.onCanvasDrop(event, (filterId) => {
    return filterListPanelRef.value
      ? (
          filterListPanelRef.value as unknown as { customFilters: CustomFilter[] }
        ).customFilters?.find((c: CustomFilter) => c.id === Number(filterId))
      : undefined;
  });
}

// ── 초기 데이터 로드 ──────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([presetMgr.loadPresets(), processMgr.loadProcessList()]);
});

// ── 편의용 alias / destructuring ─────────────────────────────────────────
const {
  selectedNodeId,
  cSelectedNodeIds,
  cHasFilterNodes,
  nodeSizeInput,
  applyNodeSizeAll,
  onNodeResize,
  onNodeClick,
  onPaneClick,
  addFilterNode,
  addCustomFilterNode,
  onConnect,
  relayout,
  onSidebarDragStart,
  onCanvasDragOver,
  toggleEnabled,
} = graph;
const {
  oOrigin,
  originalInputRef,
  showImageGallery,
  droppedFile,
  onOriginalInputChange,
  onSelectExistingImage,
  onDropFile,
} = originImage;

function setOriginalFile(file: File | null) {
  return originImage.setOriginalFile(file, file == null ? () => cropMgr.cleanupAll() : undefined);
}
const {
  presets,
  activePresetId,
  showSavePresetDialog,
  presetDialogName,
  presetDialogDescription,
  isEditingPreset,
  loadPreset,
  removePreset,
  openSavePresetDialog,
  openUpdatePresetDialog,
  onConfirmPreset,
} = presetMgr;
const {
  processList,
  activeProcessId,
  showSaveProcessDialog,
  processDialogName,
  isEditingProcess,
  onProcessDblClick,
  removeProcess,
  openSaveProcessDialog,
  openUpdateProcessDialog,
  onConfirmProcess,
} = processMgr;
const {
  zoomPopups,
  cZoomedNodeIds,
  closeZoomPopup,
  onApplyPreviewToCanvas,
  onNodeZoom,
  onNodeDownload,
  onCopyChain,
} = zoomPopup;
</script>

<template>
  <q-page class="img-prc-page overflow-hidden">
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

            <q-separator vertical inset class="q-mx-xs" />

            <!-- 노드 사이즈 입력 -->
            <span class="text-caption text-grey-7 q-mr-xs">노드 크기</span>
            <q-input
              :model-value="nodeSizeInput"
              dense
              outlined
              type="number"
              style="width: 120px"
              input-style="font-size: 12px; text-align: center"
              suffix="px"
              @update:model-value="nodeSizeInput = Number($event)"
              @keydown.enter="applyNodeSizeAll"
            />
            <q-btn flat dense size="sm" label="적용" color="primary" @click="applyNodeSizeAll">
              <q-tooltip>입력한 크기를 전체 노드에 적용</q-tooltip>
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
                :selection-key-code="'Shift'"
                :multi-selection-key-code="'Shift'"
                class="flow-canvas"
                @connect="onConnect"
                @node-click="onNodeClick"
                @pane-click="onPaneClick"
              >
                <!-- 커스텀 노드 이벤트 핸들링 -->
                <template #node-filter="nodeProps">
                  <FilterNode
                    v-bind="nodeProps"
                    :selected="
                      selectedNodeId === nodeProps.id || cSelectedNodeIds.has(nodeProps.id)
                    "
                    :zoomed="cZoomedNodeIds.has(nodeProps.id)"
                    @remove="removeFilterNode"
                    @toggle-enabled="toggleEnabled"
                    @change-filter="onChangeFilter"
                    @zoom="onNodeZoom"
                    @download="onNodeDownload"
                    @copy-chain="onCopyChain"
                    @resize="onNodeResize"
                  />
                </template>
                <template #node-source="nodeProps">
                  <SourceNode
                    v-bind="nodeProps"
                    :zoomed="cZoomedNodeIds.has(nodeProps.id)"
                    :selected="
                      selectedNodeId === nodeProps.id || cSelectedNodeIds.has(nodeProps.id)
                    "
                    @pick-existing="showImageGallery = true"
                    @drop-file="onDropFile"
                    @clear-image="setOriginalFile(null)"
                    @zoom="onNodeZoom"
                    @crop="onSourceCrop"
                    @resize="onNodeResize"
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
