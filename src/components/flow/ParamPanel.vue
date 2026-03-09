<script setup lang="ts">
import { PARAM_FIELDS } from 'src/constants/imgPrc';
import type { ParamFieldDef } from 'src/constants/imgPrc';
import type { PrcType } from 'src/types/imgPrcType';
import type { ProcessNodeData } from 'src/types/flowTypes';
import FilterTreeSelect from './FilterTreeSelect.vue';

const props = defineProps<{
  nodeData: ProcessNodeData;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', nodeData: ProcessNodeData): void;
  (e: 'change-filter', prcType: PrcType, label: string): void;
}>();

// 로컬 파라미터 복사본 (적용 전까지 원본에 영향 없음)
const localParams = ref<Record<string, unknown>>({ ...props.nodeData.parameters });

watch(
  () => props.nodeData,
  (nd) => {
    localParams.value = { ...nd.parameters };
  },
);

const cFields = computed<ParamFieldDef[]>(() => {
  return PARAM_FIELDS[props.nodeData.algorithmNm] ?? [];
});

function getDefaultParams(): Record<string, unknown> {
  const defs = PARAM_FIELDS[props.nodeData.algorithmNm];
  if (!defs) return {};
  return Object.fromEntries(defs.map((f) => [f.key, f.default]));
}

function resetParams() {
  localParams.value = getDefaultParams();
}

function apply() {
  emit('apply', { ...props.nodeData, parameters: { ...localParams.value } });
}
</script>

<template>
  <div class="column param-panel">
    <!-- 헤더 -->
    <div
      class="row items-center no-wrap q-px-sm q-py-xs"
      style="border-bottom: 1px solid rgba(0, 0, 0, 0.12); flex-shrink: 0"
    >
      <div class="col text-body2 text-weight-medium q-ml-xs">파라미터</div>
      <q-btn flat round dense size="xs" icon="close" @click="emit('close')" />
    </div>

    <!-- 바디 -->
    <q-scroll-area class="col">
      <div class="q-pa-sm column q-gutter-sm">
        <FilterTreeSelect
          :model-value="nodeData.algorithmNm"
          :label="nodeData.label"
          @select="(prcType, label) => emit('change-filter', prcType, label)"
        />

        <template v-if="cFields.length === 0">
          <div class="text-caption text-grey-5 text-center q-pt-md">파라미터 없음</div>
        </template>

        <template v-for="field in cFields" :key="field.key">
          <q-input
            v-if="field.type === 'number'"
            :model-value="localParams[field.key] as number"
            @update:model-value="localParams[field.key] = Number($event)"
            :label="field.label"
            type="number"
            :min="field.min"
            :max="field.max"
            :step="field.step"
            outlined
            dense
          />
          <q-select
            v-else-if="field.type === 'select'"
            :model-value="localParams[field.key]"
            @update:model-value="localParams[field.key] = $event"
            :label="field.label"
            :options="field.options"
            emit-value
            map-options
            outlined
            dense
          />
        </template>

        <div class="row q-gutter-xs q-mt-sm">
          <q-btn
            flat
            dense
            size="sm"
            label="초기화"
            icon="restart_alt"
            color="grey-7"
            class="col"
            @click="resetParams"
          />
          <q-btn
            unelevated
            dense
            size="sm"
            label="적용"
            icon="check"
            color="primary"
            class="col"
            @click="apply"
          />
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<style scoped>
.param-panel {
  width: 240px;
  min-width: 240px;
  border-left: 1px solid rgba(0, 0, 0, 0.12);
  height: 100%;
}
</style>
