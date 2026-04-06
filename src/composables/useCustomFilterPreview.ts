import { ref, computed, watch, type Ref } from 'vue';
import type { ParamFieldDef } from 'src/constants/imgPrc';
import type { AppNode } from 'src/types/flowTypes';
import { previewCustomFilter } from 'src/apis/customFiltersApi';
import { API_BASE_URL } from 'src/boot/axios';
import { AxiosError } from 'axios';

export type ImageSourceType = 'upload' | 'canvas';

export interface CanvasImageOption {
  nodeId: string;
  label: string;
  imageUrl: string;
}

export function useCustomFilterPreview(
  code: Ref<string>,
  paramDefs: Ref<ParamFieldDef[]>,
  canvasNodes: Ref<AppNode[] | undefined>,
) {
  const panelOpen = ref(false);

  // ── 이미지 소스 ──
  const imageSourceType = ref<ImageSourceType>('upload');
  const uploadedFile = ref<File | null>(null);
  const uploadedPreviewUrl = ref<string | null>(null);
  const selectedCanvasNodeId = ref<string | null>(null);

  // ── 테스트 파라미터 ──
  const testParams = ref<Record<string, unknown>>({});

  // ── 결과 ──
  const resultUrl = ref<string | null>(null);
  const executing = ref(false);
  const errorMessage = ref<string | null>(null);

  // ── 캔버스 이미지 목록 ──
  const canvasImages = computed<CanvasImageOption[]>(() => {
    if (!canvasNodes.value) return [];
    const options: CanvasImageOption[] = [];
    for (const node of canvasNodes.value) {
      if (node.type === 'source' && node.data.previewUrl) {
        options.push({ nodeId: node.id, label: '원본 이미지', imageUrl: node.data.previewUrl });
      } else if (node.type === 'filter' && node.data.imageUrl) {
        options.push({
          nodeId: node.id,
          label: node.data.label || node.data.algorithmNm,
          imageUrl: node.data.imageUrl,
        });
      }
    }
    return options;
  });

  // ── 현재 선택된 원본 이미지 URL ──
  const originalPreviewUrl = computed<string | null>(() => {
    if (imageSourceType.value === 'upload') return uploadedPreviewUrl.value;
    if (!selectedCanvasNodeId.value) return null;
    return canvasImages.value.find((o) => o.nodeId === selectedCanvasNodeId.value)?.imageUrl ?? null;
  });

  // ── paramDefs → testParams 초기화 ──
  function resetTestParams() {
    const params: Record<string, unknown> = {};
    for (const p of paramDefs.value) {
      params[p.key] = p.default;
    }
    testParams.value = params;
  }
  watch(paramDefs, resetTestParams, { deep: true, immediate: true });

  // ── 파일 업로드 핸들러 ──
  function onFileSelected(file: File | null) {
    uploadedFile.value = file;
    if (uploadedPreviewUrl.value) {
      URL.revokeObjectURL(uploadedPreviewUrl.value);
      uploadedPreviewUrl.value = null;
    }
    if (file) {
      uploadedPreviewUrl.value = URL.createObjectURL(file);
    }
  }

  // ── 이미지 blob 획득 ──
  async function getImageBlob(): Promise<Blob | null> {
    if (imageSourceType.value === 'upload') {
      return uploadedFile.value;
    }
    let url = originalPreviewUrl.value;
    if (!url) return null;
    // 전체 경로(http://127.0.0.1:8000/uploads/...)를 상대 경로(/uploads/...)로 변환하여 dev 프록시를 타도록 함
    if (url.startsWith(API_BASE_URL)) {
      url = url.slice(API_BASE_URL.length);
    }
    const res = await fetch(url);
    return res.blob();
  }

  // ── 실행 ──
  async function executePreview() {
    errorMessage.value = null;
    const blob = await getImageBlob();
    if (!blob) return;

    executing.value = true;
    try {
      const resultBlob = await previewCustomFilter(code.value, blob, testParams.value);
      if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
      resultUrl.value = URL.createObjectURL(resultBlob);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        try {
          const text = await (err.response.data as Blob).text();
          const parsed = JSON.parse(text);
          errorMessage.value = parsed.message || parsed.detail || '실행 오류';
        } catch {
          errorMessage.value = '실행 오류';
        }
      } else {
        errorMessage.value = '실행 오류';
      }
    } finally {
      executing.value = false;
    }
  }

  // ── 정리 ──
  function cleanup() {
    if (uploadedPreviewUrl.value) URL.revokeObjectURL(uploadedPreviewUrl.value);
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
  }

  return {
    panelOpen,
    imageSourceType,
    uploadedFile,
    uploadedPreviewUrl,
    selectedCanvasNodeId,
    testParams,
    resultUrl,
    executing,
    errorMessage,
    canvasImages,
    originalPreviewUrl,
    resetTestParams,
    onFileSelected,
    executePreview,
    cleanup,
  };
}
