<template>
  <q-page class="q-pa-md column fit q-gutter-md min-h-0 overflow-hidden">
    <div class="row q-gutter-x-md justify-between h-16 mx-0">
      <div class="row items-center col-12 col-md-8 left mx-0">
        <q-select
          v-model="selectedFunction"
          :options="FN_LIST"
          label="함수 목록"
          outlined
          emit-value
          map-options
          class="w-32"
        />
        <q-option-group
          v-model="selectedOption"
          :options="optionList"
          type="radio"
          color="primary"
          size="xs"
          inline
        />
      </div>
      <div class="row items-center q-gutter-x-xs">
        <q-btn
          @click="onProcessImage"
          class="h-fit text-sm"
          icon="functions"
          label="처리"
          color="primary"
          :disabled="originalFile == null"
          unelevated
        />
        <q-btn
          class="h-fit text-sm"
          icon="save"
          label="저장"
          color="secondary"
          unelevated
          :disabled="originalFile == null"
        />
      </div>
    </div>

    <!-- col 적용시 flex: 1 1 0% 효과 -->
    <div class="row col min-h-0 overflow-hidden">
      <div class="row col-9 q-col-gutter-x-md min-h-0">
        <!-- 기본에서 12칸 전부 사용, col-md-6으로 나누어 6칸씩 사용, md면 태블릿,모바일 환경 사이즈 -->
        <div class="col-12 col-md-6">
          <q-card flat bordered class="q-pa-md full-height min-h-0 column q-gutter-md">
            <div class="row justify-between">
              <div class="text-subtitle1 text-weight-medium q-mb-md">원본 이미지</div>
              <q-btn
                size="sm"
                color="primary"
                label="초기화"
                :disabled="originalFile == null"
                unelevated
                @click="setOriginalFile(null)"
              />
            </div>

            <input
              ref="originalInputRef"
              type="file"
              accept="image/*"
              class="hidden"
              @change="onOriginalInputChange"
            />

            <div
              v-if="originalPreviewUrl == null"
              class="col rounded-borders overflow-hidden cursor-pointer column"
              :class="isDragOver ? 'bg-blue-1' : 'bg-grey-2'"
              @click="openOriginalPicker"
              @dragover.prevent
              @dragenter.prevent="isDragOver = true"
              @dragleave.prevent="isDragOver = false"
              @drop.prevent="onOriginalDrop"
            >
              <div class="fit row items-center justify-center text-grey-7">
                이미지를 드래그하거나 클릭해서 업로드하세요.
              </div>
            </div>
            <!-- NOTE flex: <flex-grow> <flex-shrink> <flex-basis> -->
            <div
              v-else
              class="col min-h-0 rounded-borders overflow-hidden cursor-pointer column"
              style="flex: 1 1 0%"
            >
              <ZoomImg :src="originalPreviewUrl" class="fit" :zoom-scale="3" :step="1" />
            </div>
          </q-card>
        </div>

        <div class="col-12 col-md-6">
          <q-card flat bordered class="q-pa-md full-height">
            <div class="text-subtitle1 text-weight-medium q-mb-sm">처리 이미지</div>
          </q-card>
        </div>
      </div>
      <div class="col-3 min-h-0">
        <q-scroll-area class="fit">
          <q-list class="column q-gutter-y-sm">
            <q-card v-for="i in 5" :key="i" flat bordered class="q-pa-md">
              <div class="text-subtitle1 text-weight-medium q-mb-sm">Result {{ i }}</div>
              <div>result</div>
            </q-card>
          </q-list>
        </q-scroll-area>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import * as imgPrcApi from 'src/apis/imgPrcApi';
import type { PrcType } from 'src/apis/imgPrcApi';
import { ZoomImg } from 'vue3-zoomer';
type FunctionKey = 'filtering' | 'blurring' | 'findContour' | 'brightness' | 'threshold';

const FN_LIST = [
  { label: '필터링', value: 'filtering' },
  { label: '블러링', value: 'blurring' },
  { label: 'Find Contour', value: 'findContour' },
  { label: '밝기 변환', value: 'brightness' },
  { label: '이진화', value: 'threshold' },
] as const;

const FN_OPTIONS_MAP: Record<FunctionKey, Array<{ label: string; value: PrcType }>> = {
  filtering: [
    { label: '소벨 (Sobel)', value: 'sobel' },
    { label: '프르윗 (Prewitt)', value: 'prewitt' },
    { label: '라플라시안 (Laplacian)', value: 'laplacian' },
    { label: '가우시안 (Gaussian)', value: 'gaussian' },
  ],
  blurring: [
    { label: '블러 (Blur)', value: 'blur' },
    { label: '가우시안 블러 (Gaussian Blur)', value: 'gaussianBlur' },
    { label: '중앙값 블러 (Median Blur)', value: 'medianBlur' },
    { label: '양방향 필터 (BilateralFilter)', value: 'bilateralFilter' },
  ],
  findContour: [{ label: 'Find Contour', value: 'findContour' }],
  brightness: [
    { label: '밝기 증가 (+)', value: 'plus' },
    { label: '밝기 감소 (-)', value: 'minus' },
  ],
  threshold: [
    { label: '일반 (Binary)', value: 'binary' },
    { label: 'Inverse', value: 'inverse' },
    { label: 'Tozero', value: 'tozero' },
    { label: 'TozeroInverse', value: 'tozeroInverse' },
  ],
};

const selectedFunction = ref<FunctionKey>('filtering');
const selectedOption = ref<PrcType>(FN_OPTIONS_MAP.filtering[0]!.value);
const originalFile = ref<File | null>(null);
const originalPreviewUrl = ref<string | null>(null);
const originalInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

const optionList = computed(() => FN_OPTIONS_MAP[selectedFunction.value]);

watch(selectedFunction, (newFunction) => {
  selectedOption.value = FN_OPTIONS_MAP[newFunction][0]!.value;
});

async function onProcessImage() {
  const form = new FormData();
  form.append('file', originalFile.value!);
  form.append('function', selectedFunction.value);
  form.append('option', selectedOption.value);

  const res = await imgPrcApi.imageProcessing({
    file: originalFile.value!,
    prcType: selectedOption.value,
  });
}

function setOriginalFile(file: File | null) {
  if (file == null) {
    originalFile.value = null;
    if (originalPreviewUrl.value) {
      URL.revokeObjectURL(originalPreviewUrl.value);
      originalPreviewUrl.value = null;
    }
    return;
  }

  if (!file.type.startsWith('image/')) {
    return;
  }

  originalFile.value = file;

  if (originalPreviewUrl.value) {
    // 임시 URL 해제(메모리 해제)
    URL.revokeObjectURL(originalPreviewUrl.value);
  }

  // 임시 URL 생성 (Blob URL)
  originalPreviewUrl.value = URL.createObjectURL(file);
}

function openOriginalPicker() {
  originalInputRef.value?.click();
}

function onOriginalInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0] ?? null;
  setOriginalFile(file);
}

function onOriginalDrop(event: DragEvent) {
  isDragOver.value = false;
  const file = event.dataTransfer?.files?.[0] ?? null;
  setOriginalFile(file);
}

onBeforeUnmount(() => {
  if (originalPreviewUrl.value) {
    URL.revokeObjectURL(originalPreviewUrl.value);
  }
});
</script>

<style scoped>
.min-h-0 {
  min-height: 0;
}

:deep(.vz-zoomimg-img-container) {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

:deep(.vz-zoomimg-img) {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
