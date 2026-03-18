<script setup lang="ts">
import { PARAM_FIELDS } from 'src/constants/imgPrc';
import type { ParamFieldDef } from 'src/constants/imgPrc';
import type { PrcType } from 'src/types/imgPrcType';
import FilterTreeSelect from './FilterTreeSelect.vue';
import ParamField from './ParamField.vue';
import type { CropItem } from 'src/composables/useCropManager';
import type { TempStep } from 'src/composables/usePreviewManager';

defineProps<{
  cropList: CropItem[];
  activeCropId: string | null;
  tempSteps: TempStep[];
  expandedStepId: string | null;
  mode: string;
}>();

const emit = defineEmits<{
  (e: 'select-filter', prcType: PrcType, label: string): void;
  (e: 'create-crop'): void;
  (e: 'select-crop', cropId: string): void;
  (e: 'remove-crop', cropId: string): void;
  (e: 'remove-step', stepId: string): void;
  (e: 'expand-step', stepId: string | null): void;
  (e: 'param-change', stepId: string, key: string, value: unknown): void;
  (e: 'apply-to-canvas'): void;
}>();

function getStepFields(prcType: PrcType): ParamFieldDef[] {
  return PARAM_FIELDS[prcType] ?? [];
}
</script>

<template>
  <div class="zoom-side column">
    <!-- 필터 선택 -->
    <div style="border-bottom: 1px solid rgba(0, 0, 0, 0.08)">
      <div class="q-pa-xs">
        <FilterTreeSelect label="필터 추가" @select="(p, l) => emit('select-filter', p, l)" />
      </div>
    </div>

    <!-- Crop 목록 (아코디언) -->
    <q-expansion-item default-opened dense header-class="zoom-side__section-header">
      <template #header>
        <q-item-section avatar style="min-width: auto; padding-right: 4px">
          <q-icon name="crop" size="xs" color="grey-7" />
        </q-item-section>
        <q-item-section>
          <span class="text-body2 text-grey-7 text-weight-medium">Crop 목록 ({{ cropList.length }})</span>
        </q-item-section>
        <q-item-section side>
          <q-btn
            v-if="mode === 'explore'"
            flat dense size="xs" icon="content_cut" color="primary"
            @click.stop="emit('create-crop')"
          >
            <q-tooltip>현재 뷰포트 자르기</q-tooltip>
          </q-btn>
        </q-item-section>
      </template>

      <div v-if="cropList.length === 0" class="text-caption text-grey-5 text-center q-py-sm">
        Shift+드래그 또는 ✂ 버튼으로 영역 선택
      </div>
      <div v-for="crop in cropList" :key="crop.cropId" class="zoom-side__crop-item">
        <div class="row items-center q-px-xs q-pt-xs">
          <span
            class="text-caption ellipsis col cursor-pointer"
            :class="{ 'text-primary text-weight-bold': activeCropId === crop.cropId }"
            @click="emit('select-crop', crop.cropId)"
          >
            {{ crop.label }}
          </span>
          <q-btn flat round dense size="xs" icon="close" color="grey-6" @click="emit('remove-crop', crop.cropId)" />
        </div>
        <div
          class="zoom-side__crop-thumb cursor-pointer"
          :class="{ 'zoom-side__crop-thumb--active': activeCropId === crop.cropId }"
          @click="emit('select-crop', crop.cropId)"
        >
          <img :src="crop.nodeImageUrl" class="zoom-side__crop-img" />
        </div>
      </div>
    </q-expansion-item>

    <!-- 적용 필터 (아코디언) -->
    <q-expansion-item default-opened dense header-class="zoom-side__section-header">
      <template #header>
        <q-item-section avatar style="min-width: auto; padding-right: 4px">
          <q-icon name="layers" size="xs" color="grey-7" />
        </q-item-section>
        <q-item-section>
          <span class="text-body2 text-grey-7 text-weight-medium">적용 필터 ({{ tempSteps.length }})</span>
        </q-item-section>
      </template>

      <q-list dense separator>
        <q-expansion-item
          v-for="step in tempSteps"
          :key="step.id"
          :label="step.label"
          :model-value="expandedStepId === step.id"
          @update:model-value="emit('expand-step', $event ? step.id : null)"
          dense
          header-class="text-body2"
        >
          <template #header>
            <q-item-section>
              <q-item-label class="text-body2">{{ step.label }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat round dense size="xs" icon="close" color="negative" @click.stop="emit('remove-step', step.id)" />
            </q-item-section>
          </template>

          <div class="q-px-sm q-pb-sm">
            <ParamField
              v-for="field in getStepFields(step.prcType)"
              :key="field.key"
              :field="field"
              :model-value="step.parameters?.[field.key]"
              @update:model-value="emit('param-change', step.id, field.key, $event)"
            />
          </div>
        </q-expansion-item>
      </q-list>
    </q-expansion-item>

    <!-- 하단 버튼 -->
    <div
      v-if="tempSteps.length > 0"
      class="row col q-pa-xs q-gutter-xs items-end"
      style="border-top: 1px solid rgba(0, 0, 0, 0.08)"
    >
      <q-btn
        unelevated dense no-caps size="sm"
        label="캔버스에 반영" color="primary"
        class="col" icon="check"
        @click="emit('apply-to-canvas')"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.zoom-side {
  width: 240px;
  min-width: 240px;
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  background: #fafafa;

  :deep(.zoom-side__section-header) {
    padding: 4px 8px;
    min-height: 28px;
    border-bottom: 1px solid rgba(25, 118, 210, 0.2);
    background: #e8f0fe;
    color: #1565c0;
  }

  overflow: hidden;
}

.zoom-side__crop-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.zoom-side__crop-thumb {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border: 2px solid transparent;
  transition: border-color 0.15s;

  &--active {
    border-color: #1976d2;
  }
}

.zoom-side__crop-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
