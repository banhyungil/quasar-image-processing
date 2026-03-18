<script setup lang="ts">
import OpenSeadragon from 'openseadragon';

const props = withDefaults(
  defineProps<{
    dziUrl?: string;
    src?: string;
    zoomPerScroll?: number;
  }>(),
  { zoomPerScroll: 1.5 },
);

const emit = defineEmits<{
  (e: 'zoom', level: number): void;
  (e: 'viewport-change', viewport: { x: number; y: number; w: number; h: number }): void;
  (e: 'region-select', viewport: { x: number; y: number; w: number; h: number }): void;
}>();

const container = ref<HTMLElement>();
let viewer: OpenSeadragon.Viewer | null = null;
let scrollZoomTimer: ReturnType<typeof setTimeout> | null = null;

function isZoomAnimating(): boolean {
  if (!viewer) return false;
  return viewer.viewport.getZoom(true) !== viewer.viewport.getZoom(false);
}

function stopZoomAnimation() {
  if (!viewer) return;
  viewer.viewport.zoomTo(viewer.viewport.getZoom(true), undefined, true);
  viewer.viewport.panTo(viewer.viewport.getCenter(true), true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (viewer as any).gestureSettingsMouse.scrollToZoom = false;
  if (scrollZoomTimer) clearTimeout(scrollZoomTimer);
  scrollZoomTimer = setTimeout(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (viewer) (viewer as any).gestureSettingsMouse.scrollToZoom = true;
  }, 500);
}

function buildTileSource() {
  if (props.dziUrl) return { tileSource: props.dziUrl };
  return { type: 'image', url: props.src! };
}

// ── Shift+드래그 영역 선택 ──────────────────────────────────────────────────
const selecting = ref(false);
const selectionRect = ref<{ left: string; top: string; width: string; height: string } | null>(
  null,
);
let selStart: { x: number; y: number } | null = null;

function clientToImagePx(clientX: number, clientY: number): { x: number; y: number } | null {
  if (!viewer) return null;
  const tiledImage = viewer.world.getItemAt(0);
  if (!tiledImage) return null;

  const containerRect = container.value!.getBoundingClientRect();
  const webPoint = new OpenSeadragon.Point(
    clientX - containerRect.left,
    clientY - containerRect.top,
  );
  const viewportPoint = viewer.viewport.pointFromPixel(webPoint);
  const imageSize = tiledImage.getContentSize();
  const scale = imageSize.x;

  return {
    x: Math.round(viewportPoint.x * scale),
    y: Math.round(viewportPoint.y * scale),
  };
}

function onSelectionStart(e: MouseEvent) {
  if (!viewer) return;

  selecting.value = true;
  selStart = { x: e.clientX, y: e.clientY };
  const rect = container.value!.getBoundingClientRect();
  selectionRect.value = {
    left: `${e.clientX - rect.left}px`,
    top: `${e.clientY - rect.top}px`,
    width: '0px',
    height: '0px',
  };

  viewer.addHandler('canvas-drag', onCanvasDrag);
  viewer.addHandler('canvas-release', onCanvasRelease);
  viewer.addHandler('canvas-key', onCanvasKey);
}

function cancelSelection() {
  selecting.value = false;
  selectionRect.value = null;
  selStart = null;

  if (viewer) {
    viewer.removeHandler('canvas-drag', onCanvasDrag);
    viewer.removeHandler('canvas-release', onCanvasRelease);
    viewer.removeHandler('canvas-key', onCanvasKey);
    viewer.setMouseNavEnabled(true);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onCanvasDrag(e: any) {
  console.log('onCanvasDrag');
  const orig: MouseEvent | undefined = e.originalEvent;
  if (!orig || !selStart || !container.value) return;
  e.preventDefaultAction = true;

  const rect = container.value.getBoundingClientRect();
  const x1 = Math.max(0, Math.min(selStart.x, orig.clientX) - rect.left);
  const y1 = Math.max(0, Math.min(selStart.y, orig.clientY) - rect.top);
  const x2 = Math.min(rect.width, Math.max(selStart.x, orig.clientX) - rect.left);
  const y2 = Math.min(rect.height, Math.max(selStart.y, orig.clientY) - rect.top);

  selectionRect.value = {
    left: `${x1}px`,
    top: `${y1}px`,
    width: `${x2 - x1}px`,
    height: `${y2 - y1}px`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onCanvasKey(e: any) {
  console.log('onCanvasKey');
  const orig: KeyboardEvent | undefined = e.originalEvent;
  if (orig?.key === 'Escape') {
    e.preventDefaultAction = true;
    cancelSelection();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onCanvasRelease(e: any) {
  console.log('onCanvasRelease');
  const orig: MouseEvent | undefined = e.originalEvent;
  if (!selStart || !viewer) {
    cancelSelection();
    return;
  }

  const p1 = clientToImagePx(selStart.x, selStart.y);
  const p2 = orig ? clientToImagePx(orig.clientX, orig.clientY) : null;

  cancelSelection();

  if (!p1 || !p2) return;

  const tiledImage = viewer.world.getItemAt(0);
  if (!tiledImage) return;
  const imageSize = tiledImage.getContentSize();
  const imgW = imageSize.x;
  const imgH = imageSize.y;

  // clamp + 최소 크기 체크
  const x = Math.max(0, Math.min(p1.x, p2.x));
  const y = Math.max(0, Math.min(p1.y, p2.y));
  const w = Math.min(imgW - x, Math.abs(p2.x - p1.x));
  const h = Math.min(imgH - y, Math.abs(p2.y - p1.y));

  if (w < 10 || h < 10) return; // 너무 작은 선택 무시

  emit('region-select', { x, y, w, h });
}

// ── 마운트 ──────────────────────────────────────────────────────────────────
onMounted(() => {
  viewer = OpenSeadragon({
    element: container.value!,
    tileSources: buildTileSource(),
    crossOriginPolicy: 'Anonymous',
    showNavigator: true,
    navigatorPosition: 'BOTTOM_RIGHT',
    showNavigationControl: true,
    minZoomLevel: 0.5,
    maxZoomLevel: 20,
    animationTime: 0.3,
    zoomPerScroll: props.zoomPerScroll,
    prefixUrl: '/node_modules/openseadragon/build/openseadragon/images/',
  });

  // 네비게이션 버튼 툴팁 한글화
  const tooltipLabels = ['확대', '축소', '홈(Esc)', '전체화면'];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buttons: OpenSeadragon.Button[] | undefined = (viewer as any).buttonGroup?.buttons;
  buttons?.forEach((btn, i) => {
    if (tooltipLabels[i]) {
      btn.tooltip = tooltipLabels[i];
      btn.element.title = tooltipLabels[i];
    }
  });

  viewer.addHandler('zoom', (e) => {
    emit('zoom', e.zoom);
    const vp = getViewportPx();
    if (vp) emit('viewport-change', vp);
  });

  viewer.addHandler('pan', () => {
    const vp = getViewportPx();
    if (vp) emit('viewport-change', vp);
  });

  viewer.addHandler('canvas-click', (e) => {
    if (isZoomAnimating()) {
      stopZoomAnimation();
      e.preventDefaultAction = true;
    }
  });

  viewer.addHandler('canvas-press', (e) => {
    const orig = e.originalEvent as PointerEvent;
    if (orig?.shiftKey) {
      console.log('Shift+드래그 시작');
      onSelectionStart(orig);
      return;
    }
  });

  // Shift+드래그 시 OSD의 기본 드래그를 차단
  viewer.addHandler('canvas-drag', (e) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((e as any).originalEvent?.shiftKey) {
      e.preventDefaultAction = true;
    }
  });
});

onBeforeUnmount(() => {
  viewer?.destroy();
  viewer = null;
});

function goHome() {
  if (!viewer) return;
  stopZoomAnimation();
  viewer.viewport.goHome();
}

function getViewportPx(): { x: number; y: number; w: number; h: number } | null {
  if (!viewer) return null;
  const tiledImage = viewer.world.getItemAt(0);
  if (!tiledImage) return null;

  const bounds = viewer.viewport.getBounds();
  const imageSize = tiledImage.getContentSize();
  const imgW = imageSize.x;
  const imgH = imageSize.y;
  const scale = imgW;

  const rawX = bounds.x * scale;
  const rawY = bounds.y * scale;
  const rawW = bounds.width * scale;
  const rawH = bounds.height * scale;

  const x = Math.max(0, Math.round(rawX));
  const y = Math.max(0, Math.round(rawY));
  const w = Math.min(imgW - x, Math.round(rawW));
  const h = Math.min(imgH - y, Math.round(rawH));

  return { x, y, w: Math.max(1, w), h: Math.max(1, h) };
}

function isAtHome(): boolean {
  if (!viewer) return true;
  return Math.abs(viewer.viewport.getZoom() - viewer.viewport.getHomeZoom()) < 0.01;
}

defineExpose({ goHome, getViewportPx, isAtHome });

watch(
  () => props.zoomPerScroll,
  (val) => {
    if (viewer) (viewer as unknown as Record<string, unknown>).zoomPerScroll = val;
  },
);

watch(
  () => [props.dziUrl, props.src],
  () => {
    if (!viewer) return;
    viewer.world.removeAll();
    if (props.dziUrl) {
      viewer.open({ tileSource: props.dziUrl });
    } else if (props.src) {
      viewer.addSimpleImage({ url: props.src });
    }
  },
);
</script>

<template>
  <div class="osd-wrapper">
    <div ref="container" class="osd-viewer" />
    <!-- Shift+드래그 선택 영역 (OSD canvas 위에 표시) -->
    <div v-if="selecting" class="osd-overlay">
      <div v-if="selectionRect" class="osd-selection" :style="selectionRect" />
    </div>
  </div>
</template>

<style scoped>
.osd-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
}

.osd-viewer {
  width: 100%;
  height: 100%;
}

.osd-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  cursor: crosshair;
}

.osd-selection {
  position: absolute;
  border: 2px dashed #1976d2;
  background: rgba(25, 118, 210, 0.15);
  pointer-events: none;
}
</style>
