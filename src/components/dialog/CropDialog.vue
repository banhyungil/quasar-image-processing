<script setup lang="ts">
import OsdViewer from 'src/components/flow/OsdViewer.vue';
import { computeViewportStatus } from 'src/composables/useCropManager';
import type { Viewport } from 'src/types/imgPrcType';
import type { CropItem } from 'src/composables/useCropManager';
import { useSettingsStore } from 'src/stores/settings-store';

const settingsStore = useSettingsStore();

defineProps<{
  src: string;
  dziUrl?: string;
  cropList: CropItem[];
}>();

const emit = defineEmits<{
  (e: 'save-viewport', viewport: Viewport): void;
  (e: 'region-select', viewport: Viewport): void;
}>();

const show = defineModel<boolean>({ required: true });

const osdViewerComp = ref<InstanceType<typeof OsdViewer> | null>(null);
const zoomLevel = ref(1);
const viewportSize = ref<{ w: number; h: number } | null>(null);

const cViewportStatus = computed(() => computeViewportStatus(viewportSize.value));

// Shift+드래그로 영역 선택 → 부모에 위임
function onRegionSelect(viewport: Viewport) {
  emit('region-select', viewport);
}

// 현재 뷰포트로 Crop 저장 → 부모에 위임
function saveViewportCrop() {
  const viewport = osdViewerComp.value?.getViewportPx();
  if (!viewport) return;
  emit('save-viewport', viewport);
}
</script>

<template>
  <q-dialog class="crop-dialog" v-model="show" maximized transition-show="fade" transition-hide="fade">
    <q-card class="column" style="background: #1a1a1a">
      <!-- 헤더 -->
      <q-bar class="bg-primary text-white">
        <q-icon name="crop" />
        <span>Crop 영역 지정</span>
        <q-space />
        <span
          v-if="viewportSize"
          class="text-caption q-mr-md"
          :class="{
            'text-positive': cViewportStatus === 'ok',
            'text-warning': cViewportStatus === 'too-small',
            'text-negative': cViewportStatus === 'too-large',
          }"
        >
          {{ viewportSize.w }} x {{ viewportSize.h }}
        </span>
        <span class="text-caption q-mr-md">{{ zoomLevel.toFixed(1) }}x</span>
        <q-btn dense flat icon="content_cut" @click="saveViewportCrop">
          <q-tooltip>현재 뷰포트로 Crop 저장</q-tooltip>
        </q-btn>
        <q-btn dense flat icon="close" v-close-popup />
      </q-bar>

      <!-- 안내 -->
      <div class="text-center text-grey-5 text-caption q-py-xs" style="background: #2a2a2a">
        Shift+드래그로 영역 선택 또는 확대 후 ✂ 버튼으로 현재 뷰포트 저장
      </div>

      <!-- OSD 뷰어 -->
      <div class="col" style="min-height: 0">
        <OsdViewer
          ref="osdViewerComp"
          v-bind="dziUrl ? { dziUrl } : { src }"
          :zoom-per-scroll="settingsStore.defaultZoomPerScroll"
          class="fit"
          @zoom="zoomLevel = $event"
          @viewport-change="viewportSize = { w: $event.w, h: $event.h }"
          @region-select="onRegionSelect"
        />
      </div>

      <!-- Crop 목록 (하단) -->
      <div
        v-if="cropList.length > 0"
        class="row q-pa-xs q-gutter-xs"
        style="background: #2a2a2a; overflow-x: auto; flex-shrink: 0"
      >
        <div
          v-for="crop in cropList"
          :key="crop.cropId"
          class="crop-thumb-mini"
        >
          <img :src="crop.nodeImageUrl" style="max-height: 60px; object-fit: contain" />
          <q-badge floating color="dark" :label="crop.label" />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.crop-thumb-mini {
  position: relative;
  background: #333;
  border-radius: 4px;
  padding: 2px;
  cursor: pointer;
}
</style>
