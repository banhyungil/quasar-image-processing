<script setup lang="ts">
import { useQuasar } from 'quasar';
import { useDebounceFn, useEventListener } from '@vueuse/core';
import { PARAM_FIELDS } from 'src/constants/imgPrc';
import type { ParamFieldDef } from 'src/constants/imgPrc';
import type { PrcType } from 'src/types/imgPrcType';
import type { TreeBatchStep, PreviewTempStep, Viewport } from 'src/types/imgPrcType';
import * as imgPrcApi from 'src/apis/imgPrcApi';
import { API_HOST } from 'src/boot/axios';
import OsdViewer from './OsdViewer.vue';
import FilterTreeSelect from './FilterTreeSelect.vue';
import TimelineViewer from './TimelineViewer.vue';
import ParamField from './ParamField.vue';

const settingsStore = useSettingsStore();
const $q = useQuasar();

const props = defineProps<{
  src: string | null;
  dziUrl?: string;
  title?: string;
  fileId?: string | null;
  nodeSteps?: TreeBatchStep[];
  nodeId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply-to-canvas', steps: PreviewTempStep[]): void;
}>();

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

// 포커스 (z-index 올리기)
const focused = ref(false);
function bringToFront() {
  focused.value = true;
  setTimeout(() => (focused.value = false), 10);
}

// ESC 키 — 우선순위: OSD 줌 복귀 → 모드 복귀 → 최대화 해제
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    debugger;
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

// ── 미니 에디터 ──────────────────────────────────────────────────────────────
type Mode = 'explore' | 'crop' | 'compare' | 'timeline';
const mode = ref<Mode>('explore');
const showSidePanel = ref(true);

// 임시 steps
interface TempStep extends PreviewTempStep {
  id: string;
  label: string;
}
const tempSteps = ref<TempStep[]>([]);
const selectedStepId = ref<string | null>(null);
const expandedStepId = ref<string | null>(null);

// crop 목록 관리
interface CropItem {
  cropId: string;
  nodeImageUrl: string;
  processedImageUrl: string | null;
  viewport: Viewport;
  label: string;
}
const cropList = ref<CropItem[]>([]);
const activeCropId = ref<string | null>(null);
const activeCrop = computed(
  () => cropList.value.find((c) => c.cropId === activeCropId.value) ?? null,
);

let previewAbortController: AbortController | null = null;
const applying = ref(false);

// 필터 추가
async function onSelectFilter(prcType: PrcType, label: string) {
  const id = crypto.randomUUID();
  const fields = PARAM_FIELDS[prcType] ?? [];
  const parameters: Record<string, unknown> = Object.fromEntries(
    fields.map((f: ParamFieldDef) => [f.key, f.default]),
  );
  tempSteps.value.push({ id, prcType, label, parameters });
  expandedStepId.value = id;
  selectedStepId.value = id;

  if (!showSidePanel.value) showSidePanel.value = true;

  if (!activeCrop.value && props.fileId) {
    await createCrop();
  } else {
    await applyFilters();
  }

  void nextTick(() => {
    if (cropList.value.length == 0) return;
    if (mode.value === 'explore' || mode.value === 'crop') mode.value = 'compare';
  });
}

// step 삭제
function removeStep(stepId: string) {
  tempSteps.value = tempSteps.value.filter((s) => s.id !== stepId);
  if (selectedStepId.value === stepId) selectedStepId.value = null;
  if (expandedStepId.value === stepId) expandedStepId.value = null;

  if (tempSteps.value.length === 0) {
    mode.value = 'explore';
  } else {
    void applyFilters();
  }
}

// 파라미터 변경 (debounce) — 현재 모드에 필요한 API만 호출
const onParamChange = useDebounceFn(() => {
  if (mode.value === 'timeline') {
    void loadTimeline();
  } else if (mode.value === 'crop' || mode.value === 'compare') {
    void applyFilters();
  }
}, 200);

// crop 해상도 제한 (총 픽셀 수 기준)
const MIN_CROP_PIXELS = 2_500; // 50x50
const MAX_CROP_PIXELS = 16_000_000; // 4000x4000

const cViewportStatus = computed<'ok' | 'too-small' | 'too-large'>(() => {
  if (!viewportSize.value) return 'ok';
  const pixels = viewportSize.value.w * viewportSize.value.h;
  if (pixels < MIN_CROP_PIXELS) return 'too-small';
  if (pixels > MAX_CROP_PIXELS) return 'too-large';
  return 'ok';
});

function validateViewport(viewport: { w: number; h: number }): boolean {
  const pixels = viewport.w * viewport.h;
  if (pixels < MIN_CROP_PIXELS) {
    $q.notify({ type: 'warning', message: '선택 영역이 너무 작습니다.' });
    return false;
  }
  if (pixels > MAX_CROP_PIXELS) {
    $q.notify({ type: 'warning', message: '선택 영역이 너무 큽니다. 확대 후 다시 시도하세요.' });
    return false;
  }
  return true;
}

// crop 생성 (자르기)
async function createCrop() {
  if (!props.fileId) return;

  // OsdViewer에서 실제 뷰포트 좌표 추출
  const viewport = osdViewerComp.value?.getViewportPx();
  if (!viewport || !validateViewport(viewport)) return;

  const result = await imgPrcApi.previewCrop(
    props.fileId,
    props.nodeSteps ?? [],
    props.nodeId ?? 'source',
    viewport,
  );
  const newCrop: CropItem = {
    cropId: result.cropId,
    nodeImageUrl: API_HOST + result.nodeImageUrl,
    processedImageUrl: null,
    viewport,
    label: `Crop ${cropList.value.length + 1}`,
  };
  cropList.value.push(newCrop);
  activeCropId.value = result.cropId;
  if (mode.value === 'explore') mode.value = 'crop';
}

// Shift+드래그 영역 선택으로 crop 생성
async function onRegionSelect(viewport: { x: number; y: number; w: number; h: number }) {
  if (!props.fileId || !validateViewport(viewport)) return;

  try {
    const result = await imgPrcApi.previewCrop(
      props.fileId,
      props.nodeSteps ?? [],
      props.nodeId ?? 'source',
      viewport,
    );
    const newCrop: CropItem = {
      cropId: result.cropId,
      nodeImageUrl: API_HOST + result.nodeImageUrl,
      processedImageUrl: null,
      viewport,
      label: `Crop ${cropList.value.length + 1}`,
    };
    cropList.value.push(newCrop);
    activeCropId.value = result.cropId;
    mode.value = 'crop';

    if (tempSteps.value.length > 0) {
      void applyFilters();
    }
  } catch {
    // interceptor 처리
  }
}

// 필터 적용
async function applyFilters() {
  const crop = activeCrop.value;
  if (!props.fileId || !crop || tempSteps.value.length === 0) return;

  previewAbortController?.abort();
  previewAbortController = new AbortController();
  applying.value = true;

  try {
    const steps: PreviewTempStep[] = tempSteps.value.map((s) => ({
      prcType: s.prcType,
      parameters: { ...s.parameters },
    }));

    const blob = await imgPrcApi.previewApply(props.fileId, crop.cropId, steps, crop.viewport, {
      signal: previewAbortController.signal,
    });

    if (!blob) return; // abort
    if (crop.processedImageUrl) URL.revokeObjectURL(crop.processedImageUrl);
    crop.processedImageUrl = URL.createObjectURL(blob);
  } finally {
    applying.value = false;
  }
}

// timeline 데이터
const timelineSteps = ref<{ prcType: string; imageSrc: string }[]>([]);
let timelineAbortController: AbortController | null = null;

async function loadTimeline() {
  const crop = activeCrop.value;
  if (!props.fileId || !crop || tempSteps.value.length === 0) return;

  timelineAbortController?.abort();
  timelineAbortController = new AbortController();

  const steps: PreviewTempStep[] = tempSteps.value.map((s) => ({
    prcType: s.prcType,
    parameters: { ...s.parameters },
  }));

  try {
    const results = await imgPrcApi.previewApplyAll(
      props.fileId,
      crop.cropId,
      steps,
      crop.viewport,
      { signal: timelineAbortController.signal },
    );
    timelineSteps.value = results.map((r) => ({
      prcType: r.prcType,
      imageSrc: `data:image/png;base64,${r.imageBase64}`,
    }));
  } catch {
    // abort 또는 에러
  }
}

// 모드 변경 시 필요한 데이터 로드
watch(mode, (newMode) => {
  if (newMode === 'timeline') {
    void loadTimeline();
  } else if (
    (newMode === 'crop' || newMode === 'compare') &&
    activeCrop.value &&
    tempSteps.value.length > 0
  ) {
    void applyFilters();
  }
});

// crop 선택 변경 시 현재 모드에 맞게 갱신
watch(activeCropId, () => {
  if (tempSteps.value.length === 0) return;

  if (mode.value === 'crop' || mode.value === 'compare') {
    void applyFilters();
  } else if (mode.value === 'timeline') {
    void loadTimeline();
  }
});

// 캔버스에 반영
function applyToCanvas() {
  const steps: PreviewTempStep[] = tempSteps.value.map((s) => ({
    prcType: s.prcType,
    parameters: { ...s.parameters },
  }));
  emit('apply-to-canvas', steps);
}

// crop 캐시 정리
function cleanupAllCrops() {
  for (const crop of cropList.value) {
    if (props.fileId) {
      void imgPrcApi.previewDelete(props.fileId, crop.cropId);
    }
    if (crop.processedImageUrl) {
      URL.revokeObjectURL(crop.processedImageUrl);
    }
  }
  cropList.value = [];
  activeCropId.value = null;
}

function removeCrop(cropIdToRemove: string) {
  const crop = cropList.value.find((c) => c.cropId === cropIdToRemove);
  if (!crop) return;
  if (props.fileId) {
    void imgPrcApi.previewDelete(props.fileId, cropIdToRemove);
  }
  if (crop.processedImageUrl) {
    URL.revokeObjectURL(crop.processedImageUrl);
  }
  cropList.value = cropList.value.filter((c) => c.cropId !== cropIdToRemove);
  if (activeCropId.value === cropIdToRemove) {
    activeCropId.value = cropList.value[0]?.cropId ?? null;
  }
  if (cropList.value.length === 0) {
    mode.value = 'explore';
  }
}

// 팝업 닫힘 시 정리
onBeforeUnmount(() => {
  cleanupAllCrops();
  previewAbortController?.abort();
});

// step 파라미터 필드
function getStepFields(prcType: PrcType): ParamFieldDef[] {
  return PARAM_FIELDS[prcType] ?? [];
}
</script>

<template>
  <Teleport to="body">
    <div
      class="zoom-window column"
      :class="{ 'zoom-window--maximized': isMaximized }"
      :style="isMaximized ? {} : { left: pos.x + 'px', top: pos.y + 'px' }"
      @mousedown="bringToFront"
    >
      <!-- 헤더 (드래그 핸들) -->
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
        <div v-if="showSidePanel" class="zoom-side column">
          <!-- 필터 선택 -->
          <div style="border-bottom: 1px solid rgba(0, 0, 0, 0.08)">
            <div class="q-pa-xs">
              <FilterTreeSelect label="필터 추가" @select="onSelectFilter" />
            </div>
          </div>

          <!-- Crop 목록 (아코디언) -->
          <q-expansion-item default-opened dense header-class="zoom-side__section-header">
            <template #header>
              <q-item-section avatar style="min-width: auto; padding-right: 4px">
                <q-icon name="crop" size="xs" color="grey-7" />
              </q-item-section>
              <q-item-section>
                <span class="text-body2 text-grey-7 text-weight-medium"
                  >Crop 목록 ({{ cropList.length }})</span
                >
              </q-item-section>
              <q-item-section side>
                <q-btn
                  v-if="mode === 'explore'"
                  flat
                  dense
                  size="xs"
                  icon="content_cut"
                  color="primary"
                  @click.stop="createCrop"
                >
                  <q-tooltip>현재 뷰포트 자르기</q-tooltip>
                </q-btn>
              </q-item-section>
            </template>

            <div v-if="cropList.length === 0" class="text-caption text-grey-5 text-center q-py-sm">
              Shift+드래그 또는 ✂ 버튼으로 영역 선택
            </div>
            <div v-for="crop in cropList" :key="crop.cropId" class="zoom-side__crop-item">
              <div class="row items-center q-px-xs q-pt-xs">
                <span
                  class="text-caption ellipsis col cursor-pointer"
                  :class="{ 'text-primary text-weight-bold': activeCropId === crop.cropId }"
                  @click="activeCropId = crop.cropId"
                >
                  {{ crop.label }}
                </span>
                <q-btn
                  flat
                  round
                  dense
                  size="xs"
                  icon="close"
                  color="grey-6"
                  @click="removeCrop(crop.cropId)"
                />
              </div>
              <div
                class="zoom-side__crop-thumb cursor-pointer"
                :class="{ 'zoom-side__crop-thumb--active': activeCropId === crop.cropId }"
                @click="activeCropId = crop.cropId"
              >
                <img :src="crop.nodeImageUrl" class="zoom-side__crop-img" />
              </div>
            </div>
          </q-expansion-item>

          <!-- 적용 필터 (아코디언) -->
          <q-expansion-item default-opened dense header-class="zoom-side__section-header">
            <template #header>
              <q-item-section avatar style="min-width: auto; padding-right: 4px">
                <q-icon name="layers" size="xs" color="grey-7" />
              </q-item-section>
              <q-item-section>
                <span class="text-body2 text-grey-7 text-weight-medium"
                  >적용 필터 ({{ tempSteps.length }})</span
                >
              </q-item-section>
            </template>

            <q-list dense separator>
              <q-expansion-item
                v-for="step in tempSteps"
                :key="step.id"
                :label="step.label"
                :model-value="expandedStepId === step.id"
                @update:model-value="expandedStepId = $event ? step.id : null"
                dense
                header-class="text-body2"
              >
                <template #header>
                  <q-item-section>
                    <q-item-label class="text-body2">{{ step.label }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      round
                      dense
                      size="xs"
                      icon="close"
                      color="negative"
                      @click.stop="removeStep(step.id)"
                    />
                  </q-item-section>
                </template>

                <div class="q-px-sm q-pb-sm">
                  <ParamField
                    v-for="field in getStepFields(step.prcType)"
                    :key="field.key"
                    :field="field"
                    :model-value="step.parameters?.[field.key]"
                    @update:model-value="
                      step.parameters![field.key] = $event;
                      onParamChange();
                    "
                  />
                </div>
              </q-expansion-item>
            </q-list>
          </q-expansion-item>

          <!-- 하단 버튼 -->
          <div
            v-if="tempSteps.length > 0"
            class="row col q-pa-xs q-gutter-xs items-end"
            style="border-top: 1px solid rgba(0, 0, 0, 0.08)"
          >
            <q-btn
              unelevated
              dense
              no-caps
              size="sm"
              label="캔버스에 반영"
              color="primary"
              class="col"
              icon="check"
              @click="applyToCanvas"
            />
          </div>
        </div>

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
                { value: 'crop', icon: 'crop', slot: 'crop', disable: !activeCrop },
                {
                  value: 'compare',
                  icon: 'compare',
                  slot: 'compare',
                  disable: !activeCrop || !activeCrop?.processedImageUrl,
                },
                {
                  value: 'timeline',
                  icon: 'view_timeline',
                  slot: 'timeline',
                  disable: !activeCrop || tempSteps.length === 0,
                },
              ]"
            >
              <template #explore><q-tooltip>탐색</q-tooltip></template>
              <template #crop><q-tooltip>Crop</q-tooltip></template>
              <template #timeline><q-tooltip>타임라인</q-tooltip></template>
              <template #compare><q-tooltip>비교</q-tooltip></template>
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
            <!-- 모드 0: 전체 이미지 탐색 -->
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

            <!-- 모드 1: Crop 이미지 표시 -->
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
                v-if="activeCrop?.nodeImageUrl"
                :src="activeCrop!.nodeImageUrl"
                style="max-width: 100%; max-height: 100%; object-fit: contain"
              />
            </div>

            <!-- 모드 2: 비교 모드 (원본 | 처리 결과) OsdViewer -->
            <div v-show="mode === 'compare'" class="viewer-pane row">
              <template v-if="activeCrop?.nodeImageUrl && activeCrop?.processedImageUrl">
                <div
                  class="col"
                  style="position: relative; border-right: 1px solid rgba(0, 0, 0, 0.1)"
                >
                  <OsdViewer
                    :src="activeCrop!.nodeImageUrl"
                    :zoom-per-scroll="settingsStore.defaultZoomPerScroll"
                    class="fit"
                  />
                  <span class="compare-label">노드 이미지</span>
                </div>
                <div class="col" style="position: relative">
                  <OsdViewer
                    :src="activeCrop!.processedImageUrl!"
                    :zoom-per-scroll="settingsStore.defaultZoomPerScroll"
                    class="fit"
                  />
                  <span class="compare-label">처리 결과</span>
                  <q-inner-loading :showing="applying" style="z-index: 10">
                    <q-spinner color="primary" size="24px" />
                  </q-inner-loading>
                </div>
              </template>
              <div v-else class="fit column items-center justify-center text-grey-5">
                <q-spinner color="primary" size="32px" />
                <span class="q-mt-sm">처리 중...</span>
              </div>
            </div>

            <!-- 모드 3: Timeline -->
            <div v-show="mode === 'timeline'" class="viewer-pane">
              <TimelineViewer
                v-if="activeCrop?.nodeImageUrl && timelineSteps.length > 0"
                :node-image-url="activeCrop!.nodeImageUrl"
                :steps="timelineSteps"
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

.zoom-header {
  cursor: move;
  border-bottom: 2px solid #1976d2;
  flex-shrink: 0;
  background: #e3f2fd;
  color: #1565c0;
  user-select: none;
}

.zoom-side {
  width: 240px;
  min-width: 240px;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  background: #fafafa;
  overflow: hidden;

  // deep은 전체 클래스명 전달
  :deep(.zoom-side__section-header) {
    padding: 4px 8px;
    min-height: 28px;
    border-bottom: 1px solid rgba(25, 118, 210, 0.2);
    background: #e8f0fe;
    color: #1565c0;
  }

  &__crops {
    flex-shrink: 0;
    max-height: 200px;
    overflow-y: auto;
  }

  &__crop-item {
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  }

  &__crop-thumb {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    border: 2px solid transparent;
    transition: border-color 0.15s;

    &--active {
      border-color: #1976d2;
    }
  }

  &__crop-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}
</style>
