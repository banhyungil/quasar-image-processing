import { useLocalStorage } from '@vueuse/core';
import { defineStore, acceptHMRUpdate } from 'pinia';

export const useSettingsStore = defineStore('settings', () => {
  const defaultZoomPerScroll = useLocalStorage('settings-defaultZoomPerScroll', 1.2);

  function setDefaultZoomPerScroll(value: number) {
    defaultZoomPerScroll.value = value;
  }

  return { defaultZoomPerScroll, setDefaultZoomPerScroll };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot));
}
