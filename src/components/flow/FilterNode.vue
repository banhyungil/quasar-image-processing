<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { PARAM_FIELDS } from 'src/constants/imgPrc';
import type { PrcType } from 'src/types/imgPrcType';
import type { ProcessNodeData } from 'src/types/flowTypes';
import { useSettingsStore } from 'src/stores/settings-store';
import FilterTreeSelect from './FilterTreeSelect.vue';

const settings = useSettingsStore();

const props = defineProps<{
  id: string;
  data: ProcessNodeData;
  selected?: boolean;
  zoomed?: boolean;
}>();

const emit = defineEmits<{
  (e: 'open-params', nodeId: string): void;
  (e: 'remove', nodeId: string): void;
  (e: 'toggle-enabled', nodeId: string): void;
  (e: 'zoom', nodeId: string): void;
  (e: 'change-filter', nodeId: string, prcType: PrcType, label: string, filterId?: string): void;
}>();

function onSelectFilter(prcType: PrcType, label: string, filterId?: string) {
  if (prcType === props.data.algorithmNm && !filterId) return;
  emit('change-filter', props.id, prcType, label, filterId);
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
    :style="{ width: `${settings.nodeSize.width}px` }"
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
        <q-btn
          flat
          round
          dense
          size="xs"
          icon="tune"
          color="grey-7"
          @click="emit('open-params', id)"
        >
          <q-tooltip>파라미터</q-tooltip>
        </q-btn>
        <q-toggle
          :model-value="data.enabled"
          dense
          size="xs"
          @update:model-value="emit('toggle-enabled', id)"
        />
        <q-btn
          v-if="data.imageUrl"
          flat
          round
          dense
          size="xs"
          icon="zoom_in"
          :color="zoomed ? 'primary' : 'grey-7'"
          @click.stop="emit('zoom', id)"
        >
          <q-tooltip>이미지 확대</q-tooltip>
        </q-btn>
        <q-btn flat round dense size="xs" icon="close" color="negative" @click="emit('remove', id)">
          <q-tooltip>삭제</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- 썸네일 -->
    <div class="filter-node__body" :style="{ height: `${settings.nodeSize.thumbHeight}px` }">
      <img
        v-if="data.imageUrl"
        :src="data.imageUrl"
        class="filter-node__thumbnail"
      />
      <div v-else class="filter-node__placeholder">
        <q-icon name="image" size="sm" color="grey-4" />
      </div>

      <!-- 실행시간 뱃지 -->
      <q-badge
        v-if="data.executionMs != null"
        class="filter-node__badge"
        color="dark"
        :label="`${data.executionMs.toFixed(1)}ms`"
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

    :deep(.q-btn__content) {
      flex-wrap: nowrap;
    }
    :deep(.q-btn-dropdown__arrow) {
      font-size: 14px;
      margin-left: 2px;
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

  &__thumbnail {
    width: 100%;
    height: 100%;
    object-fit: contain;
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
</style>
