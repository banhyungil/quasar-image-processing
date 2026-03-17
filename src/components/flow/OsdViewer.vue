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
}>();

const container = ref<HTMLElement>();
let viewer: OpenSeadragon.Viewer | null = null;
let scrollZoomTimer: ReturnType<typeof setTimeout> | null = null;

function isZoomAnimating(): boolean {
  if (!viewer) return false;
  // 현재 줌과 목표 줌이 다르면 애니메이션 진행 중
  return viewer.viewport.getZoom(true) !== viewer.viewport.getZoom(false);
}

function stopZoomAnimation() {
  if (!viewer) return;
  viewer.viewport.zoomTo(viewer.viewport.getZoom(true), undefined, true);
  viewer.viewport.panTo(viewer.viewport.getCenter(true), true);
  // 브라우저 smooth scroll로 인한 후속 wheel 이벤트 차단
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
    // 뷰포트 변경 시 애니메이션 시간
    animationTime: 0.3,
    zoomPerScroll: props.zoomPerScroll,
    prefixUrl: '/node_modules/openseadragon/build/openseadragon/images/',
  });

  // 네비게이션 버튼 툴팁 한글화
  const tooltipLabels = ['확대', '축소', '줌 초기화(Esc)', '전체화면'];
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
  });

  // 클릭 시 줌 애니메이션 진행 중이면 중단, 아니면 기본 클릭 줌 허용
  viewer.addHandler('canvas-click', (e) => {
    if (isZoomAnimating()) {
      stopZoomAnimation();
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

defineExpose({ goHome });

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
  <div ref="container" class="osd-viewer" />
</template>

<style scoped>
.osd-viewer {
  width: 100%;
  height: 100%;
}
</style>
