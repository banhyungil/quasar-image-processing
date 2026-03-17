<script setup lang="ts">
import { PARAM_FIELDS } from 'src/constants/imgPrc';
import type { ParamFieldDef } from 'src/constants/imgPrc';
import type { PrcType } from 'src/types/imgPrcType';
import type { ProcessNodeData } from 'src/types/flowTypes';
import type { CustomFilter } from 'src/apis/customFilterApi';
import FilterTreeSelect from './FilterTreeSelect.vue';

const props = defineProps<{
  nodeData: ProcessNodeData;
  customFilters?: CustomFilter[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'apply', nodeData: ProcessNodeData): void;
  (e: 'change', parameters: Record<string, unknown>): void;
  (e: 'change-filter', prcType: PrcType, label: string, filterId?: string): void;
}>();

// 로컬 파라미터 복사본 (적용 전까지 원본에 영향 없음)
const localParams = ref<Record<string, unknown>>({ ...props.nodeData.parameters });

watch(
  () => props.nodeData,
  (nd) => {
    localParams.value = { ...nd.parameters };
  },
);

// 파라미터 변경 시 실시간 emit
watch(
  localParams,
  (params) => {
    emit('change', { ...params });
  },
  { deep: true },
);

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
}

/** 6개 이내의 깔끔한 숫자로 떨어지는 마커 간격을 계산 */
function niceInterval(min: number, max: number): number {
  const range = max - min;
  const rough = range / 6;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const residual = rough / mag;
  // 1, 2, 5, 10 중 가장 가까운 nice number 선택
  const nice = residual <= 1.5 ? 1 : residual <= 3.5 ? 2 : residual <= 7.5 ? 5 : 10;
  return nice * mag;
}

function markerInterval(field: ParamFieldDef): number {
  if (['beta', 'delta'].includes(field.key)) return 85;
  else if ((field.max ?? 0) - (field.min ?? 0) == 255) return 51;

  const nice = niceInterval(field.min ?? 0, field.max ?? 100);
  const step = field.step ?? 1;
  // step의 배수로 맞춤
  return Math.max(step, Math.round(nice / step) * step);
}

function markerLabelsFn(field: ParamFieldDef) {
  const interval = markerInterval(field);

  return (val: number) => {
    return val % interval === 0 ? String(val) : '';
  };
}

function checkUseSlider(field: ParamFieldDef): boolean {
  if (field.min == null || field.max == null) return false;
  const range = (field.max - field.min) / (field.step ?? 1);
  return range >= 4;
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
          @select="(prcType, label, filterId) => emit('change-filter', prcType, label, filterId)"
        />

        <template v-if="cFields.length === 0">
          <div class="text-caption text-grey-5 text-center q-pt-md">파라미터 없음</div>
        </template>

        <template v-for="field in cFields" :key="field.key">
          <!-- 슬라이더: number 타입이면서 범위가 4 이상 -->
          <div v-if="field.type === 'number' && checkUseSlider(field)" class="q-px-xs">
            <div class="row items-center justify-between q-mb-none">
              <span class="text-caption text-grey-7">{{ field.label }}</span>
              <span class="text-caption text-weight-medium">{{ localParams[field.key] }}</span>
            </div>
            <q-slider
              :model-value="(localParams[field.key] as number) ?? field.default"
              @update:model-value="localParams[field.key] = $event"
              :min="field.min"
              :max="field.max"
              :step="field.step"
              :marker-labels="markerLabelsFn(field)"
              :markers="markerInterval(field)"
              :label-value="`${localParams[field.key]}`"
              label
              dense
              color="primary"
              class="q-mb-xs"
            />
          </div>
          <!-- 숫자 입력: 범위가 좁은 number -->
          <q-input
            v-else-if="field.type === 'number'"
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
