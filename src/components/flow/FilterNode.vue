<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { PARAM_FIELDS } from 'src/constants/imgPrc';
import type { FilterType } from 'src/types/imgPrcType';
import type { ProcessNodeData } from 'src/types/flowTypes';
import { useSettingsStore } from 'src/stores/settings-store';
import FilterTreeSelect from './FilterTreeSelect.vue';
import ZoomableImage from './ZoomableImage.vue';

const settings = useSettingsStore();

const props = defineProps<{
  id: string;
  data: ProcessNodeData;
  selected?: boolean;
  zoomed?: boolean;
}>();

const emit = defineEmits<{
  (e: 'remove', nodeId: string): void;
  (e: 'toggle-enabled', nodeId: string): void;
  (e: 'zoom', nodeId: string): void;
  (e: 'download', nodeId: string): void;
  (e: 'copy-chain', nodeId: string): void;
  (
    e: 'change-filter',
    nodeId: string,
    filterType: FilterType,
    label: string,
    filterId?: string,
  ): void;
  (e: 'resize', nodeId: string, width: number, thumbHeight: number): void;
}>();

const nodeWidth = computed(() => props.data.customWidth ?? settings.nodeSize.width);
const nodeThumbHeight = computed(
  () => props.data.customThumbHeight ?? settings.nodeSize.thumbHeight,
);

// ── 드래그 리사이즈 ──────────────────────────────────────────────────────
const resizing = ref(false);
const resizeStart = { x: 0, y: 0, w: 0, h: 0 };
const liveWidth = ref(0);
const liveHeight = ref(0);

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
  window.addEventListener('mousemove', onResizeMouseMove);
  window.addEventListener('mouseup', onResizeMouseUp);
}

function onResizeMouseMove(e: MouseEvent) {
  const dx = e.clientX - resizeStart.x;
  const dy = e.clientY - resizeStart.y;
  liveWidth.value = Math.max(120, Math.round(resizeStart.w + dx));
  liveHeight.value = Math.max(60, Math.round(resizeStart.h + dy));
}

function onResizeMouseUp() {
  resizing.value = false;
  window.removeEventListener('mousemove', onResizeMouseMove);
  window.removeEventListener('mouseup', onResizeMouseUp);
  emit('resize', props.id, liveWidth.value, liveHeight.value);
}

const cWidth = computed(() => (resizing.value ? liveWidth.value : nodeWidth.value));
const cThumbHeight = computed(() => (resizing.value ? liveHeight.value : nodeThumbHeight.value));

function onSelectFilter(filterType: FilterType, label: string, filterId?: string) {
  if (filterType === props.data.algorithmNm && !filterId) return;
  emit('change-filter', props.id, filterType, label, filterId);
}

const cParamSummary = computed(() => {
  const fields = PARAM_FIELDS[props.data.algorithmNm];
  if (!fields) return [];
  return fields.map((f) => ({
    label: f.label,
    value: props.data.parameters[f.key] ?? f.default,
  }));
});
</script>

<template>
  <div
    class="filter-node cursor-pointer"
    :class="{ 'filter-node--disabled': !data.enabled, 'filter-node--selected': selected }"
    :style="{ width: `${cWidth}px` }"
  >
    <!-- Input Handle -->
    <Handle type="target" :position="Position.Top" class="handle" />

    <!-- 헤더 -->
    <div class="filter-node__header">
      <FilterTreeSelect
        class="filter-node__label"
        :model-value="data.algorithmNm"
        :label="data.label"
        @select="onSelectFilter"
      />
      <div class="filter-node__actions">
        <q-toggle
          :model-value="data.enabled"
          dense
          size="xs"
          @update:model-value="emit('toggle-enabled', id)"
          @click.stop
        />
        <q-btn flat round dense size="xs" icon="more_vert" color="grey-7" @click.stop>
          <q-menu auto-close>
            <q-list dense style="min-width: 140px">
              <q-item v-if="data.imageUrl" clickable @click="emit('zoom', id)">
                <q-item-section side><q-icon name="zoom_in" size="xs" /></q-item-section>
                <q-item-section>이미지 확대</q-item-section>
              </q-item>
              <q-item v-if="data.imageUrl" clickable @click="emit('download', id)">
                <q-item-section side><q-icon name="download" size="xs" /></q-item-section>
                <q-item-section>이미지 다운로드</q-item-section>
              </q-item>
              <q-item clickable @click="emit('copy-chain', id)">
                <q-item-section side><q-icon name="content_copy" size="xs" /></q-item-section>
                <q-item-section>체인 정보 복사</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
        <q-btn flat round dense size="xs" icon="close" color="negative" @click="emit('remove', id)">
          <q-tooltip>삭제</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- 썸네일 -->
    <div class="filter-node__body" :style="{ height: `${cThumbHeight}px` }">
      <ZoomableImage v-if="data.imageUrl" :src="data.imageUrl" class="cursor-pointer" />
      <div v-else class="filter-node__placeholder">
        <q-icon name="image" size="sm" color="grey-4" />
      </div>

      <!-- 실행시간 + 해상도 뱃지 -->
      <q-badge
        v-if="data.executionMs != null"
        class="filter-node__badge"
        color="dark"
        :label="`${data.executionMs.toFixed(1)}ms`"
      />
      <!-- 노드 크기 뱃지 (hover 시 표시) -->
      <q-badge
        class="filter-node__size-badge"
        color="grey-8"
        :label="`${cWidth}x${cThumbHeight}`"
      />
    </div>

    <!-- 파라미터 정보 -->
    <div class="filter-node__params">
      <div v-for="p in cParamSummary" :key="p.label" class="filter-node__param">
        <span class="filter-node__param-label">{{ p.label }}</span>
        <span class="filter-node__param-value">{{ p.value }}</span>
      </div>
    </div>

    <!-- Output Handle -->
    <Handle type="source" :position="Position.Bottom" class="handle" />

    <!-- 리사이즈 핸들 -->
    <div class="resize-handle" @mousedown="onResizeMouseDown" />
  </div>
</template>

<style scoped lang="scss">
.filter-node {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

  &--selected {
    border-color: #1976d2;
    box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3);
  }

  &--disabled {
    opacity: 0.45;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    background: #fafafa;
  }

  &__label {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    min-width: 0;
    overflow: hidden;

    :deep(.q-btn__content) {
      flex-wrap: nowrap;
      overflow: hidden;

      > span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
    :deep(.q-btn-dropdown__arrow) {
      font-size: 14px;
      margin-left: 2px;
      flex-shrink: 0;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  &__body {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
  }

  &__placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__badge {
    position: absolute;
    bottom: 4px;
    right: 4px;
    font-size: 10px;
  }

  &__size-badge {
    position: absolute;
    bottom: 4px;
    left: 4px;
    font-size: 10px;
    opacity: 0;
    transition: opacity 0.15s;
  }

  &:hover &__size-badge {
    opacity: 1;
  }

  &__params {
    padding: 4px 8px;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    background: #fafafa;
  }

  &__param {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    line-height: 1.6;

    &-label {
      color: #666;
    }

    &-value {
      font-weight: 500;
      color: #333;
    }
  }
}

.handle {
  width: 10px;
  height: 10px;
  background: #1976d2;
  border: 2px solid white;
}

.resize-handle {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 12px;
  height: 12px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(25, 118, 210, 0.4) 50%);
  border-radius: 0 0 8px 0;
  z-index: 5;

  &:hover {
    background: linear-gradient(135deg, transparent 50%, rgba(25, 118, 210, 0.7) 50%);
  }
}
</style>
