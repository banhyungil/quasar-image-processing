<script setup lang="ts">
import * as imgPrcApi from 'src/apis/imgPrcApi';
import type { FileListResponse } from 'src/types/imgPrcType';

type TFile = FileListResponse['items'][number];

const show = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  (e: 'select', file: TFile): void;
}>();

const items = ref<TFile[]>([]);
const loading = ref(false);
const hasMore = ref(false);
const nextCursor = ref<{ uploadedAt?: string; id?: string }>({});

async function load(reset = false) {
  if (loading.value) return;
  loading.value = true;

  try {
    const res = await imgPrcApi.getProcessingImage({
      limit: 20,
      cursorUploadedAt: reset ? undefined : nextCursor.value.uploadedAt,
      cursorId: reset ? undefined : nextCursor.value.id,
    });
    if (reset) items.value = [];
    items.value.push(...res.items);
    hasMore.value = res.hasMore;
    nextCursor.value = {
      uploadedAt: res.nextCursorUploadedAt ?? undefined,
      id: res.nextCursorId ?? undefined,
    };
  } catch (err) {
    console.error('이미지 목록 조회 실패:', err);
  } finally {
    loading.value = false;
  }
}

function onSelect(file: TFile) {
  emit('select', file);
  show.value = false;
}

watch(show, (val) => {
  if (val) void load(true);
});
</script>

<template>
  <q-dialog v-model="show">
    <q-card style="width: 600px; max-width: 90vw; max-height: 80vh">
      <q-card-section class="row items-center">
        <div class="text-h6">기존 이미지 선택</div>
        <q-space />
        <q-btn v-close-popup flat round dense icon="close" />
      </q-card-section>

      <q-card-section class="q-pt-none" style="overflow-y: auto; max-height: 60vh">
        <div v-if="items.length === 0 && !loading" class="text-center text-grey-5 q-pa-lg">
          업로드된 이미지가 없습니다
        </div>

        <div class="gallery-grid">
          <div v-for="file in items" :key="file.id" class="gallery-item" @click="onSelect(file)">
            <img :src="file.thumbnailUrl ?? ''" class="gallery-item__img" />
            <div class="gallery-item__name ellipsis">{{ file.originNm }}</div>
          </div>
        </div>

        <div v-if="hasMore" class="text-center q-mt-md">
          <q-btn flat no-caps label="더 보기" color="primary" :loading="loading" @click="load()" />
        </div>

        <div v-if="loading && items.length === 0" class="text-center q-pa-lg">
          <q-spinner size="md" color="primary" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.gallery-item {
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.15s;

  &:hover {
    border-color: #1976d2;
  }

  &__img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    display: block;
    background: #f5f5f5;
  }

  &__name {
    font-size: 11px;
    padding: 4px 6px;
    color: #555;
    background: #fafafa;
  }
}
</style>
