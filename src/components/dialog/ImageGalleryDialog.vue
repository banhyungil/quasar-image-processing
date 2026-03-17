<script setup lang="ts">
import { useQuasar } from 'quasar';
import * as imgPrcApi from 'src/apis/imgPrcApi';
import type { FileListResponse } from 'src/types/imgPrcType';

type TFile = FileListResponse['items'][number];

const $q = useQuasar();
const show = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  (e: 'select', file: TFile): void;
}>();

const items = ref<TFile[]>([]);
const loading = ref(false);
const hasMore = ref(false);
const nextCursor = ref<{ uploadedAt?: string; id?: string }>({});

// 검색 관련 상태
const searchQuery = ref('');

// 사이즈 필터 상태
type SizePreset = 'all' | 'lt1' | '1to5' | 'gt5' | 'custom';
const sizePresetOptions: { label: string; value: SizePreset }[] = [
  { label: '전체', value: 'all' },
  { label: '1MB 이하', value: 'lt1' },
  { label: '1~5MB', value: '1to5' },
  { label: '5MB 이상', value: 'gt5' },
  { label: '직접 입력', value: 'custom' },
];
const sizePreset = ref<SizePreset>('all');
const customMinMb = ref<number | null>(null);
const customMaxMb = ref<number | null>(null);

function getSizeFilter(): { minSize?: number; maxSize?: number } {
  switch (sizePreset.value) {
    case 'lt1':
      return { maxSize: 1 * 1024 * 1024 };
    case '1to5':
      return { minSize: 1 * 1024 * 1024, maxSize: 5 * 1024 * 1024 };
    case 'gt5':
      return { minSize: 5 * 1024 * 1024 };
    case 'custom':
      return {
        minSize: customMinMb.value != null ? customMinMb.value * 1024 * 1024 : undefined,
        maxSize: customMaxMb.value != null ? customMaxMb.value * 1024 * 1024 : undefined,
      };
    default:
      return {};
  }
}

// 업로드 관련 상태
const fileInputRef = ref<HTMLInputElement>();
const pendingFile = ref<File | null>(null);
const pendingPreview = ref<string | null>(null);
const pendingName = ref('');
const uploading = ref(false);

// 파일명 수정 관련 상태
const editingId = ref<string | null>(null);
const editingName = ref('');

async function load(reset = false) {
  if (loading.value) return;
  loading.value = true;

  try {
    const { minSize, maxSize } = getSizeFilter();
    const res = await imgPrcApi.getProcessingImage({
      limit: 20,
      search: searchQuery.value.trim() || undefined,
      minSize,
      maxSize,
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
  if (editingId.value) return;
  emit('select', file);
  show.value = false;
}

// 검색
function onSearch() {
  void load(true);
}

function onSizePresetChange() {
  if (sizePreset.value !== 'custom') {
    customMinMb.value = null;
    customMaxMb.value = null;
    void load(true);
  }
}

function onCustomSizeInput() {
  void load(true);
}

// 업로드 관련 함수
function onClickUpload() {
  fileInputRef.value?.click();
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !file.type.startsWith('image/')) return;

  pendingFile.value = file;
  pendingName.value = file.name.replace(/\.[^.]+$/, '');

  if (pendingPreview.value) URL.revokeObjectURL(pendingPreview.value);
  pendingPreview.value = URL.createObjectURL(file);
  input.value = '';
}

function cancelUpload() {
  pendingFile.value = null;
  pendingName.value = '';
  if (pendingPreview.value) {
    URL.revokeObjectURL(pendingPreview.value);
    pendingPreview.value = null;
  }
}

async function submitUpload() {
  if (!pendingFile.value || !pendingName.value.trim()) return;
  uploading.value = true;

  try {
    const ext = pendingFile.value.name.match(/\.[^.]+$/)?.[0] ?? '';
    const renamed = new File([pendingFile.value], `${pendingName.value.trim()}${ext}`, {
      type: pendingFile.value.type,
    });
    await imgPrcApi.uploadFile(renamed);
    cancelUpload();
    await load(true);
  } catch (err) {
    console.error('이미지 업로드 실패:', err);
  } finally {
    uploading.value = false;
  }
}

// 삭제
function onDelete(file: TFile, e: Event) {
  e.stopPropagation();

  $q.dialog({
    title: '이미지 삭제',
    message: `"${file.originNm}"을(를) 삭제하시겠습니까?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      try {
        await imgPrcApi.deleteFile(file.id);
        items.value = items.value.filter((f) => f.id !== file.id);

        void $q.notify({ type: 'positive', message: `"${file.originNm}" 삭제 완료` });
      } catch (err) {
        console.error('이미지 삭제 실패:', err);
        $q.notify({ type: 'negative', message: '이미지 삭제 실패' });
      }
    })();
  });
}

// 파일명 수정
function startEdit(file: TFile, e: Event) {
  e.stopPropagation();
  editingId.value = file.id;
  editingName.value = file.originNm.replace(/\.[^.]+$/, '');
}

async function submitEdit(file: TFile) {
  const trimmed = editingName.value.trim();
  if (!trimmed) {
    editingId.value = null;
    return;
  }

  const ext = file.originNm.match(/\.[^.]+$/)?.[0] ?? '';
  const newName = `${trimmed}${ext}`;

  if (newName === file.originNm) {
    editingId.value = null;
    return;
  }

  try {
    await imgPrcApi.renameFile(file.id, newName);
    const item = items.value.find((f) => f.id === file.id);
    if (item) {
      item.originNm = newName;
    }
    $q.notify({ type: 'positive', message: '파일명 수정 완료' });
  } catch (err) {
    console.error('파일명 수정 실패:', err);
    $q.notify({ type: 'negative', message: '파일명 수정 실패' });
  } finally {
    editingId.value = null;
  }
}

function cancelEdit() {
  editingId.value = null;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${bytes}B`;
}

watch(show, (val) => {
  if (val) {
    searchQuery.value = '';
    cancelUpload();
    cancelEdit();
    void load(true);
  }
});
</script>

<template>
  <q-dialog v-model="show">
    <q-card style="width: 600px; max-width: 90vw; max-height: 80vh">
      <q-card-section class="row items-center">
        <div class="text-h6">이미지 선택</div>
        <q-space />
        <q-btn v-close-popup flat round dense icon="close" />
      </q-card-section>

      <q-card-section class="q-pt-none" style="overflow-y: auto; max-height: 60vh">
        <!-- 업로드 영역 -->
        <div class="upload-area q-mb-md">
          <input
            ref="fileInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="onFileChange"
          />

          <div v-if="!pendingFile" class="upload-area__trigger" @click="onClickUpload">
            <q-icon name="add_photo_alternate" size="sm" color="grey-6" />
            <span class="text-grey-7">새 이미지 업로드</span>
          </div>

          <div v-else class="upload-area__pending">
            <img :src="pendingPreview ?? ''" class="upload-area__preview" />
            <div class="upload-area__form">
              <q-input
                v-model="pendingName"
                dense
                outlined
                label="파일명"
                class="q-mb-xs"
                :disable="uploading"
              />
              <div class="row q-gutter-xs">
                <q-btn
                  flat
                  dense
                  no-caps
                  label="취소"
                  color="grey-7"
                  size="sm"
                  :disable="uploading"
                  @click="cancelUpload"
                />
                <q-btn
                  unelevated
                  dense
                  no-caps
                  label="업로드"
                  color="primary"
                  size="sm"
                  :loading="uploading"
                  :disable="!pendingName.trim()"
                  @click="submitUpload"
                />
              </div>
            </div>
          </div>
        </div>

        <q-separator class="q-mb-sm" />

        <!-- 검색 + 사이즈 필터 -->
        <div class="row q-gutter-sm q-mb-sm">
          <q-input
            v-model="searchQuery"
            dense
            outlined
            placeholder="파일명 검색"
            clearable
            class="col"
            @keyup.enter="onSearch"
            @clear="onSearch"
          >
            <template #prepend>
              <q-icon name="search" size="xs" />
            </template>
            <template #append>
              <q-btn flat dense round icon="search" size="sm" @click="onSearch" />
            </template>
          </q-input>

          <q-select
            v-model="sizePreset"
            :options="sizePresetOptions"
            dense
            outlined
            emit-value
            map-options
            style="min-width: 120px"
            @update:model-value="onSizePresetChange"
          />
        </div>

        <!-- 직접 입력 사이즈 필터 -->
        <div v-if="sizePreset === 'custom'" class="row q-gutter-sm q-mb-sm">
          <q-input
            v-model.number="customMinMb"
            dense
            outlined
            type="number"
            placeholder="최소 (MB)"
            class="col"
            :min="0"
            @update:model-value="onCustomSizeInput"
          />
          <span class="self-center text-grey-6">~</span>
          <q-input
            v-model.number="customMaxMb"
            dense
            outlined
            type="number"
            placeholder="최대 (MB)"
            class="col"
            :min="0"
            @update:model-value="onCustomSizeInput"
          />
        </div>

        <!-- 기존 이미지 그리드 -->
        <q-linear-progress v-if="loading" indeterminate color="primary" class="q-mb-sm" />

        <div style="position: relative; min-height: 100px">
          <div v-if="items.length === 0 && !loading" class="text-center text-grey-5 q-pa-lg">
            {{ searchQuery ? '검색 결과가 없습니다' : '업로드된 이미지가 없습니다' }}
          </div>

          <div class="gallery-grid">
            <div v-for="file in items" :key="file.id" class="gallery-item" @click="onSelect(file)">
              <div class="gallery-item__img-wrap">
                <img :src="file.thumbnailUrl ?? ''" class="gallery-item__img" />
                <div class="gallery-item__size">{{ formatSize(file.sizeBytes) }}</div>
                <div class="gallery-item__actions">
                  <q-btn
                    flat
                    round
                    dense
                    size="xs"
                    icon="edit"
                    color="white"
                    @click="startEdit(file, $event)"
                  >
                    <q-tooltip>파일명 수정</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    size="xs"
                    icon="delete"
                    color="white"
                    @click="onDelete(file, $event)"
                  >
                    <q-tooltip>삭제</q-tooltip>
                  </q-btn>
                </div>
              </div>

              <!-- 파일명 표시 / 수정 -->
              <div v-if="editingId === file.id" class="gallery-item__edit" @click.stop>
                <q-input
                  v-model="editingName"
                  dense
                  outlined
                  autofocus
                  size="sm"
                  @keyup.enter="submitEdit(file)"
                  @keyup.escape="cancelEdit"
                  @blur="submitEdit(file)"
                />
              </div>
              <div v-else class="gallery-item__name ellipsis">{{ file.originNm }}</div>
            </div>
          </div>

          <div v-if="hasMore" class="text-center q-mt-md">
            <q-btn flat no-caps label="더 보기" color="primary" :loading="loading" @click="load()" />
          </div>

        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.upload-area {
  &__trigger {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    border: 2px dashed #ccc;
    border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.15s;

    &:hover {
      border-color: #1976d2;
    }
  }

  &__pending {
    display: flex;
    gap: 12px;
    padding: 8px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
  }

  &__preview {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
  }

  &__form {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
}

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

  &__img-wrap {
    position: relative;
  }

  &__img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    display: block;
    background: #f5f5f5;
  }

  &__size {
    position: absolute;
    bottom: 0;
    left: 0;
    padding: 2px 6px;
    font-size: 10px;
    color: white;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 0 6px 0 0;
    opacity: 0;
    transition: opacity 0.15s;
  }

  &__actions {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    gap: 2px;
    padding: 2px;
    opacity: 0;
    transition: opacity 0.15s;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 0 0 0 6px;
  }

  &:hover &__size,
  &:hover &__actions {
    opacity: 1;
  }

  &__name {
    font-size: 11px;
    padding: 4px 6px;
    color: #555;
    background: #fafafa;
  }

  &__edit {
    padding: 2px 4px;
    background: #fafafa;
  }
}
</style>
