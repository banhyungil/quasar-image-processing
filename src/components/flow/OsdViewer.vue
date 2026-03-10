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

function buildTileSource() {
  if (props.dziUrl) return { tileSource: props.dziUrl };
  return { type: 'image', url: props.src! };
}

onMounted(() => {
  viewer = OpenSeadragon({
    element: container.value!,
    tileSources: buildTileSource(),
    showNavigator: true,
    navigatorPosition: 'BOTTOM_RIGHT',
    showNavigationControl: true,
    minZoomLevel: 0.5,
    maxZoomLevel: 20,
    animationTime: 0.3,
    zoomPerScroll: props.zoomPerScroll,
    prefixUrl: '/node_modules/openseadragon/build/openseadragon/images/',
  });

  viewer.addHandler('zoom', (e) => {
    emit('zoom', e.zoom);
  });
});

onBeforeUnmount(() => {
  viewer?.destroy();
  viewer = null;
});

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
