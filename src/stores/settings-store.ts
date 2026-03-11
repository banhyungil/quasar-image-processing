import { defineStore, acceptHMRUpdate } from 'pinia';

const STORAGE_KEY = 'app-settings';

interface SettingsState {
  defaultZoomPerScroll: number;
}

function loadFromStorage(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<SettingsState>;
  } catch {
    // ignore
  }
  return {};
}

function saveToStorage(state: SettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    defaultZoomPerScroll: 1.5,
    ...loadFromStorage(),
  }),

  actions: {
    setDefaultZoomPerScroll(value: number) {
      this.defaultZoomPerScroll = value;
      saveToStorage(this.$state);
    },
  },
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot));
}
