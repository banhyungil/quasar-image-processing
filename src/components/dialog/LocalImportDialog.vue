<script setup lang="ts">
import { useQuasar } from 'quasar';
import * as filesApi from 'src/apis/filesApi';
import type { LocalFileInfo, FileUploadRes } from 'src/types/imgPrcType';

const $q = useQuasar();

const show = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  (e: 'registered', files: FileUploadRes[]): void;
}>();

// ── 상태 ────────────────────────────────────────────────────────────────────
const dirPath = ref('');
const recursive = ref(false);
const useThumbnail = ref(true);
const scanning = ref(false);
const registering = ref(false);
const scannedItems = ref<LocalFileInfo[]>([]);
const selectedPaths = ref<Set<string>>(new Set());

// ── 스캔 ────────────────────────────────────────────────────────────────────
async function onScan() {
  const trimmed = dirPath.value.trim();
  if (!trimmed) {
    $q.notify({ type: 'warning', message: '디렉토리 경로를 입력하세요' });
    return;
  }

  scanning.value = true;
  scannedItems.value = [];
  selectedPaths.value.clear();

  try {
    const res = await filesApi.scanLocalDir(trimmed, { recursive: recursive.value, useThumbnail: useThumbnail.value });
    scannedItems.value = res.items;

    // 미등록 파일만 자동 선택
    for (const item of res.items) {
      if (!item.alreadyRegistered) {
        selectedPaths.value.add(item.path);
      }
    }

    if (res.items.length === 0) {
      $q.notify({ type: 'info', message: '이미지 파일이 없습니다' });
    }
  } catch (err) {
    console.error('스캔 실패:', err);
    $q.notify({ type: 'negative', message: '디렉토리 스캔 실패' });
  } finally {
    scanning.value = false;
  }
}

// ── 선택 토글 ───────────────────────────────────────────────────────────────
function toggleSelect(path: string) {
  if (selectedPaths.value.has(path)) {
    selectedPaths.value.delete(path);
  } else {
    selectedPaths.value.add(path);
  }
}

function toggleAll() {
  const selectable = scannedItems.value.filter((i) => !i.alreadyRegistered);
  if (selectedPaths.value.size === selectable.length) {
    selectedPaths.value.clear();
  } else {
    selectedPaths.value = new Set(selectable.map((i) => i.path));
  }
}

const selectableCount = computed(
  () => scannedItems.value.filter((i) => !i.alreadyRegistered).length,
);
const allSelected = computed(
  () => selectableCount.value > 0 && selectedPaths.value.size === selectableCount.value,
);

// ── 등록 ────────────────────────────────────────────────────────────────────
async function onRegister() {
  if (selectedPaths.value.size === 0) return;

  registering.value = true;
  try {
    const res = await filesApi.registerLocalFiles([...selectedPaths.value]);
    $q.notify({
      type: 'positive',
      message: `${res.items.length}개 파일 등록 완료`,
    });
    emit('registered', res.items);
    show.value = false;
  } catch (err) {
    console.error('등록 실패:', err);
    $q.notify({ type: 'negative', message: '파일 등록 실패' });
  } finally {
    registering.value = false;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <q-dialog class="local-import-dialog" v-model="show" maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="column no-wrap" style="height: 100%">
      <!-- 헤더 -->
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">로컬 이미지 가져오기</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <!-- 스캔 입력 -->
      <q-card-section class="q-pt-sm q-pb-none">
        <div class="row items-center q-gutter-sm">
          <q-input
            v-model="dirPath"
            dense
            outlined
            placeholder="디렉토리 경로 (예: C:/images)"
            class="col"
            @keyup.enter="onScan"
          />
          <q-checkbox v-model="recursive" label="하위 폴더" dense />
          <q-checkbox v-model="useThumbnail" label="썸네일 표시" dense />
          <q-btn
            label="스캔"
            color="primary"
            :loading="scanning"
            :disable="!dirPath.trim()"
            @click="onScan"
          />
        </div>
      </q-card-section>

      <!-- 파일 목록 -->
      <q-card-section class="col q-pt-sm" style="overflow: auto">
        <div v-if="scannedItems.length === 0 && !scanning" class="text-center text-grey-5 q-pa-xl">
          디렉토리를 스캔하면 이미지 목록이 표시됩니다
        </div>

        <template v-else>
          <!-- 전체 선택 -->
          <div v-if="scannedItems.length > 0" class="row items-center q-mb-sm">
            <q-checkbox
              :model-value="allSelected"
              :indeterminate="selectedPaths.size > 0 && !allSelected"
              label="전체 선택"
              dense
              @update:model-value="toggleAll"
            />
            <q-space />
            <span class="text-caption text-grey-6">
              {{ selectedPaths.size }} / {{ selectableCount }}개 선택
            </span>
          </div>

          <!-- 그리드 -->
          <div class="local-import-grid">
            <div
              v-for="item in scannedItems"
              :key="item.path"
              class="local-import-item"
              :class="{
                'local-import-item--selected': selectedPaths.has(item.path),
                'local-import-item--registered': item.alreadyRegistered,
              }"
              @click="!item.alreadyRegistered && toggleSelect(item.path)"
            >
              <img
                v-if="item.thumbnailUrl"
                :src="item.thumbnailUrl"
                class="local-import-item__img"
                loading="lazy"
              />
              <div v-else class="local-import-item__img flex items-center justify-center bg-grey-2">
                <q-icon name="image" size="md" color="grey-5" />
              </div>
              <div class="local-import-item__info">
                <div class="text-caption ellipsis">{{ item.fileName }}</div>
                <div class="text-caption text-grey-6">
                  {{ item.width }}x{{ item.height }} &middot; {{ formatSize(item.sizeBytes) }}
                </div>
              </div>
              <q-badge
                v-if="item.alreadyRegistered"
                color="grey-5"
                text-color="white"
                label="등록됨"
                class="local-import-item__badge"
              />
              <q-checkbox
                v-else
                :model-value="selectedPaths.has(item.path)"
                class="local-import-item__check"
                dense
                @click.stop
                @update:model-value="toggleSelect(item.path)"
              />
            </div>
          </div>
        </template>
      </q-card-section>

      <!-- 하단 버튼 -->
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="취소" v-close-popup />
        <q-btn
          color="primary"
          label="등록"
          :loading="registering"
          :disable="selectedPaths.size === 0"
          @click="onRegister"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped lang="scss">
.local-import-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.local-import-item {
  position: relative;
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.15s;

  &--selected {
    border-color: #1976d2;
  }

  &--registered {
    opacity: 0.5;
    cursor: default;
  }

  &__img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    display: block;
  }

  &__info {
    padding: 4px 6px;
  }

  &__badge {
    position: absolute;
    top: 4px;
    right: 4px;
  }

  &__check {
    position: absolute;
    top: 2px;
    left: 2px;
  }
}
</style>
