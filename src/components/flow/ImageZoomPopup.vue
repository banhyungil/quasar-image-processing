<script setup lang="ts">
import { useDebounceFn, useEventListener } from '@vueuse/core';
import { PARAM_FIELDS } from 'src/constants/imgPrc';
import type { ParamFieldDef } from 'src/constants/imgPrc';
import type { FilterType } from 'src/types/imgPrcType';
import type { TreeBatchStep, PreviewTempStep } from 'src/types/imgPrcType';
import OsdViewer from './OsdViewer.vue';
import TimelineViewer from './TimelineViewer.vue';
import ZoomSidePanel from './ZoomSidePanel.vue';
import { useCropManager } from 'src/composables/useCropManager';
import { usePreviewManager, type TempStep } from 'src/composables/usePreviewManager';

const settingsStore = useSettingsStore();

const props = defineProps<{
  src: string | null;
  dziUrl?: string;
  title?: string;
  fileId?: number | null;
  nodeSteps?: TreeBatchStep[];
  nodeId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply-to-canvas', steps: PreviewTempStep[]): void;
}>();

// ── 윈도우 상태 ──────────────────────────────────────────────────────────────
const isMaximized = ref(false);
const zoomLevel = ref(1);
const viewportSize = ref<{ w: number; h: number } | null>(null);
const osdViewerComp = ref<InstanceType<typeof OsdViewer> | null>(null);

// ── 드래그 이동 ──────────────────────────────────────────────────────────────
const pos = ref({ x: 100 + Math.random() * 60, y: 80 + Math.random() * 60 });
const dragging = ref(false);
const dragOffset = { x: 0, y: 0 };

function onHeaderMouseDown(e: MouseEvent) {
  if (isMaximized.value) return;
  dragging.value = true;
  dragOffset.x = e.clientX - pos.value.x;
  dragOffset.y = e.clientY - pos.value.y;
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}
function onMouseMove(e: MouseEvent) {
  pos.value.x = e.clientX - dragOffset.x;
  pos.value.y = e.clientY - dragOffset.y;
}
function onMouseUp() {
  dragging.value = false;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
}

const focused = ref(false);
function bringToFront() {
  focused.value = true;
  setTimeout(() => (focused.value = false), 10);
}

// ── 모드 ─────────────────────────────────────────────────────────────────────
type Mode = 'explore' | 'crop' | 'compare' | 'timeline';
const mode = ref<Mode>('explore');
const showSidePanel = ref(true);

// ── Composables ──────────────────────────────────────────────────────────────
const fileIdRef = computed(() => props.fileId ?? null);
const nodeStepsRef = computed(() => props.nodeSteps ?? []);
const nodeIdRef = computed(() => props.nodeId ?? 'source');

const cropMgr = useCropManager(fileIdRef, nodeStepsRef, nodeIdRef);
const tempSteps = ref<TempStep[]>([]);
const expandedStepId = ref<string | null>(null);
const selectedStepId = ref<string | null>(null);

const previewMgr = usePreviewManager(fileIdRef, cropMgr.activeCrop, tempSteps);

const cViewportStatus = computed(() => cropMgr.computeViewportStatus(viewportSize.value));

// ── ESC 키 ───────────────────────────────────────────────────────────────────
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (osdViewerComp.value && !osdViewerComp.value.isAtHome()) {
      osdViewerComp.value.goHome();
    } else if (mode.value !== 'explore') {
      mode.value = 'explore';
    } else if (isMaximized.value) {
      isMaximized.value = false;
    }
  }
}
useEventListener(window, 'keydown', onKeyDown);

// ── 필터 추가/삭제/변경 ─────────────────────────────────────────────────────
async function onSelectFilter(filterType: FilterType, label: string) {
  const id = crypto.randomUUID();
  const fields = PARAM_FIELDS[filterType] ?? [];
  const parameters: Record<string, unknown> = Object.fromEntries(
    fields.map((f: ParamFieldDef) => [f.key, f.default]),
  );
  tempSteps.value.push({ id, filterType, label, parameters });
  expandedStepId.value = id;
  selectedStepId.value = id;
  if (!showSidePanel.value) showSidePanel.value = true;

  if (!cropMgr.activeCrop.value && props.fileId) {
    await onCreateCrop();
  } else {
    await previewMgr.applyFilters();
  }
  void nextTick(() => {
    if (cropMgr.cropList.value.length === 0) return;
    if (mode.value === 'explore' || mode.value === 'crop') mode.value = 'compare';
  });
}

function onRemoveStep(stepId: string) {
  tempSteps.value = tempSteps.value.filter((s) => s.id !== stepId);
  if (selectedStepId.value === stepId) selectedStepId.value = null;
  if (expandedStepId.value === stepId) expandedStepId.value = null;
  if (tempSteps.value.length === 0) {
    mode.value = 'explore';
  } else {
    void previewMgr.applyFilters();
  }
}

function onParamChange(stepId: string, key: string, value: unknown) {
  const step = tempSteps.value.find((s) => s.id === stepId);
  if (step) step.parameters![key] = value;
  void debouncedApply();
}

const debouncedApply = useDebounceFn(() => {
  if (mode.value === 'timeline') {
    void previewMgr.loadTimeline();
  } else if (mode.value === 'crop' || mode.value === 'compare') {
    void previewMgr.applyFilters();
  }
}, 200);

// ── Crop ─────────────────────────────────────────────────────────────────────
async function onCreateCrop() {
  const viewport = osdViewerComp.value?.getViewportPx();
  if (!viewport) return;
  const crop = await cropMgr.createCrop(viewport);
  if (crop && mode.value === 'explore') mode.value = 'crop';
}

async function onRegionSelect(viewport: { x: number; y: number; w: number; h: number }) {
  if (!cropMgr.validateViewport(viewport)) return;
  const crop = await cropMgr.createCrop(viewport);
  if (!crop) return;
  mode.value = 'crop';
  if (tempSteps.value.length > 0) {
    void previewMgr.applyFilters();
  }
}

// ── 캔버스 반영 ──────────────────────────────────────────────────────────────
function applyToCanvas() {
  const steps: PreviewTempStep[] = tempSteps.value.map((s) => ({
    filterType: s.filterType,
    parameters: { ...s.parameters },
  }));
  emit('apply-to-canvas', steps);
}

// ── Watch ────────────────────────────────────────────────────────────────────
watch(mode, (newMode) => {
  if (newMode === 'timeline') {
    void previewMgr.loadTimeline();
  } else if (
    (newMode === 'crop' || newMode === 'compare') &&
    cropMgr.activeCrop.value &&
    tempSteps.value.length > 0
  ) {
    void previewMgr.applyFilters();
  }
});

watch(cropMgr.activeCropId, () => {
  if (tempSteps.value.length === 0) return;
  if (mode.value === 'crop' || mode.value === 'compare') {
    void previewMgr.applyFilters();
  } else if (mode.value === 'timeline') {
    void previewMgr.loadTimeline();
  }
});

onBeforeUnmount(() => {
  cropMgr.cleanupAll();
  previewMgr.abortAll();
});
</script>

<template>
  <Teleport to="body">
    <div
      class="zoom-window column"
      :class="{ 'zoom-window--maximized': isMaximized }"
      :style="isMaximized ? {} : { left: pos.x + 'px', top: pos.y + 'px' }"
      @mousedown="bringToFront"
    >
      <!-- 헤더 -->
      <div class="zoom-header row items-center q-py-xs q-px-sm" @mousedown="onHeaderMouseDown">
        <q-btn
          v-if="fileId"
          flat
          round
          dense
          size="xs"
          :icon="showSidePanel ? 'chevron_left' : 'tune'"
          @click.stop="showSidePanel = !showSidePanel"
        >
          <q-tooltip>{{ showSidePanel ? '패널 닫기' : '필터 패널' }}</q-tooltip>
        </q-btn>
        <div class="text-subtitle2 text-weight-medium ellipsis">
          {{ title ?? '이미지 확대' }}
          <span class="text-caption text-grey-6 q-ml-xs">{{ zoomLevel.toFixed(1) }}x</span>
        </div>
        <q-space />
        <q-btn
          flat
          round
          dense
          size="xs"
          :icon="isMaximized ? 'filter_none' : 'crop_square'"
          @click.stop="isMaximized = !isMaximized"
        >
          <q-tooltip>{{ isMaximized ? '원래 크기' : '최대화' }}</q-tooltip>
        </q-btn>
        <q-btn flat round dense size="xs" icon="close" @click.stop="emit('close')" />
      </div>

      <!-- 바디 -->
      <div class="col row" style="min-height: 0">
        <!-- 사이드 패널 -->
        <ZoomSidePanel
          v-if="showSidePanel"
          :crop-list="cropMgr.cropList.value"
          :active-crop-id="cropMgr.activeCropId.value"
          :temp-steps="tempSteps"
          :expanded-step-id="expandedStepId"
          :mode="mode"
          @select-filter="onSelectFilter"
          @create-crop="onCreateCrop"
          @select-crop="cropMgr.activeCropId.value = $event"
          @remove-crop="cropMgr.removeCrop($event)"
          @remove-step="onRemoveStep"
          @expand-step="expandedStepId = $event"
          @param-change="onParamChange"
          @apply-to-canvas="applyToCanvas"
        />

        <!-- 뷰어 영역 -->
        <div class="col column" style="min-width: 0">
          <!-- 모드 토글 -->
          <div
            class="row items-center justify-center q-py-xs"
            style="border-bottom: 1px solid rgba(0, 0, 0, 0.08); flex-shrink: 0"
          >
            <q-btn-toggle
              v-model="mode"
              flat
              dense
              size="sm"
              toggle-color="primary"
              :options="[
                { value: 'explore', icon: 'search', slot: 'explore' },
                { value: 'crop', icon: 'crop', slot: 'crop', disable: !cropMgr.activeCrop.value },
                {
                  value: 'compare',
                  icon: 'compare',
                  slot: 'compare',
                  disable:
                    !cropMgr.activeCrop.value || !cropMgr.activeCrop.value?.processedImageUrl,
                },
                {
                  value: 'timeline',
                  icon: 'view_timeline',
                  slot: 'timeline',
                  disable: !cropMgr.activeCrop.value || tempSteps.length === 0,
                },
              ]"
            >
              <template #explore><q-tooltip>탐색</q-tooltip></template>
              <template #crop><q-tooltip>Crop</q-tooltip></template>
              <template #compare><q-tooltip>비교</q-tooltip></template>
              <template #timeline><q-tooltip>타임라인</q-tooltip></template>
            </q-btn-toggle>
            <span
              v-if="viewportSize && mode === 'explore'"
              class="text-caption q-ml-sm text-weight-medium"
              :class="{
                'text-positive': cViewportStatus === 'ok',
                'text-warning': cViewportStatus === 'too-small',
                'text-negative': cViewportStatus === 'too-large',
              }"
            >
              {{ viewportSize.w }} x {{ viewportSize.h }}
            </span>
          </div>

          <!-- 뷰어 콘텐츠 -->
          <div class="col" style="min-height: 0; position: relative">
            <!-- 모드 0: 탐색 -->
            <div v-show="mode === 'explore'" class="viewer-pane">
              <OsdViewer
                v-if="dziUrl || src"
                ref="osdViewerComp"
                v-bind="dziUrl ? { dziUrl } : { src: src! }"
                :zoom-per-scroll="settingsStore.defaultZoomPerScroll"
                class="fit"
                @zoom="zoomLevel = $event"
                @viewport-change="viewportSize = { w: $event.w, h: $event.h }"
                @region-select="onRegionSelect"
              />
              <div v-else class="fit column items-center justify-center text-grey-5">
                이미지가 없습니다
              </div>
            </div>

            <!-- 모드 1: Crop -->
            <div
              v-show="mode === 'crop'"
              class="viewer-pane"
              style="
                display: flex;
                align-items: center;
                justify-content: center;
                background: #f5f5f5;
              "
            >
              <img
                v-if="cropMgr.activeCrop.value?.nodeImageUrl"
                :src="cropMgr.activeCrop.value!.nodeImageUrl"
                style="max-width: 100%; max-height: 100%; object-fit: contain"
              />
            </div>

            <!-- 모드 2: 비교 -->
            <div v-show="mode === 'compare'" class="viewer-pane row">
              <template
                v-if="
                  cropMgr.activeCrop.value?.nodeImageUrl &&
                  cropMgr.activeCrop.value?.processedImageUrl
                "
              >
                <div
                  class="col"
                  style="position: relative; border-right: 1px solid rgba(0, 0, 0, 0.1)"
                >
                  <OsdViewer
                    :src="cropMgr.activeCrop.value!.nodeImageUrl"
                    :zoom-per-scroll="settingsStore.defaultZoomPerScroll"
                    class="fit"
                  />
                  <span class="compare-label">노드 이미지</span>
                </div>
                <div class="col" style="position: relative">
                  <OsdViewer
                    :src="cropMgr.activeCrop.value!.processedImageUrl!"
                    :zoom-per-scroll="settingsStore.defaultZoomPerScroll"
                    class="fit"
                  />
                  <span class="compare-label">
                    처리 결과
                    <span v-if="previewMgr.lastExecutionMs.value != null" class="q-ml-xs">
                      {{ previewMgr.lastExecutionMs.value.toFixed(1) }}ms
                    </span>
                  </span>
                  <q-inner-loading :showing="previewMgr.applying.value" style="z-index: 10">
                    <q-spinner color="primary" size="24px" />
                  </q-inner-loading>
                </div>
              </template>
              <div v-else class="fit column items-center justify-center text-grey-5">
                <q-spinner color="primary" size="32px" />
                <span class="q-mt-sm">처리 중...</span>
              </div>
            </div>

            <!-- 모드 3: 타임라인 -->
            <div v-show="mode === 'timeline'" class="viewer-pane">
              <TimelineViewer
                v-if="
                  cropMgr.activeCrop.value?.nodeImageUrl &&
                  previewMgr.timelineSteps.value.length > 0
                "
                :node-image-url="cropMgr.activeCrop.value!.nodeImageUrl"
                :steps="previewMgr.timelineSteps.value"
                class="fit"
              />
              <div v-else class="fit column items-center justify-center text-grey-5">
                <q-spinner color="primary" size="32px" />
                <span class="q-mt-sm">처리 중...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped lang="scss">
.viewer-pane {
  position: absolute;
  inset: 0;
}

.compare-label {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 10px;
  font-size: 11px;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  z-index: 1;
  pointer-events: none;
}

.zoom-window {
  position: fixed;
  width: 50vw;
  height: 60vh;
  min-width: 320px;
  min-height: 240px;
  resize: both;
  overflow: hidden;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 6000;

  &--maximized {
    left: 0 !important;
    top: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0;
    resize: none;
  }
}

.zoom-header {
  cursor: move;
  border-bottom: 2px solid #1976d2;
  flex-shrink: 0;
  background: #e3f2fd;
  color: #1565c0;
  user-select: none;
}
</style>
