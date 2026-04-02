<script setup lang="ts">
import type { ParamFieldDef } from 'src/constants/imgPrc';

const props = defineProps<{
  field: ParamFieldDef;
  modelValue: unknown;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: unknown): void;
}>();

// ── 슬라이더 판별 ─────────────────────────────────────────────────
function checkUseSlider(field: ParamFieldDef): boolean {
  if (field.min == null || field.max == null) return false;
  const range = (field.max - field.min) / (field.step ?? 1);
  return range >= 4;
}

// ── 마커 라벨 ─────────────────────────────────────────────────────
function niceInterval(min: number, max: number): number {
  const range = max - min;
  const rough = range / 6;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  const nice = residual <= 1.5 ? 1 : residual <= 3.5 ? 2 : residual <= 7.5 ? 5 : 10;
  return nice * mag;
}

function markerInterval(field: ParamFieldDef): number {
  if (['beta', 'delta'].includes(field.key)) return 85;
  else if ((field.max ?? 0) - (field.min ?? 0) == 255) return 51;

  const nice = niceInterval(field.min ?? 0, field.max ?? 100);
  const step = field.step ?? 1;
  return Math.max(step, Math.round(nice / step) * step);
}

function markerLabelsFn(field: ParamFieldDef) {
  const interval = markerInterval(field);
  return (val: number) => (val % interval === 0 ? String(val) : '');
}

const useSlider = computed(() => props.field.type === 'number' && checkUseSlider(props.field));
</script>

<template>
  <!-- 슬라이더: number + 범위 넓음 -->
  <div v-if="useSlider" class="param-field q-px-xs">
    <div class="row items-center justify-between q-mb-none">
      <span class="text-caption text-grey-7">{{ field.label }}</span>
      <span class="text-caption text-weight-medium">{{ modelValue }}</span>
    </div>
    <q-slider
      :model-value="(modelValue as number) ?? field.default"
      @update:model-value="emit('update:modelValue', $event)"
      :min="field.min"
      :max="field.max"
      :step="field.step"
      :marker-labels="markerLabelsFn(field)"
      :markers="markerInterval(field)"
      :label-value="`${modelValue}`"
      label
      dense
      color="primary"
      class="q-mb-xs"
    >
      <template #marker-label-group="{ markerList }">
        <div
          v-for="marker in markerList"
          :key="marker.index"
          :class="marker.classes"
          :style="(marker.style as any)"
          class="cursor-pointer"
          @click="emit('update:modelValue', marker.value)"
        >
          {{ marker.label }}
        </div>
      </template>
    </q-slider>
  </div>

  <!-- 숫자 입력: 범위 좁음 -->
  <q-input
    class="param-field"
    v-else-if="field.type === 'number'"
    :model-value="modelValue as number"
    @update:model-value="emit('update:modelValue', Number($event))"
    :label="field.label"
    type="number"
    :min="field.min"
    :max="field.max"
    :step="field.step"
    outlined
    dense
  />

  <!-- 셀렉트 -->
  <q-select
    class="param-field"
    v-else-if="field.type === 'select'"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    :label="field.label"
    :options="field.options"
    emit-value
    map-options
    outlined
    dense
  />
</template>
