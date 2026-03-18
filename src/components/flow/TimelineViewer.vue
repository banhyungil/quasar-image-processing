<script setup lang="ts">
import OsdViewer from './OsdViewer.vue';
import ZoomableImage from './ZoomableImage.vue';

const props = defineProps<{
  /** 노드 이미지 URL (첫 번째 항목) */
  nodeImageUrl: string;
  /** 각 step별 중간 결과 */
  steps: { prcType: string; imageSrc: string; executionMs?: number }[];
}>();

const emit = defineEmits<{
  (e: 'select', stepIndex: number): void;
}>();

type Layout = 'split' | 'scroll';
const layout = ref<Layout>('split');

// -1 = 노드 이미지, 0~ = step 인덱스
const selectedIndex = ref(-1);

const selectedSrc = computed(() => {
  if (selectedIndex.value < 0) return props.nodeImageUrl;
  return props.steps[selectedIndex.value]?.imageSrc ?? props.nodeImageUrl;
});

const selectedLabel = computed(() => {
  if (selectedIndex.value < 0) return '노드 이미지';
  const step = props.steps[selectedIndex.value];
  if (!step) return '';
  const ms = step.executionMs != null ? ` (${step.executionMs.toFixed(1)}ms)` : '';
  return `${selectedIndex.value + 1}. ${step.prcType}${ms}`;
});
</script>

<template>
  <div class="timeline-layout" :class="{ 'timeline-layout--column': layout === 'scroll' }">
    <!-- A. 메인 + 우측 썸네일 -->
    <template v-if="layout === 'split'">
      <div class="timeline-main">
        <OsdViewer :src="selectedSrc" class="fit" />
        <span class="timeline-main__label">{{ selectedLabel }}</span>
      </div>

      <div class="timeline-strip">
        <!-- 토글 (패널 상단) -->
        <div class="row" style="flex-shrink: 0; border-bottom: 1px solid rgba(0, 0, 0, 0.08)">
          <q-btn
            flat
            no-caps
            dense
            class="col"
            color="primary"
            icon="view_sidebar"
            label="포커스"
            @click="layout = 'split'"
          />
          <q-separator vertical />
          <q-btn
            flat
            no-caps
            dense
            class="col"
            color="grey-7"
            icon="view_day"
            label="전체"
            @click="layout = 'scroll'"
          />
        </div>
        <div
          class="timeline-strip__item"
          :class="{ 'timeline-strip__item--active': selectedIndex === -1 }"
          @click="selectedIndex = -1"
        >
          <img :src="nodeImageUrl" class="timeline-strip__img" />
          <div class="timeline-strip__label">원본</div>
        </div>

        <q-icon
          v-if="steps.length > 0"
          name="arrow_downward"
          size="xs"
          color="grey-5"
          class="timeline-strip__arrow"
        />

        <template v-for="(step, i) in steps" :key="i">
          <div
            class="timeline-strip__item cursor-pointer"
            :class="{ 'timeline-strip__item--active': selectedIndex === i }"
            @click="
              selectedIndex = i;
              emit('select', i);
            "
          >
            <img :src="step.imageSrc" class="timeline-strip__img" />
            <div class="timeline-strip__label">
              <span class="text-weight-medium">{{ i + 1 }}.</span> {{ step.prcType }}
            </div>
          </div>
          <q-icon
            v-if="i < steps.length - 1"
            name="arrow_downward"
            size="xs"
            color="grey-5"
            class="timeline-strip__arrow"
          />
        </template>
      </div>
    </template>

    <!-- B. 전체 세로 스크롤 -->
    <div v-else class="timeline-scroll">
      <!-- 토글 (우상단 absolute) -->
      <q-btn-toggle
        v-model="layout"
        flat
        dense
        size="md"
        toggle-color="primary"
        class="timeline-scroll__toggle"
        :options="[
          { value: 'split', icon: 'view_sidebar' },
          { value: 'scroll', icon: 'view_day' },
        ]"
      />
      <!-- 노드 이미지 -->
      <div class="timeline-scroll__card">
        <ZoomableImage :src="nodeImageUrl" class="timeline-scroll__img" />
        <div class="timeline-scroll__label">노드 이미지</div>
      </div>

      <q-icon
        v-if="steps.length > 0"
        name="arrow_downward"
        size="sm"
        color="grey-5"
        class="q-my-xs"
      />

      <!-- step별 결과 -->
      <template v-for="(step, i) in steps" :key="i">
        <div class="timeline-scroll__card">
          <ZoomableImage :src="step.imageSrc" class="timeline-scroll__img" />
          <div class="timeline-scroll__label">
            <span class="text-weight-medium">{{ i + 1 }}.</span> {{ step.prcType }}
          </div>
        </div>
        <q-icon
          v-if="i < steps.length - 1"
          name="arrow_downward"
          size="sm"
          color="grey-5"
          class="q-my-xs"
        />
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.timeline-layout {
  display: flex;
  width: 100%;
  height: 100%;

  &--column {
    flex-direction: column;
  }
}

// ── A. 메인 + 우측 썸네일 ──────────────────────────────
.timeline-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #f5f5f5;

  &__label {
    position: absolute;
    bottom: 8px;
    left: 50%;
    transform: translateX(-50%);
    padding: 2px 10px;
    font-size: 12px;
    color: white;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
    pointer-events: none;
  }
}

.timeline-strip {
  width: 120px;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px;
  overflow-y: auto;
  border-left: 1px solid rgba(0, 0, 0, 0.1);
  background: #fafafa;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 2px;
  }

  &__item {
    width: 100%;
    background: white;
    border: 2px solid transparent;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color 0.15s;

    &:hover {
      border-color: rgba(25, 118, 210, 0.4);
    }

    &--active {
      border-color: #1976d2;
    }
  }

  &__img {
    width: 100%;
    height: 70px;
    object-fit: contain;
    display: block;
    background: #f0f0f0;
  }

  &__label {
    padding: 2px 4px;
    font-size: 10px;
    color: #555;
    text-align: center;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__arrow {
    flex-shrink: 0;
  }
}

// ── B. 전체 세로 스크롤 ──────────────────────────────
.timeline-scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  overflow-y: auto;
  background: #f5f5f5;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  &__toggle {
    position: sticky;
    top: 0;
    align-self: flex-end;
    z-index: 5;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 4px;
    margin-bottom: 8px;
  }

  &__card {
    width: 100%;
    max-width: 1200px;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  &__img {
    width: 100%;
    object-fit: contain;
    display: block;
    background: #fafafa;
  }

  &__label {
    padding: 6px 12px;
    font-size: 13px;
    color: #555;
    text-align: center;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    background: white;
  }
}
</style>
