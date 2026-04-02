<script setup lang="ts">
import type { ProcessResponse } from 'src/apis/processApi';
import { API_HOST } from 'src/boot/axios';

defineProps<{
  processList: ProcessResponse[];
  activeProcessId: number | null;
}>();

const emit = defineEmits<{
  (e: 'load', process: ProcessResponse): void;
  (e: 'remove', processId: number): void;
}>();
</script>

<template>
  <q-scroll-area style="height: 100%">
    <div class="q-pa-sm">
      <div v-if="processList.length === 0" class="text-center text-caption text-grey-6 q-pa-md">
        처리된 이미지가 없습니다
      </div>
      <div
        v-for="proc in processList"
        :key="proc.id"
        class="row items-center no-wrap q-pa-xs q-mb-xs rounded-borders process-item"
        :class="activeProcessId === proc.id ? 'bg-light-blue-1' : 'bg-grey-1'"
      >
        <q-avatar square size="40px" class="q-mr-xs" style="flex-shrink: 0">
          <img
            v-if="proc.filePath"
            :src="`${API_HOST}/${proc.filePath}`"
            style="object-fit: cover"
          />
          <q-icon v-else name="image" color="grey-5" />
        </q-avatar>
        <div class="col cursor-pointer" @dblclick="emit('load', proc)">
          <div class="text-body2 ellipsis">{{ proc.nm }}</div>
          <div class="text-caption text-grey-6">
            {{ proc.steps.length }}단계
            <template v-if="proc.totalExecutionMs != null">
              · {{ proc.totalExecutionMs }}ms
            </template>
          </div>
        </div>
        <q-badge
          :color="proc.isLatest ? 'positive' : 'grey-5'"
          :label="proc.isLatest ? '최신' : '이전'"
          class="q-mr-xs"
        />
        <q-btn
          flat
          round
          dense
          size="xs"
          icon="delete"
          color="negative"
          @click.stop="emit('remove', proc.id)"
        >
          <q-tooltip>삭제</q-tooltip>
        </q-btn>
      </div>
    </div>
  </q-scroll-area>
</template>

<style scoped>
.process-item {
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
