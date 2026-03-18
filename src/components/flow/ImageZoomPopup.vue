<script setup lang="ts">
import { useDebounceFn, useEventListener } from '@vueuse/core';
import { PARAM_FIELDS } from 'src/constants/imgPrc';
import type { ParamFieldDef } from 'src/constants/imgPrc';
import type { PrcType } from 'src/types/imgPrcType';
import type { TreeBatchStep, PreviewTempStep, Viewport } from 'src/types/imgPrcType';
import * as imgPrcApi from 'src/apis/imgPrcApi';
import { API_HOST } from 'src/boot/axios';
import OsdViewer from './OsdViewer.vue';
import FilterTreeSelect from './FilterTreeSelect.vue';
import BeforeAfterSlider from './BeforeAfterSlider.vue';

const settingsStore = useSettingsStore();

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
const osdViewerRef = ref<InstanceType<typeof OsdViewer> | null>(null);

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

// ESC 키
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (isMaximized.value) {
      isMaximized.value = false;
    } else if (mode.value === 'compare') {
      mode.value = 'explore';
    } else {
      osdViewerRef.value?.goHome();
    }
  }
}

useEventListener(window, 'keydown', onKeyDown);

// ── 미니 에디터 ──────────────────────────────────────────────────────────────
type Mode = 'explore' | 'compare';
const mode = ref<Mode>('explore');
const showSidePanel = ref(false);

// 임시 steps
interface TempStep extends PreviewTempStep {
  id: string;
  label: string;
}
const tempSteps = ref<TempStep[]>([]);
const selectedStepId = ref<string | null>(null);
const expandedStepId = ref<string | null>(null);

// crop 캐시
const cropId = ref<string | null>(null);
const nodeImageUrl = ref<string | null>(null);
const processedImageUrl = ref<string | null>(null);
let previewAbortController: AbortController | null = null;

// 필터 추가
function onSelectFilter(prcType: PrcType, label: string) {
  const id = crypto.randomUUID();
  const fields = PARAM_FIELDS[prcType] ?? [];
  const parameters: Record<string, unknown> = Object.fromEntries(
    fields.map((f: ParamFieldDef) => [f.key, f.default]),
  );
  tempSteps.value.push({ id, prcType, label, parameters });
  expandedStepId.value = id;
  selectedStepId.value = id;

  if (!showSidePanel.value) showSidePanel.value = true;

  // 자동으로 crop 비교 모드 전환
  if (mode.value === 'explore' && props.fileId) {
    void startCompareMode();
  } else {
    void applyFilters();
  }
}

// step 삭제
function removeStep(stepId: string) {
  tempSteps.value = tempSteps.value.filter((s) => s.id !== stepId);
  if (selectedStepId.value === stepId) selectedStepId.value = null;
  if (expandedStepId.value === stepId) expandedStepId.value = null;

  if (tempSteps.value.length === 0) {
    mode.value = 'explore';
    cleanupCrop();
  } else {
    void applyFilters();
  }
}

// 파라미터 변경 (debounce)
const onParamChange = useDebounceFn(() => {
  void applyFilters();
}, 200);

// crop 비교 모드 시작
async function startCompareMode() {
  if (!props.fileId) return;

  // OsdViewer에서 뷰포트 좌표 추출 (미구현 시 전체 이미지)
  const viewport: Viewport = { x: 0, y: 0, w: 2000, h: 2000 };

  try {
    const result = await imgPrcApi.previewCrop(
      props.fileId,
      props.nodeSteps ?? [],
      props.nodeId ?? 'source',
      viewport,
    );
    cropId.value = result.cropId;
    nodeImageUrl.value = API_HOST + result.nodeImageUrl;
    mode.value = 'compare';

    void applyFilters();
  } catch {
    // interceptor가 에러 알림 처리
  }
}

// 필터 적용
async function applyFilters() {
  if (!props.fileId || !cropId.value || tempSteps.value.length === 0) return;

  previewAbortController?.abort();
  previewAbortController = new AbortController();

  const viewport: Viewport = { x: 0, y: 0, w: 2000, h: 2000 };
  const steps: PreviewTempStep[] = tempSteps.value.map((s) => ({
    prcType: s.prcType,
    parameters: { ...s.parameters },
  }));

  try {
    const blob = await imgPrcApi.previewApply(
      props.fileId,
      cropId.value,
      steps,
      viewport,
      { signal: previewAbortController.signal },
    );

    if (processedImageUrl.value) URL.revokeObjectURL(processedImageUrl.value);
    processedImageUrl.value = URL.createObjectURL(blob);
  } catch {
    // abort 또는 에러 — interceptor 처리
  }
}

// 캔버스에 반영
function applyToCanvas() {
  const steps: PreviewTempStep[] = tempSteps.value.map((s) => ({
    prcType: s.prcType,
    parameters: { ...s.parameters },
  }));
  emit('apply-to-canvas', steps);
}

// crop 캐시 정리
function cleanupCrop() {
  if (props.fileId && cropId.value) {
    void imgPrcApi.previewDelete(props.fileId, cropId.value);
  }
  cropId.value = null;
  if (nodeImageUrl.value) nodeImageUrl.value = null;
  if (processedImageUrl.value) {
    URL.revokeObjectURL(processedImageUrl.value);
    processedImageUrl.value = null;
  }
}

// 전체보기로 복귀
function backToExplore() {
  mode.value = 'explore';
}

// 팝업 닫힘 시 정리
onBeforeUnmount(() => {
  cleanupCrop();
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
        <div class="text-subtitle2 text-weight-medium ellipsis">
          {{ title ?? '이미지 확대' }}
          <span class="text-caption text-grey-6 q-ml-xs">{{ zoomLevel.toFixed(1) }}x</span>
        </div>
        <q-space />
        <q-btn
          v-if="!showSidePanel && fileId"
          flat
          round
          dense
          size="xs"
          icon="tune"
          @click.stop="showSidePanel = true"
        >
          <q-tooltip>필터 패널</q-tooltip>
        </q-btn>
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
          <div class="q-pa-xs" style="border-bottom: 1px solid rgba(0,0,0,0.08)">
            <FilterTreeSelect
              :model-value="(undefined as any)"
              label="필터 추가"
              @select="onSelectFilter"
            />
          </div>

          <!-- crop 미리보기 -->
          <div
            v-if="nodeImageUrl"
            class="zoom-side__crop"
            :class="{ 'cursor-pointer': mode === 'explore' }"
            @click="mode === 'explore' && cropId && processedImageUrl ? (mode = 'compare') : undefined"
          >
            <img :src="processedImageUrl ?? nodeImageUrl" class="zoom-side__crop-img" />
            <q-badge v-if="mode === 'compare'" color="primary" floating label="비교 중" />
          </div>

          <!-- 적용 Steps 아코디언 -->
          <q-scroll-area class="col">
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
                  <template v-for="field in getStepFields(step.prcType)" :key="field.key">
                    <q-input
                      v-if="field.type === 'number'"
                      :model-value="(step.parameters?.[field.key] as number) ?? field.default"
                      @update:model-value="step.parameters![field.key] = Number($event); onParamChange()"
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
                      :model-value="step.parameters?.[field.key]"
                      @update:model-value="step.parameters![field.key] = $event; onParamChange()"
                      :label="field.label"
                      :options="field.options"
                      emit-value
                      map-options
                      outlined
                      dense
                    />
                  </template>
                </div>
              </q-expansion-item>
            </q-list>
          </q-scroll-area>

          <!-- 하단 버튼 -->
          <div
            v-if="tempSteps.length > 0"
            class="row q-pa-xs q-gutter-xs"
            style="border-top: 1px solid rgba(0,0,0,0.08)"
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
        <div class="col" style="min-width: 0; position: relative">
          <!-- 모드 1: 전체 이미지 탐색 -->
          <template v-if="mode === 'explore'">
            <OsdViewer
              v-if="dziUrl || src"
              ref="osdViewerRef"
              v-bind="dziUrl ? { dziUrl } : { src: src! }"
              :zoom-per-scroll="settingsStore.defaultZoomPerScroll"
              class="fit"
              @zoom="zoomLevel = $event"
            />
            <div v-else class="fit column items-center justify-center text-grey-5">
              이미지가 없습니다
            </div>

            <!-- 기존 crop 비교로 복귀 -->
            <q-btn
              v-if="cropId && processedImageUrl"
              fab-mini
              color="primary"
              icon="compare"
              class="absolute-bottom-left q-ma-sm"
              style="z-index: 5"
              @click="mode = 'compare'"
            >
              <q-tooltip>비교 모드</q-tooltip>
            </q-btn>
          </template>

          <!-- 모드 2: Crop 비교 모드 -->
          <template v-else-if="mode === 'compare'">
            <BeforeAfterSlider
              v-if="nodeImageUrl && processedImageUrl"
              :before-src="nodeImageUrl"
              :after-src="processedImageUrl"
              class="fit"
            />
            <div v-else class="fit column items-center justify-center text-grey-5">
              <q-spinner color="primary" size="32px" />
              <span class="q-mt-sm">처리 중...</span>
            </div>

            <!-- 전체보기 버튼 -->
            <q-btn
              fab-mini
              color="dark"
              icon="fullscreen_exit"
              class="absolute-bottom-left q-ma-sm"
              style="z-index: 5"
              @click="backToExplore"
            >
              <q-tooltip>전체보기</q-tooltip>
            </q-btn>
          </template>
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

.zoom-header {
  cursor: move;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  background: #fafafa;
  user-select: none;
}

.zoom-side {
  width: 240px;
  min-width: 240px;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  background: #fafafa;
  overflow: hidden;

  &__crop {
    position: relative;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    background: #f0f0f0;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__crop-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
}
</style>
