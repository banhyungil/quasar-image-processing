<script setup lang="ts">
import { useSettingsStore } from 'stores/settings-store';

import OsdViewer from './OsdViewer.vue';

const settingsStore = useSettingsStore();

defineProps<{
  src: string | null;
  dziUrl?: string;
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const isMaximized = ref(false);
const zoomLevel = ref(1);

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
</script>

<template>
  <Teleport to="body">
    <div
      ref="cardRef"
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

      <!-- 이미지 영역 -->
      <div class="col" style="min-height: 0; position: relative">
        <OsdViewer v-if="dziUrl" :dzi-url="dziUrl" :zoom-per-scroll="settingsStore.defaultZoomPerScroll" class="fit" @zoom="zoomLevel = $event" />
        <OsdViewer v-else-if="src" :src="src" :zoom-per-scroll="settingsStore.defaultZoomPerScroll" class="fit" @zoom="zoomLevel = $event" />
        <div v-else class="fit column items-center justify-center text-grey-5">
          이미지가 없습니다
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
</style>
