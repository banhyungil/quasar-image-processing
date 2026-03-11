<script setup lang="ts">
import { FN_LIST, FN_OPTIONS_MAP } from 'src/constants/imgPrc';
import type { FunctionKey } from 'src/constants/imgPrc';
import type { PrcType } from 'src/types/imgPrcType';
import * as customFilterApi from 'src/apis/customFilterApi';
import type { CustomFilter } from 'src/apis/customFilterApi';

const CATEGORY_ICONS: Record<FunctionKey, string> = {
  filtering: 'filter_alt',
  blurring: 'blur_on',
  findContour: 'category',
  brightness: 'brightness_6',
  threshold: 'tonality',
};

const emit = defineEmits<{
  (e: 'add-filter', prcType: PrcType, label: string): void;
  (e: 'add-custom-filter', cf: CustomFilter): void;
  (e: 'drag-start', event: DragEvent, prcType: PrcType, label: string): void;
  (e: 'open-editor', cf?: CustomFilter): void;
  (e: 'delete-custom-filter', id: string): void;
}>();

// ── 커스텀 필터 목록 ────────────────────────────────────────────────────────
const customFilters = ref<CustomFilter[]>([]);

async function loadCustomFilters() {
  try {
    const res = await customFilterApi.getCustomFilters();
    customFilters.value = res.items;
  } catch (err) {
    console.error('커스텀 필터 목록 조회 실패:', err);
  }
}

async function onDeleteCustomFilter(id: string) {
  try {
    await customFilterApi.deleteCustomFilter(id);
    customFilters.value = customFilters.value.filter((cf) => cf.id !== id);
  } catch (err) {
    console.error('커스텀 필터 삭제 실패:', err);
  }
}

function onCustomFilterDragStart(event: DragEvent, cf: CustomFilter) {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData('application/vueflow-prctype', 'custom');
  event.dataTransfer.setData('application/vueflow-label', cf.nm);
  event.dataTransfer.setData('application/vueflow-filter-id', cf.id);
  event.dataTransfer.effectAllowed = 'move';
}

onMounted(loadCustomFilters);

defineExpose({ loadCustomFilters });
</script>

<template>
  <q-scroll-area style="height: 100%">
    <q-list>
      <q-expansion-item
        v-for="fn in FN_LIST"
        :key="fn.value"
        :icon="CATEGORY_ICONS[fn.value]"
        :label="fn.label"
        default-opened
        expand-separator
      >
        <div
          v-for="option in FN_OPTIONS_MAP[fn.value]"
          :key="option.value"
          class="q-px-sm q-py-xs"
          draggable="true"
          @dragstart="emit('drag-start', $event, option.value, option.label)"
        >
          <q-card flat bordered class="filter-card">
            <q-card-section class="q-pa-xs row items-center no-wrap q-gutter-x-xs">
              <q-icon
                :name="CATEGORY_ICONS[fn.value]"
                size="xs"
                color="primary"
                class="q-ml-xs"
              />
              <div class="col text-caption ellipsis">{{ option.label }}</div>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="add"
                color="positive"
                @click="emit('add-filter', option.value, option.label)"
              >
                <q-tooltip>노드에 추가</q-tooltip>
              </q-btn>
            </q-card-section>
          </q-card>
        </div>
      </q-expansion-item>

      <!-- 커스텀 필터 카테고리 -->
      <q-expansion-item icon="code" label="커스텀" default-opened expand-separator>
        <div class="q-px-sm q-py-xs">
          <q-btn
            flat
            dense
            no-caps
            icon="add"
            label="새 커스텀 필터"
            class="full-width"
            @click="emit('open-editor')"
          />
        </div>

        <div
          v-for="cf in customFilters"
          :key="cf.id"
          class="q-px-sm q-py-xs"
          draggable="true"
          @dragstart="onCustomFilterDragStart($event, cf)"
        >
          <q-card flat bordered class="filter-card">
            <q-card-section class="q-pa-xs row items-center no-wrap q-gutter-x-xs">
              <q-icon name="code" size="xs" color="orange" class="q-ml-xs" />
              <div class="col text-caption ellipsis">{{ cf.nm }}</div>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="edit"
                @click.stop="emit('open-editor', cf)"
              >
                <q-tooltip>수정</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="delete"
                color="negative"
                @click.stop="onDeleteCustomFilter(cf.id)"
              >
                <q-tooltip>삭제</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="add"
                color="positive"
                @click="emit('add-custom-filter', cf)"
              >
                <q-tooltip>노드에 추가</q-tooltip>
              </q-btn>
            </q-card-section>
          </q-card>
        </div>
      </q-expansion-item>
    </q-list>
  </q-scroll-area>
</template>

<style scoped>
.filter-card {
  cursor: grab;
}

.filter-card:active {
  cursor: grabbing;
}
</style>
