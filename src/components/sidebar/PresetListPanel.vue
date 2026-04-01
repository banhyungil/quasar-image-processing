<script setup lang="ts">
import type { PresetResponse } from 'src/apis/presetApi';

defineProps<{
  presets: PresetResponse[];
  activePresetId: number | null;
}>();

const emit = defineEmits<{
  (e: 'load', preset: PresetResponse): void;
  (e: 'remove', presetId: number): void;
}>();
</script>

<template>
  <q-scroll-area style="height: 100%">
    <div class="q-pa-sm">
      <div
        v-if="presets.length === 0"
        class="text-center text-caption text-grey-6 q-pa-md"
      >
        저장된 Preset이 없습니다
      </div>
      <div
        v-for="preset in presets"
        :key="preset.id"
        class="row items-center no-wrap q-pa-xs q-mb-xs rounded-borders preset-item"
        :class="activePresetId === preset.id ? 'bg-light-blue-1' : 'bg-grey-1'"
      >
        <div class="col text-body2 ellipsis cursor-pointer" @click="emit('load', preset)">
          {{ preset.nm }}
        </div>
        <q-btn
          flat
          round
          dense
          size="xs"
          icon="delete"
          color="negative"
          @click.stop="emit('remove', preset.id)"
        >
          <q-tooltip>삭제</q-tooltip>
        </q-btn>
      </div>
    </div>
  </q-scroll-area>
</template>

<style scoped>
.preset-item {
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
