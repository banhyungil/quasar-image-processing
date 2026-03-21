<script setup lang="ts">
import { PARAM_FIELDS } from 'src/constants/imgPrc';
import type { ParamFieldDef } from 'src/constants/imgPrc';
import type { FilterType } from 'src/types/imgPrcType';
import type { ProcessNodeData } from 'src/types/flowTypes';
import type { CustomFilter } from 'src/apis/customFilterApi';
import FilterTreeSelect from './FilterTreeSelect.vue';
import ParamField from './ParamField.vue';

const props = withDefaults(
  defineProps<{
    nodeData?: ProcessNodeData;
    customFilters?: CustomFilter[];
  }>(),
  {
    nodeData: () => ({
      algorithmNm: 'blur',
      label: '',
      enabled: false,
      parameters: {},
    }),
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', nodeData: ProcessNodeData): void;
  (e: 'change', parameters: Record<string, unknown>): void;
  (e: 'change-filter', filterType: FilterType, label: string, filterId?: string): void;
}>();

// 로컬 파라미터 복사본 (적용 전까지 원본에 영향 없음)
const localParams = ref<Record<string, unknown>>({ ...props.nodeData.parameters });

watch(
  () => props.nodeData,
  (nd) => {
    localParams.value = { ...nd.parameters };
  },
);

function onParamUpdate(key: string, value: unknown) {
  localParams.value[key] = value;
  emit('change', { ...localParams.value });
}

const cFields = computed<ParamFieldDef[]>(() => {
  if (props.nodeData.algorithmNm === 'custom') {
    // 커스텀 필터: filterId로 커스텀 필터 조회 → params 기반 동적 폼 생성
    const filterId = props.nodeData.parameters?.filterId as string | undefined;
    if (filterId && props.customFilters) {
      const cf = props.customFilters.find((c) => c.id === filterId);
      if (cf && Array.isArray(cf.params)) {
        return cf.params as unknown as ParamFieldDef[];
      }
    }
    return [];
  }
  return PARAM_FIELDS[props.nodeData.algorithmNm] ?? [];
});

function getDefaultParams(): Record<string, unknown> {
  const defaults: Record<string, unknown> = Object.fromEntries(
    cFields.value.map((f) => [f.key, f.default]),
  );
  // 커스텀 필터: filterId 유지
  if (props.nodeData.algorithmNm === 'custom' && props.nodeData.parameters?.filterId) {
    defaults.filterId = props.nodeData.parameters.filterId as string;
  }
  return defaults;
}

function resetParams() {
  localParams.value = getDefaultParams();
  emit('change', { ...localParams.value });
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
          :custom-filters="customFilters"
          @select="
            (filterType, label, filterId) => emit('change-filter', filterType, label, filterId)
          "
        />

        <template v-if="cFields.length === 0">
          <div class="text-caption text-grey-5 text-center q-pt-md">파라미터 없음</div>
        </template>

        <ParamField
          v-for="field in cFields"
          :key="field.key"
          :field="field"
          :model-value="localParams[field.key]"
          @update:model-value="onParamUpdate(field.key, $event)"
        />

        <div class="row q-gutter-xs q-mt-sm">
          <q-btn
            outline
            dense
            size="sm"
            label="초기화"
            icon="restart_alt"
            color="orange-7"
            class="col"
            @click="resetParams"
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
