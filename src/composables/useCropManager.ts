import { useQuasar } from 'quasar';
import * as filesApi from 'src/apis/filesApi';
import type { TreeBatchStep, Viewport } from 'src/types/imgPrcType';
import { API_HOST } from 'src/boot/axios';

export interface CropItem {
  cropId: string;
  nodeImageUrl: string;
  processedImageUrl: string | null;
  viewport: Viewport;
  label: string;
}

const MIN_CROP_PIXELS = 2_500; // 50x50
const MAX_CROP_PIXELS = 16_000_000; // 4000x4000

/** 뷰포트 사이즈 검증 (composable 외부에서도 사용 가능) */
export function computeViewportStatus(
  viewportSize: { w: number; h: number } | null,
): 'ok' | 'too-small' | 'too-large' {
  if (!viewportSize) return 'ok';
  const pixels = viewportSize.w * viewportSize.h;
  if (pixels < MIN_CROP_PIXELS) return 'too-small';
  if (pixels > MAX_CROP_PIXELS) return 'too-large';
  return 'ok';
}

/** Crop 영역의 생성, 삭제, 전체 정리를 관리하는 composable */
export function useCropManager(
  fileId: Ref<number | null | undefined>,
  nodeSteps: Ref<TreeBatchStep[]>,
  nodeId: Ref<string>,
) {
  const $q = useQuasar();

  const cropList = ref<CropItem[]>([]);
  const activeCropId = ref<string | null>(null);
  const activeCrop = computed(
    () => cropList.value.find((c) => c.cropId === activeCropId.value) ?? null,
  );

  /** 뷰포트 픽셀 수 검증. 범위 밖이면 notify 후 false 반환 */
  function validateViewport(viewport: { w: number; h: number }): boolean {
    const pixels = viewport.w * viewport.h;
    if (pixels < MIN_CROP_PIXELS) {
      $q.notify({ type: 'warning', message: '선택 영역이 너무 작습니다.' });
      return false;
    }
    if (pixels > MAX_CROP_PIXELS) {
      $q.notify({ type: 'warning', message: '선택 영역이 너무 큽니다. 확대 후 다시 시도하세요.' });
      return false;
    }
    return true;
  }

  /** 서버에 crop 생성 요청 후 cropList에 추가 */
  async function createCrop(viewport: Viewport): Promise<CropItem | null> {
    if (!fileId.value || !validateViewport(viewport)) return null;

    const result = await filesApi.createCrop(fileId.value, nodeSteps.value, nodeId.value, viewport);
    const newCrop: CropItem = {
      cropId: result.cropId,
      nodeImageUrl: API_HOST + result.nodeImageUrl,
      processedImageUrl: null,
      viewport,
      label: `Crop ${cropList.value.length + 1}`,
    };
    cropList.value.push(newCrop);
    activeCropId.value = result.cropId;
    return newCrop;
  }

  /** crop 삭제. 서버 삭제 요청 + cropList에서 제거 */
  function removeCrop(cropIdToRemove: string) {
    const crop = cropList.value.find((c) => c.cropId === cropIdToRemove);
    if (!crop) return;
    if (fileId.value) {
      void filesApi.removeCrop(fileId.value, cropIdToRemove);
    }
    cropList.value = cropList.value.filter((c) => c.cropId !== cropIdToRemove);
    if (activeCropId.value === cropIdToRemove) {
      activeCropId.value = cropList.value[0]?.cropId ?? null;
    }
  }

  /** 전체 crop 삭제 (서버 + 로컬 상태 초기화) */
  function cleanupAll() {
    for (const crop of cropList.value) {
      if (fileId.value) {
        void filesApi.removeCrop(fileId.value, crop.cropId);
      }
    }
    cropList.value = [];
    activeCropId.value = null;
  }

  return {
    cropList,
    activeCropId,
    activeCrop,
    validateViewport,
    createCrop,
    removeCrop,
    cleanupAll,
  };
}
