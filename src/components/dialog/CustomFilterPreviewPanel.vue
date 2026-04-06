<script setup lang="ts">
import { toRef, onUnmounted } from 'vue';
import type { ParamFieldDef } from 'src/constants/imgPrc';
import type { AppNode } from 'src/types/flowTypes';
import { useCustomFilterPreview } from 'src/composables/useCustomFilterPreview';

const props = defineProps<{
  code: string;
  paramDefs: ParamFieldDef[];
  canvasNodes?: AppNode[];
}>();

const {
  imageSourceType,
  uploadedFile,
  selectedCanvasNodeId,
  testParams,
  resultUrl,
  executing,
  errorMessage,
  canvasImages,
  originalPreviewUrl,
  onFileSelected,
  executePreview,
  cleanup,
} = useCustomFilterPreview(
  toRef(props, 'code'),
  toRef(props, 'paramDefs'),
  toRef(props, 'canvasNodes'),
);

const hasImage = computed(
  () =>
    (imageSourceType.value === 'upload' && !!uploadedFile.value) ||
    (imageSourceType.value === 'canvas' && !!selectedCanvasNodeId.value),
);

onUnmounted(cleanup);
</script>

<template>
  <div class="column full-height q-gutter-y-sm">
    <!-- 이미지 소스 선택 -->
    <q-btn-toggle
      v-model="imageSourceType"
      dense
      no-caps
      spread
      toggle-color="primary"
      :options="[
        { label: '파일 업로드', value: 'upload' },
        { label: '캔버스 노드', value: 'canvas' },
      ]"
    />

    <!-- 파일 업로드 -->
    <q-file
      v-if="imageSourceType === 'upload'"
      :model-value="uploadedFile"
      label="이미지 선택"
      outlined
      dense
      accept="image/*"
      @update:model-value="onFileSelected"
    />

    <!-- 캔버스 노드 선택 -->
    <q-select
      v-else
      v-model="selectedCanvasNodeId"
      :options="canvasImages"
      option-value="nodeId"
      option-label="label"
      label="노드 선택"
      outlined
      dense
      emit-value
      map-options
      :disable="canvasImages.length === 0"
    >
      <template v-if="canvasImages.length === 0" #no-option>
        <q-item><q-item-section class="text-grey">캔버스에 이미지가 없습니다</q-item-section></q-item>
      </template>
    </q-select>

    <!-- 테스트 파라미터 -->
    <div v-if="paramDefs.length > 0" class="param-controls" style="max-height: 180px; overflow-y: auto">
      <div class="text-caption text-weight-medium q-mb-xs">테스트 파라미터</div>
      <div v-for="p in paramDefs" :key="p.key" class="row items-center q-mb-xs">
        <div class="col-4 text-caption ellipsis">{{ p.label || p.key }}</div>
        <div class="col-8">
          <q-slider
            v-if="p.type === 'number'"
            :model-value="(testParams[p.key] as number) ?? 0"
            @update:model-value="testParams[p.key] = $event"
            :min="p.min ?? 0"
            :max="p.max ?? 100"
            :step="p.step ?? 1"
            label
            label-always
            dense
          />
          <q-select
            v-else-if="p.type === 'select'"
            :model-value="testParams[p.key]"
            @update:model-value="testParams[p.key] = $event"
            :options="p.options ?? []"
            emit-value
            map-options
            dense
            outlined
            options-dense
          />
        </div>
      </div>
    </div>

    <!-- 실행 버튼 -->
    <q-btn
      color="primary"
      label="실행"
      icon="play_arrow"
      :loading="executing"
      :disable="!hasImage"
      no-caps
      unelevated
      @click="executePreview"
    />

    <!-- 에러 배너 -->
    <q-banner v-if="errorMessage" class="bg-red-1 text-red" rounded dense>
      <template #avatar><q-icon name="error" color="red" /></template>
      <span class="text-caption">{{ errorMessage }}</span>
    </q-banner>

    <!-- 원본 / 결과 비교 -->
    <div class="col row q-gutter-xs" style="min-height: 0; overflow: hidden">
      <div class="col-6 column items-center" style="min-height: 0">
        <div class="text-caption text-grey-6 q-mb-xs">원본</div>
        <img
          v-if="originalPreviewUrl"
          :src="originalPreviewUrl"
          class="preview-img"
        />
        <div v-else class="text-caption text-grey-4 q-mt-md">이미지를 선택하세요</div>
      </div>
      <div class="col-6 column items-center" style="min-height: 0">
        <div class="text-caption text-grey-6 q-mb-xs">결과</div>
        <img
          v-if="resultUrl"
          :src="resultUrl"
          class="preview-img"
        />
        <div v-else class="text-caption text-grey-4 q-mt-md">실행 후 표시됩니다</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
}
</style>
