<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import type { ProcessNodeData } from 'src/types/flowTypes';

defineProps<{
  id: string;
  data: ProcessNodeData;
}>();

const emit = defineEmits<{
  (e: 'open-params', nodeId: string): void;
  (e: 'remove', nodeId: string): void;
  (e: 'toggle-enabled', nodeId: string): void;
}>();
</script>

<template>
  <div class="filter-node" :class="{ 'filter-node--disabled': !data.enabled }">
    <!-- Input Handle -->
    <Handle type="target" :position="Position.Top" class="handle" />

    <!-- 헤더 -->
    <div class="filter-node__header">
      <div class="filter-node__label ellipsis">{{ data.label }}</div>
      <div class="filter-node__actions">
        <q-btn flat round dense size="xs" icon="tune" color="grey-7" @click="emit('open-params', id)">
          <q-tooltip>파라미터</q-tooltip>
        </q-btn>
        <q-toggle
          :model-value="data.enabled"
          dense
          size="xs"
          @update:model-value="emit('toggle-enabled', id)"
        />
        <q-btn flat round dense size="xs" icon="close" color="negative" @click="emit('remove', id)">
          <q-tooltip>삭제</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- 썸네일 -->
    <div class="filter-node__body">
      <img
        v-if="data.thumbnail"
        :src="'data:image/png;base64,' + data.thumbnail"
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

    <!-- Output Handle -->
    <Handle type="source" :position="Position.Bottom" class="handle" />
  </div>
</template>

<style scoped>
.filter-node {
  width: 200px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.filter-node--disabled {
  opacity: 0.45;
}

.filter-node__header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  background: #fafafa;
}

.filter-node__label {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.filter-node__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.filter-node__body {
  position: relative;
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.filter-node__thumbnail {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.filter-node__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-node__badge {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 10px;
}

.handle {
  width: 10px;
  height: 10px;
  background: #1976d2;
  border: 2px solid white;
}
</style>
