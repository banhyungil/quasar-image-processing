import * as filesApi from 'src/apis/filesApi';
import type { PreviewTempStep } from 'src/types/imgPrcType';
import type { CropItem } from './useCropManager';

export interface TempStep extends PreviewTempStep {
  id: string;
  label: string;
}

export function usePreviewManager(
  fileId: Ref<number | null | undefined>,
  activeCrop: Ref<CropItem | null>,
  tempSteps: Ref<TempStep[]>,
) {
  const applying = ref(false);
  const lastExecutionMs = ref<number | null>(null);
  const timelineSteps = ref<{ filterType: string; imageSrc: string; executionMs?: number }[]>([]);

  let previewAbortController: AbortController | null = null;
  let timelineAbortController: AbortController | null = null;

  function getStepPayload(): PreviewTempStep[] {
    return tempSteps.value.map((s) => ({
      filterType: s.filterType,
      parameters: { ...s.parameters },
    }));
  }

  async function applyFilters() {
    const crop = activeCrop.value;
    if (!fileId.value || !crop || tempSteps.value.length === 0) return;

    previewAbortController?.abort();
    previewAbortController = new AbortController();
    applying.value = true;

    try {
      const result = await filesApi.applyCrop(
        fileId.value,
        crop.cropId,
        getStepPayload(),
        crop.viewport,
        { signal: previewAbortController.signal },
      );

      if (!result) return; // abort
      crop.processedImageUrl = `data:image/png;base64,${result.imageBase64}`;
      lastExecutionMs.value = result.executionMs;
    } finally {
      applying.value = false;
    }
  }

  async function loadTimeline() {
    const crop = activeCrop.value;
    if (!fileId.value || !crop || tempSteps.value.length === 0) return;

    timelineAbortController?.abort();
    timelineAbortController = new AbortController();

    try {
      const results = await filesApi.applyCropAll(
        fileId.value,
        crop.cropId,
        getStepPayload(),
        crop.viewport,
        { signal: timelineAbortController.signal },
      );
      timelineSteps.value = results.map((r) => ({
        filterType: r.filterType,
        imageSrc: `data:image/png;base64,${r.imageBase64}`,
        executionMs: r.executionMs,
      }));
    } catch {
      // abort 또는 에러
    }
  }

  function abortAll() {
    previewAbortController?.abort();
    timelineAbortController?.abort();
  }

  return {
    applying,
    lastExecutionMs,
    timelineSteps,
    applyFilters,
    loadTimeline,
    abortAll,
  };
}
