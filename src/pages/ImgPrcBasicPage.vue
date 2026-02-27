<script setup lang="ts">
import * as imgPrcApi from 'src/apis/imgPrcApi';
import type { FileSaveResponse, PrcType } from 'src/apis/imgPrcApi';
import { ZoomImg } from 'vue3-zoomer';
import { DEFAULT_KERNEL_SIZES, FN_LIST, FN_OPTIONS_MAP } from 'src/constants/imgPrc';
import type { FunctionKey } from 'src/constants/imgPrc';

//ANCHOR - Hooks
onMounted(async () => {
  await fetchSavedImages();
});

//ANCHOR - Start
const selectedFunction = ref<FunctionKey>('filtering');
const selectedOption = ref<PrcType>(FN_OPTIONS_MAP.filtering[0]!.value);
/** 처리된 옵션 */
const prcOption = ref<PrcType | null>(null);
const originalFile = ref<File | null>(null);
const originalPreviewUrl = ref<string | null>(null);
const originalInputRef = ref<HTMLInputElement | null>(null);
const resultBlob = ref<Blob | null>(null);
const resultPreviewUrl = ref<string | null>(null);
const isDragOver = ref(false);
const savedImages = ref<FileSaveResponse[]>([]);
const nextCursorUploadedAt = ref<string | null>(null);
const nextCursorId = ref<string | null>(null);
const hasNextPage = ref(true);
const isFetchingSavedImages = ref(false);

const kernelSize = ref(DEFAULT_KERNEL_SIZES[selectedOption.value] ?? 3);

const cOptionList = computed(() => FN_OPTIONS_MAP[selectedFunction.value]);
const cDisableKernelSize = computed(() => !(selectedOption.value in DEFAULT_KERNEL_SIZES));

watch(selectedFunction, (newFunction) => {
  selectedOption.value = FN_OPTIONS_MAP[newFunction][0]!.value;
});

watch(selectedOption, (newOption) => {
  const defaultSize = DEFAULT_KERNEL_SIZES[newOption];
  if (defaultSize !== undefined) {
    kernelSize.value = defaultSize;
  }
});

async function onProcessImage() {
  if (!originalFile.value) {
    return;
  }

  resultBlob.value = await imgPrcApi.imageProcessing({
    file: originalFile.value,
    prcType: selectedOption.value,
    kernelSize: kernelSize.value,
  });

  if (!(resultBlob.value instanceof Blob)) {
    return;
  }

  if (resultPreviewUrl.value) {
    URL.revokeObjectURL(resultPreviewUrl.value);
  }
  resultPreviewUrl.value = URL.createObjectURL(resultBlob.value);

  prcOption.value = selectedOption.value;
}

async function onSavePrcImage() {
  if (!resultBlob.value || !originalFile.value) {
    return;
  }

  const saved = await imgPrcApi.saveProcessingImage({
    blob: resultBlob.value,
    originFileNm: originalFile.value.name,
    prcType: selectedOption.value,
  });

  savedImages.value.unshift(saved);
}

async function fetchSavedImages() {
  if (isFetchingSavedImages.value || !hasNextPage.value) {
    return { hasMore: false };
  }

  isFetchingSavedImages.value = true;
  try {
    const res = await imgPrcApi.getProcessingImage({
      limit: 20,
      cursorUploadedAt: nextCursorUploadedAt.value,
      cursorId: nextCursorId.value,
    });

    savedImages.value.push(...res.items);
    nextCursorUploadedAt.value = res.nextCursorUploadedAt;
    nextCursorId.value = res.nextCursorId;
    hasNextPage.value = !!(res.nextCursorUploadedAt && res.nextCursorId);

    return { hasMore: hasNextPage.value };
  } finally {
    isFetchingSavedImages.value = false;
  }
}

async function onSavedImageInfiniteLoad(_index: number, done: (stop?: boolean) => void) {
  const { hasMore } = await fetchSavedImages();
  done(!hasMore);
}

function setOriginalFile(file: File | null) {
  // 초기화
  if (file == null) {
    originalFile.value = null;
    if (originalPreviewUrl.value) {
      URL.revokeObjectURL(originalPreviewUrl.value);
      originalPreviewUrl.value = null;
    }
    prcOption.value = null;
    if (originalInputRef.value) {
      originalInputRef.value.value = '';
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

// input[type="file"]는 스타일링이 어려우므로
// 커스텀 버튼과 드롭 영역을 만들어서 파일 선택을 유도
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
</script>

<template>
  <q-page class="q-pa-md column fit q-gutter-md min-h-0 overflow-hidden">
    <div class="row justify-end">
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
          @click="onSavePrcImage"
          class="h-fit text-sm"
          icon="save"
          label="저장"
          color="secondary"
          unelevated
          :disabled="resultBlob == null"
        />
      </div>
    </div>
    <div class="row q-gutter-x-md justify-between h-16 mx-0">
      <div class="row items-center q-gutter-md left mx-0 w-full">
        <q-input
          v-model.number="kernelSize"
          type="number"
          label="커널 사이즈"
          :disable="cDisableKernelSize"
          outlined
          dense
          :min="3"
          :step="2"
          :rules="[(val: number) => val % 2 !== 0 || '홀수만 입력 가능합니다']"
          lazy-rules
          style="width: 140px"
        />
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
          :options="cOptionList"
          type="radio"
          color="primary"
          size="xs"
          inline
        />
      </div>
    </div>

    <!-- col 적용시 flex: 1 1 0% 효과 -->
    <div class="row col min-h-0 overflow-hidden">
      <!--
      gutter 적용시 자식 요소에 padding 더하는 방식
      자식 요소가 border 처리 된 경우 간격이 문제가 생기므로
      border 요소는 래핑 처리 필요
      -->
      <div class="row col-9 q-col-gutter-x-sm min-h-0">
        <!-- 기본에서 12칸 전부 사용, col-md-6으로 나누어 6칸씩 사용, md면 태블릿,모바일 환경 사이즈 -->
        <div class="col-12 col-md-6 min-h-0 column">
          <q-card flat bordered class="q-pa-md col column">
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

        <div class="col-12 col-md-6 min-h-0 column">
          <q-card flat bordered class="q-pa-md col">
            <div class="text-subtitle1 text-weight-medium q-mb-sm">처리 이미지 {{ prcOption }}</div>
            <ZoomImg :src="resultPreviewUrl" class="fit" :zoom-scale="3" :step="1" />
          </q-card>
        </div>
      </div>
      <div class="col-3 min-h-0">
        <q-scroll-area class="fit saved-image-scroll">
          <q-list class="column q-gutter-y-sm q-pa-xs">
            <q-card
              v-for="item in savedImages"
              :key="item.id"
              flat
              bordered
              class="q-pa-sm column items-stretch"
            >
              <div class="rounded-borders" style="aspect-ratio: 1">
                <img :src="item.path" style="width: 100%; height: 100%; object-fit: contain" />
              </div>
              <div class="q-mt-xs q-mb-none" style="min-height: 32px">
                <div class="text-caption ellipsis">{{ item.originNm }}</div>
                <div class="text-caption text-grey-7">{{ item.options.prcType }}</div>
              </div>
            </q-card>
            <q-infinite-scroll
              :offset="120"
              scroll-target=".saved-image-scroll .q-scrollarea__container"
              @load="onSavedImageInfiniteLoad"
            >
              <template #loading>
                <div class="row justify-center q-my-md">
                  <q-spinner-dots color="primary" size="28px" />
                </div>
              </template>
            </q-infinite-scroll>
          </q-list>
        </q-scroll-area>
      </div>
    </div>
  </q-page>
</template>

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
