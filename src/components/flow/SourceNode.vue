<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import type { SourceNodeData } from 'src/types/flowTypes';
import { useSettingsStore } from 'src/stores/settings-store';

const settings = useSettingsStore();

defineProps<{
  id: string;
  data: SourceNodeData;
  zoomed?: boolean;
}>();

const emit = defineEmits<{
  (e: 'pick-image'): void;
  (e: 'pick-existing'): void;
  (e: 'clear-image'): void;
  (e: 'zoom', nodeId: string): void;
}>();
</script>

<template>
  <div class="source-node cursor-pointer" :style="{ width: `${settings.nodeSize.width}px` }">
    <!-- 헤더 -->
    <div class="source-node__header">
      <q-icon name="image" size="xs" color="primary" />
      <span class="source-node__label">원본 이미지</span>
      <q-space />
      <q-btn
        v-if="data.previewUrl"
        flat
        round
        dense
        size="xs"
        icon="zoom_in"
        :color="zoomed ? 'accent' : 'primary'"
        @click.stop="emit('zoom', id)"
      >
        <q-tooltip>이미지 확대</q-tooltip>
      </q-btn>
      <q-btn
        v-if="data.previewUrl"
        flat
        round
        dense
        size="xs"
        icon="refresh"
        color="primary"
        @click.stop="emit('clear-image')"
      >
        <q-tooltip>초기화</q-tooltip>
      </q-btn>
    </div>

    <!-- 이미지 영역 -->
    <div v-if="data.previewUrl" class="source-node__body" :style="{ height: `${settings.nodeSize.thumbHeight}px` }">
      <img :src="data.thumbnailUrl ?? data.previewUrl" class="source-node__preview" />
    </div>
    <div v-else class="source-node__body source-node__body--empty" :style="{ height: `${settings.nodeSize.thumbHeight}px` }">
      <q-btn
        flat
        no-caps
        dense
        icon="add_photo_alternate"
        label="파일 업로드"
        color="grey-7"
        size="sm"
        @click="emit('pick-image')"
      />
      <q-btn
        flat
        no-caps
        dense
        icon="photo_library"
        label="기존 이미지"
        color="grey-7"
        size="sm"
        @click="emit('pick-existing')"
      />
    </div>

    <!-- Output Handle -->
    <Handle type="source" :position="Position.Bottom" class="handle" />
  </div>
</template>

<style scoped lang="scss">
.source-node {
  background: white;
  border: 2px solid #1976d2;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(25, 118, 210, 0.15);

  &__header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-bottom: 1px solid rgba(25, 118, 210, 0.15);
    background: #e3f2fd;
  }

  &__label {
    font-size: 13px;
    font-weight: 600;
    color: #1565c0;
  }

  &__body {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fafafa;

    &--empty {
      cursor: pointer;
      flex-direction: column;
      gap: 4px;
    }
  }

  &__preview {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.handle {
  width: 10px;
  height: 10px;
  background: #1976d2;
  border: 2px solid white;
}
</style>
