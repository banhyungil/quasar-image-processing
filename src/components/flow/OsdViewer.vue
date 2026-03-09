<script setup lang="ts">
import OpenSeadragon from 'openseadragon';

const props = defineProps<{
  dziUrl: string;
}>();

const container = ref<HTMLElement>();
let viewer: OpenSeadragon.Viewer | null = null;

onMounted(() => {
  viewer = OpenSeadragon({
    element: container.value!,
    tileSources: props.dziUrl,
    showNavigator: true,
    navigatorPosition: 'BOTTOM_RIGHT',
    showNavigationControl: true,
    minZoomLevel: 0.5,
    maxZoomLevel: 20,
    animationTime: 0.3,
    prefixUrl: '/node_modules/openseadragon/build/openseadragon/images/',
  });
});

onBeforeUnmount(() => {
  viewer?.destroy();
  viewer = null;
});

watch(
  () => props.dziUrl,
  (url) => {
    viewer?.open({ tileSource: url });
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
