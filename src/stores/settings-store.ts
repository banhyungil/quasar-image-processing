import { useLocalStorage } from '@vueuse/core';
import { defineStore, acceptHMRUpdate } from 'pinia';

export const NODE_SIZE_PRESETS = {
  xs: { width: 140, thumbHeight: 80, thumbResolution: 150 },
  sm: { width: 170, thumbHeight: 110, thumbResolution: 200 },
  md: { width: 200, thumbHeight: 130, thumbResolution: 250 },
  lg: { width: 260, thumbHeight: 170, thumbResolution: 300 },
  xl: { width: 320, thumbHeight: 210, thumbResolution: 400 },
} as const;

export type NodeSizeKey = keyof typeof NODE_SIZE_PRESETS;

export const useSettingsStore = defineStore('settings', () => {
  const defaultZoomPerScroll = useLocalStorage('settings-defaultZoomPerScroll', 1.2);
  const nodeSizeKey = useLocalStorage<NodeSizeKey>('settings-nodeSizeKey', 'md');
  const isFullResolution = useLocalStorage('settings-isFullResolution', false);
  const hideIntermediateNodes = useLocalStorage('settings-hideIntermediateNodes', false);

  const nodeSize = computed(() => {
    const key = nodeSizeKey.value in NODE_SIZE_PRESETS ? nodeSizeKey.value : 'md';
    return NODE_SIZE_PRESETS[key];
  });

  function setDefaultZoomPerScroll(value: number) {
    defaultZoomPerScroll.value = value;
  }

  function setNodeSize(key: NodeSizeKey) {
    nodeSizeKey.value = key;
  }

  return {
    defaultZoomPerScroll, setDefaultZoomPerScroll,
    nodeSizeKey, nodeSize, setNodeSize,
    isFullResolution, hideIntermediateNodes,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot));
}
