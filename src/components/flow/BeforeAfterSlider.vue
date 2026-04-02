<script setup lang="ts">
const props = defineProps<{
  beforeSrc: string;
  afterSrc: string;
}>();

const containerRef = ref<HTMLElement>();
const sliderPos = ref(50); // 0~100 퍼센트
const dragging = ref(false);

function updatePosition(clientX: number) {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const x = clientX - rect.left;
  sliderPos.value = Math.max(0, Math.min(100, (x / rect.width) * 100));
}

function onPointerDown(e: PointerEvent) {
  dragging.value = true;
  updatePosition(e.clientX);
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return;
  updatePosition(e.clientX);
}

function onPointerUp() {
  dragging.value = false;
}
</script>

<template>
  <div
    ref="containerRef"
    class="before-after-slider ba-slider"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
  >
    <!-- Before (노드 이미지) -->
    <img :src="props.beforeSrc" class="ba-slider__img" />

    <!-- After (처리 이미지) — clip으로 슬라이더 우측만 표시 -->
    <img
      :src="props.afterSrc"
      class="ba-slider__img ba-slider__img--after"
      :style="{ clipPath: `inset(0 0 0 ${sliderPos}%)` }"
    />

    <!-- 슬라이더 라인 -->
    <div class="ba-slider__line" :style="{ left: `${sliderPos}%` }">
      <div class="ba-slider__handle">
        <q-icon name="drag_indicator" size="xs" color="white" />
      </div>
    </div>

    <!-- 라벨 -->
    <span class="ba-slider__label ba-slider__label--before">노드</span>
    <span class="ba-slider__label ba-slider__label--after">처리</span>
  </div>
</template>

<style scoped lang="scss">
.ba-slider {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: ew-resize;
  user-select: none;

  &__img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;

    &--after {
      z-index: 1;
    }
  }

  &__line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: white;
    z-index: 2;
    transform: translateX(-50%);
    box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
  }

  &__handle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  }

  &__label {
    position: absolute;
    top: 8px;
    z-index: 3;
    padding: 2px 8px;
    font-size: 11px;
    color: white;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;

    &--before {
      left: 8px;
    }

    &--after {
      right: 8px;
    }
  }
}
</style>
