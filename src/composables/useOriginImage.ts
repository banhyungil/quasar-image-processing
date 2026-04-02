import * as filesApi from 'src/apis/filesApi';
import { API_HOST } from 'src/boot/axios';

import type { AppNode, SourceNode as SourceNodeType } from 'src/types/flowTypes';
import { useQuasar } from 'quasar';

import { SOURCE_NODE_ID } from './useFilterGraph';

export interface OriginData {
  fileId: number | null;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
}

export function useOriginImage(
  nodes: Ref<AppNode[]>,
  onProcessAllLeaves: () => void,
) {
  const $q = useQuasar();

  const oOrigin = ref<OriginData>({
    fileId: null,
    imageUrl: null,
    width: null,
    height: null,
  });
  const originalInputRef = ref<HTMLInputElement | null>(null);
  const showImageGallery = ref(false);
  const droppedFile = ref<File | null>(null);

  function syncSourceNode() {
    const sourceNode = nodes.value.find((n): n is SourceNodeType => n.type === 'source');
    if (sourceNode) {
      sourceNode.data.previewUrl = oOrigin.value.imageUrl;
      sourceNode.data.thumbnailUrl = oOrigin.value.fileId
        ? `${API_HOST}/api/files/thumbnail/${oOrigin.value.fileId}`
        : null;
      sourceNode.data.width = oOrigin.value.width;
      sourceNode.data.height = oOrigin.value.height;
    }
  }

  /** 원본 이미지 설정 + 서버 업로드 (fileId 획득) */
  async function setOriginalFile(file: File | null, cropCleanup?: () => void) {
    if (file == null) {
      if (oOrigin.value.imageUrl) {
        URL.revokeObjectURL(oOrigin.value.imageUrl);
      }
      oOrigin.value = { fileId: null, imageUrl: null, width: null, height: null };
      cropCleanup?.();
      if (originalInputRef.value) {
        originalInputRef.value.value = '';
      }
    } else {
      if (!file.type.startsWith('image/')) return;

      if (oOrigin.value.imageUrl) {
        URL.revokeObjectURL(oOrigin.value.imageUrl);
      }
      oOrigin.value.imageUrl = URL.createObjectURL(file);

      document.body.style.cursor = 'wait';
      try {
        const uploaded = await filesApi.create(file);
        oOrigin.value.fileId = uploaded.id;
        oOrigin.value.width = uploaded.width;
        oOrigin.value.height = uploaded.height;
      } catch (err) {
        console.error('원본 이미지 업로드 실패:', err);
        $q.notify({ type: 'negative', message: '이미지 업로드에 실패했습니다.' });
      } finally {
        document.body.style.cursor = 'default';
      }
    }
    syncSourceNode();
    onProcessAllLeaves();
  }

  function onOriginalInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    void setOriginalFile(input.files?.[0] ?? null);
  }

  function onSelectExistingImage(tFile: {
    id: number;
    originNm: string;
    path: string;
    mimeType: string;
    width?: number | null;
    height?: number | null;
  }) {
    oOrigin.value.fileId = tFile.id;
    if (oOrigin.value.imageUrl) URL.revokeObjectURL(oOrigin.value.imageUrl);
    oOrigin.value.imageUrl = `${API_HOST}/${tFile.path}`;
    oOrigin.value.width = tFile.width ?? null;
    oOrigin.value.height = tFile.height ?? null;

    const sourceNode = nodes.value.find((n): n is SourceNodeType => n.type === 'source');
    if (sourceNode) {
      sourceNode.data.previewUrl = oOrigin.value.imageUrl;
      sourceNode.data.thumbnailUrl = `${API_HOST}/api/files/thumbnail/${tFile.id}`;
      sourceNode.data.width = oOrigin.value.width;
      sourceNode.data.height = oOrigin.value.height;
    }
    onProcessAllLeaves();
  }

  function onDropFile(file: File) {
    droppedFile.value = file;
    showImageGallery.value = true;
  }

  return {
    oOrigin,
    originalInputRef,
    showImageGallery,
    droppedFile,
    setOriginalFile,
    onOriginalInputChange,
    onSelectExistingImage,
    onDropFile,
  };
}
