/**
 * 파일 관리 + 처리 + Crop + DZI + 다운로드 API (/files)
 */
import { api } from 'src/boot/axios';
import type {
  SavePrcImageOptions,
  GetProcessingImageOptions,
  FileSaveResponse,
  FileListResponse,
  FileUploadResponse,
  TreeBatchStep,
  TreeBatchResult,
  Viewport,
  PreviewCropResponse,
  PreviewTempStep,
} from 'src/types/imgPrcType';

// ── 파일 CRUD ────────────────────────────────────────────────────────────────

export async function getFiles(
  options: GetProcessingImageOptions & {
    search?: string;
    minSize?: number;
    maxSize?: number;
  } = {},
) {
  const params = {
    limit: options.limit ?? 20,
    search: options.search ?? undefined,
    minSize: options.minSize ?? undefined,
    maxSize: options.maxSize ?? undefined,
    cursorUploadedAt: options.cursorUploadedAt ?? undefined,
    cursorId: options.cursorId ?? undefined,
  };

  const res = await api.get<FileListResponse>('/files', { params });
  return res.data;
}

export async function deleteFile(fileId: string): Promise<void> {
  await api.delete(`/files/${fileId}`);
}

export async function renameFile(fileId: string, originNm: string): Promise<void> {
  await api.patch(`/files/${fileId}`, { originNm });
}

export async function uploadFile(file: File | Blob): Promise<FileUploadResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await api.post<FileUploadResponse>('/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function saveProcessingImage(options: SavePrcImageOptions) {
  const form = new FormData();
  const fileName = `${options.originFileNm}_${options.filterType}.png`;

  form.append('blob', options.blob, fileName);
  form.append('filterType', options.filterType);
  form.append('prcMs', options.prcMs.toString());

  const res = await api.post<FileSaveResponse>('/files/save', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

// ── 처리 ─────────────────────────────────────────────────────────────────────

export async function batchTreeProcessing(
  fileId: string,
  steps: TreeBatchStep[],
  options?: { thumbnailSize?: number; signal?: AbortSignal },
): Promise<TreeBatchResult> {
  const form = new FormData();
  form.append('fileId', fileId);
  form.append('steps', JSON.stringify(steps));
  if (options?.thumbnailSize) {
    form.append('thumbnailSize', options.thumbnailSize.toString());
  }

  const res = await api.post<TreeBatchResult>('/files/process/batch-tree', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal: options?.signal,
  });
  return res.data;
}

// ── Crop ─────────────────────────────────────────────────────────────────────

export async function createCrop(
  fileId: string,
  nodeSteps: TreeBatchStep[],
  nodeId: string,
  viewport: Viewport,
  options?: { padding?: number; signal?: AbortSignal },
): Promise<PreviewCropResponse> {
  const form = new FormData();
  form.append('fileId', fileId);
  form.append('nodeSteps', JSON.stringify(nodeSteps));
  form.append('nodeId', nodeId);
  form.append('viewport', JSON.stringify(viewport));
  if (options?.padding != null) {
    form.append('padding', options.padding.toString());
  }

  const res = await api.post<PreviewCropResponse>('/files/crop', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    signal: options?.signal,
  });
  return res.data;
}

export async function applyCrop(
  fileId: string,
  cropId: string,
  tempSteps: PreviewTempStep[],
  viewport: Viewport,
  options?: { padding?: number; signal?: AbortSignal },
): Promise<{ imageBase64: string; executionMs: number } | null> {
  const form = new FormData();
  form.append('fileId', fileId);
  form.append('cropId', cropId);
  form.append('tempSteps', JSON.stringify(tempSteps));
  form.append('viewport', JSON.stringify(viewport));
  if (options?.padding != null) {
    form.append('padding', options.padding.toString());
  }

  const res = await api.post<{ imageBase64: string; executionMs: number }>(
    '/files/crop/apply',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options?.signal,
    },
  );
  if (!res) return null; // abort
  return res.data;
}

export async function applyCropAll(
  fileId: string,
  cropId: string,
  tempSteps: PreviewTempStep[],
  viewport: Viewport,
  options?: { padding?: number; signal?: AbortSignal },
): Promise<{ filterType: string; imageBase64: string; executionMs: number }[]> {
  const form = new FormData();
  form.append('fileId', fileId);
  form.append('cropId', cropId);
  form.append('tempSteps', JSON.stringify(tempSteps));
  form.append('viewport', JSON.stringify(viewport));
  if (options?.padding != null) {
    form.append('padding', options.padding.toString());
  }

  const res = await api.post<{ filterType: string; imageBase64: string; executionMs: number }[]>(
    '/files/crop/apply-all',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      signal: options?.signal,
    },
  );
  return res.data;
}

export async function deleteCrop(fileId: string, cropId: string): Promise<void> {
  await api.delete(`/files/crop/${fileId}/${cropId}`);
}

// ── DZI / 다운로드 ───────────────────────────────────────────────────────────

export async function getOriginSizeUrl(
  fileId: string,
  steps: TreeBatchStep[],
  nodeId: string,
): Promise<{ dziUrl?: string; imageUrl?: string }> {
  const form = new FormData();
  form.append('steps', JSON.stringify(steps));
  form.append('nodeId', nodeId);

  const res = await api.post<{ dziUrl?: string; imageUrl?: string }>(`/files/dzi/${fileId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function downloadNodeImage(
  fileId: string,
  steps: TreeBatchStep[],
  nodeId: string,
): Promise<Blob> {
  const form = new FormData();
  form.append('steps', JSON.stringify(steps));
  form.append('nodeId', nodeId);

  const res = await api.post<Blob>(`/files/download/${fileId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
  return res.data;
}
