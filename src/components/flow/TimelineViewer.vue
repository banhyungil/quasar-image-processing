<script setup lang="ts">
defineProps<{
  /** 노드 이미지 URL (첫 번째 카드) */
  nodeImageUrl: string;
  /** 각 step별 중간 결과 */
  steps: { prcType: string; imageSrc: string }[];
}>();

const emit = defineEmits<{
  /** step 카드 클릭 시 해당 인덱스 전달 */
  (e: 'select', stepIndex: number): void;
}>();

const scrollRef = ref<HTMLElement>();

// 마우스 휠로 가로 스크롤
function onWheel(e: WheelEvent) {
  if (!scrollRef.value) return;
  e.preventDefault();
  scrollRef.value.scrollLeft += e.deltaY;
}
</script>

<template>
  <div ref="scrollRef" class="timeline" @wheel="onWheel">
    <!-- 노드 이미지 (원본) -->
    <div class="timeline__card">
      <img :src="nodeImageUrl" class="timeline__img" />
      <div class="timeline__label">노드 이미지</div>
    </div>

    <q-icon
      v-if="steps.length > 0"
      name="arrow_forward"
      size="xs"
      color="grey-5"
      class="timeline__arrow"
    />

    <!-- step별 결과 -->
    <template v-for="(step, i) in steps" :key="i">
      <div class="timeline__card cursor-pointer" @click="emit('select', i)">
        <img :src="step.imageSrc" class="timeline__img" />
        <div class="timeline__label">
          <span class="text-weight-medium">{{ i + 1 }}.</span> {{ step.prcType }}
        </div>
      </div>
      <q-icon
        v-if="i < steps.length - 1"
        name="arrow_forward"
        size="xs"
        color="grey-5"
        class="timeline__arrow"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
.timeline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  background: #f5f5f5;

  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  &__card {
    flex-shrink: 0;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    transition: border-color 0.15s;

    &:hover {
      border-color: #1976d2;
    }
  }

  &__img {
    width: 240px;
    height: 180px;
    object-fit: contain;
    display: block;
    background: #fafafa;
  }

  &__label {
    padding: 4px 8px;
    font-size: 12px;
    color: #555;
    text-align: center;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    background: white;
  }

  &__arrow {
    flex-shrink: 0;
  }
}
</style>
