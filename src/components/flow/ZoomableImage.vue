<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src: string;
    zoomPerScroll?: number;
    minZoom?: number;
    maxZoom?: number;
  }>(),
  { zoomPerScroll: 1.3, minZoom: 1, maxZoom: 10 },
);

const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const containerRef = ref<HTMLElement>();

const cIsZoomed = computed(() => scale.value > 1);

const transformStyle = computed(() => ({
  transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`,
  cursor: cIsZoomed.value ? 'grab' : 'pointer',
}));

function onWheel(e: WheelEvent) {
  e.preventDefault();
  e.stopPropagation();

  const rect = containerRef.value!.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;

  const oldScale = scale.value;
  const factor = e.deltaY < 0 ? props.zoomPerScroll : 1 / props.zoomPerScroll;
  const newScale = Math.min(props.maxZoom, Math.max(props.minZoom, oldScale * factor));

  // zoom toward cursor position
  translateX.value = offsetX - (offsetX - translateX.value) * (newScale / oldScale);
  translateY.value = offsetY - (offsetY - translateY.value) * (newScale / oldScale);
  scale.value = newScale;

  if (newScale <= 1) goHome();
}

// drag pan
const dragging = ref(false);
const dragStart = { x: 0, y: 0, tx: 0, ty: 0 };

function onPointerDown(e: PointerEvent) {
  if (!cIsZoomed.value) return;
  dragging.value = true;
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;
  dragStart.tx = translateX.value;
  dragStart.ty = translateY.value;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return;
  translateX.value = dragStart.tx + (e.clientX - dragStart.x);
  translateY.value = dragStart.ty + (e.clientY - dragStart.y);
}

function onPointerUp() {
  dragging.value = false;
}

function goHome() {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
}

// double click to reset
function onDblClick() {
  goHome();
}

// reset on src change
watch(() => props.src, goHome);

defineExpose({ goHome });
</script>

<template>
  <div
    ref="containerRef"
    class="zoomable-image"
    :class="{ nodrag: cIsZoomed, nowheel: cIsZoomed }"
    @wheel="onWheel"
    @dblclick="onDblClick"
  >
    <img
      :src="src"
      :style="transformStyle"
      class="zoomable-image__img"
      draggable="false"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    />
  </div>
</template>

<style scoped>
.zoomable-image {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.zoomable-image__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform-origin: 0 0;
  user-select: none;
}
</style>
