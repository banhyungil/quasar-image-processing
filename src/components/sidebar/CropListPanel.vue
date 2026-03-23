<script setup lang="ts">
import type { CropItem } from 'src/composables/useCropManager';

defineProps<{
  cropList: CropItem[];
  activeCropId: string | null;
  originalThumbnailUrl: string | null;
}>();

const emit = defineEmits<{
  (e: 'create-crop'): void;
  (e: 'select-crop', cropId: string): void;
  (e: 'remove-crop', cropId: string): void;
  (e: 'clear-crop'): void;
}>();
</script>

<template>
  <div class="crop-panel column fit">
    <!-- 헤더 -->
    <div class="row items-center q-px-sm q-py-xs" style="border-bottom: 1px solid rgba(0, 0, 0, 0.08)">
      <q-icon name="crop" size="xs" color="grey-7" class="q-mr-xs" />
      <span class="text-body2 text-weight-medium">Crop ({{ cropList.length }})</span>
      <q-space />
      <q-btn flat dense size="xs" icon="add" color="primary" @click="emit('create-crop')">
        <q-tooltip>새 Crop 생성</q-tooltip>
      </q-btn>
      <q-btn
        v-if="activeCropId"
        flat
        dense
        size="xs"
        icon="close"
        color="grey-6"
        @click="emit('clear-crop')"
      >
        <q-tooltip>Crop 해제</q-tooltip>
      </q-btn>
    </div>

    <!-- 목록 -->
    <q-scroll-area class="col">
      <!-- 원본 이미지 항목 (항상 표시) -->
      <div
        class="crop-item cursor-pointer"
        :class="{ 'crop-item--active': activeCropId === null }"
        @click="emit('clear-crop')"
      >
        <div class="row items-center q-px-xs q-pt-xs">
          <q-icon name="image" size="xs" color="primary" class="q-mr-xs" />
          <span
            class="text-caption ellipsis col"
            :class="{ 'text-primary text-weight-bold': activeCropId === null }"
          >
            원본 이미지
          </span>
        </div>
        <div class="crop-thumb" :class="{ 'crop-thumb--active': activeCropId === null }">
          <img v-if="originalThumbnailUrl" :src="originalThumbnailUrl" class="crop-img" />
          <q-icon v-else name="image" size="sm" color="grey-4" />
        </div>
      </div>

      <!-- Crop 항목들 -->
      <div
        v-for="crop in cropList"
        :key="crop.cropId"
        class="crop-item cursor-pointer"
        :class="{ 'crop-item--active': activeCropId === crop.cropId }"
        @click="emit('select-crop', crop.cropId)"
      >
        <div class="row items-center q-px-xs q-pt-xs">
          <span
            class="text-caption ellipsis col"
            :class="{ 'text-primary text-weight-bold': activeCropId === crop.cropId }"
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
            @click.stop="emit('remove-crop', crop.cropId)"
          />
        </div>
        <div class="crop-thumb" :class="{ 'crop-thumb--active': activeCropId === crop.cropId }">
          <img :src="crop.nodeImageUrl" class="crop-img" />
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<style scoped lang="scss">
.crop-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background 0.15s;

  &:hover {
    background: rgba(25, 118, 210, 0.04);
  }

  &--active {
    background: rgba(25, 118, 210, 0.08);
  }
}

.crop-thumb {
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border: 2px solid transparent;
  transition: border-color 0.15s;
  margin: 0 4px 4px;
  border-radius: 4px;

  &--active {
    border-color: #1976d2;
  }
}

.crop-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
