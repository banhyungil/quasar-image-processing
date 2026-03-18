<script setup lang="ts">
import OsdViewer from './OsdViewer.vue';

const props = defineProps<{
  /** 노드 이미지 URL (첫 번째 항목) */
  nodeImageUrl: string;
  /** 각 step별 중간 결과 */
  steps: { prcType: string; imageSrc: string }[];
}>();

const emit = defineEmits<{
  (e: 'select', stepIndex: number): void;
}>();

// -1 = 노드 이미지, 0~ = step 인덱스
const selectedIndex = ref(-1);

const selectedSrc = computed(() => {
  if (selectedIndex.value < 0) return props.nodeImageUrl;
  return props.steps[selectedIndex.value]?.imageSrc ?? props.nodeImageUrl;
});

const selectedLabel = computed(() => {
  if (selectedIndex.value < 0) return '노드 이미지';
  const step = props.steps[selectedIndex.value];
  return step ? `${selectedIndex.value + 1}. ${step.prcType}` : '';
});
</script>

<template>
  <div class="timeline-layout">
    <!-- 메인 이미지 영역 -->
    <div class="timeline-main">
      <OsdViewer :src="selectedSrc" class="fit" />
      <span class="timeline-main__label">{{ selectedLabel }}</span>
    </div>

    <!-- 우측 세로 썸네일 목록 -->
    <div class="timeline-strip">
      <!-- 노드 이미지 -->
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

      <!-- step별 결과 -->
      <template v-for="(step, i) in steps" :key="i">
        <div
          class="timeline-strip__item cursor-pointer"
          :class="{ 'timeline-strip__item--active': selectedIndex === i }"
          @click="selectedIndex = i; emit('select', i)"
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
  </div>
</template>

<style scoped lang="scss">
.timeline-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

.timeline-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #f5f5f5;

  &__img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

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
</style>
