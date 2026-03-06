<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import type { SourceNodeData } from 'src/types/flowTypes';

defineProps<{
  id: string;
  data: SourceNodeData;
}>();

const emit = defineEmits<{
  (e: 'pick-image'): void;
}>();
</script>

<template>
  <div class="source-node">
    <!-- 헤더 -->
    <div class="source-node__header">
      <q-icon name="image" size="xs" color="primary" />
      <span class="source-node__label">원본 이미지</span>
    </div>

    <!-- 이미지 영역 -->
    <div class="source-node__body" @click="emit('pick-image')">
      <img v-if="data.previewUrl" :src="data.previewUrl" class="source-node__preview" />
      <div v-else class="source-node__placeholder">
        <q-icon name="add_photo_alternate" size="md" color="grey-4" />
        <span class="text-caption text-grey-5">클릭하여 업로드</span>
      </div>
    </div>

    <!-- Output Handle -->
    <Handle type="source" :position="Position.Bottom" class="handle" />
  </div>
</template>

<style scoped>
.source-node {
  width: 200px;
  background: white;
  border: 2px solid #1976d2;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(25, 118, 210, 0.15);
}

.source-node__header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid rgba(25, 118, 210, 0.15);
  background: #e3f2fd;
}

.source-node__label {
  font-size: 13px;
  font-weight: 600;
  color: #1565c0;
}

.source-node__body {
  height: 130px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #fafafa;
}

.source-node__preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.source-node__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.handle {
  width: 10px;
  height: 10px;
  background: #1976d2;
  border: 2px solid white;
}
</style>
