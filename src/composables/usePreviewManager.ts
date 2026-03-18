import * as imgPrcApi from 'src/apis/imgPrcApi';
import type { PreviewTempStep } from 'src/types/imgPrcType';
import type { CropItem } from './useCropManager';

export interface TempStep extends PreviewTempStep {
  id: string;
  label: string;
}

export function usePreviewManager(
  fileId: Ref<string | null | undefined>,
  activeCrop: Ref<CropItem | null>,
  tempSteps: Ref<TempStep[]>,
) {
  const applying = ref(false);
  const lastExecutionMs = ref<number | null>(null);
  const timelineSteps = ref<{ prcType: string; imageSrc: string; executionMs?: number }[]>([]);

  let previewAbortController: AbortController | null = null;
  let timelineAbortController: AbortController | null = null;

  function getStepPayload(): PreviewTempStep[] {
    return tempSteps.value.map((s) => ({
      prcType: s.prcType,
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
      const result = await imgPrcApi.previewApply(
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
      const results = await imgPrcApi.previewApplyAll(
        fileId.value,
        crop.cropId,
        getStepPayload(),
        crop.viewport,
        { signal: timelineAbortController.signal },
      );
      timelineSteps.value = results.map((r) => ({
        prcType: r.prcType,
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
