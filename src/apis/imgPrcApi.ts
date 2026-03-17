import { api } from 'src/boot/axios';
import type {
  ImgPrcOptions,
  SavePrcImageOptions,
  GetProcessingImageOptions,
  FileSaveResponse,
  FileListResponse,
  FileUploadResponse,
  BatchStep,
  BatchResult,
  TreeBatchStep,
  TreeBatchResult,
} from 'src/types/imgPrcType';

export type {
  PrcType,
  FileSaveResponse,
  FileListResponse,
  FileUploadResponse,
  ImgPrcOptions,
  SavePrcImageOptions,
  GetProcessingImageOptions,
  BatchStep,
  BatchResult,
  TreeBatchStep,
  TreeNodeResult,
  TreeBatchResult,
} from 'src/types/imgPrcType';

export async function imageProcessing(options: ImgPrcOptions) {
  const form = new FormData();
  form.append('file', options.file);
  form.append('prcType', options.prcType);
  form.append('kernelSize', options.kernelSize.toString());

  const res = await api.post<Blob>('/image-processing', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });

  const elapsedMs = Number(res.headers['x-process-time-ms']);

  return { blob: res.data, elapsedMs };
}

export async function saveProcessingImage(options: SavePrcImageOptions) {
  const form = new FormData();
  const fileName = `${options.originFileNm}_${options.prcType}.png`;

  form.append('blob', options.blob, fileName);
  form.append('prcType', options.prcType);
  form.append('prcMs', options.prcMs.toString());

  const res = await api.post<FileSaveResponse>('/image-processing/save', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
}

export async function getProcessingImage(
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

  const res = await api.get<FileListResponse>('/image-processing', {
    params,
  });

  return res.data;
}

export async function deleteFile(fileId: string): Promise<void> {
  await api.delete(`/image-processing/${fileId}`);
}

export async function renameFile(fileId: string, originNm: string): Promise<void> {
  await api.patch(`/image-processing/${fileId}`, { originNm });
}

// ── Tree Batch Processing ───────────────────────────────────────────────────

/**
 * file에 따른 steps 연산처리를 수행한다.
 * 원본 이미지를 넘기는 경우 동일 해상도로 연산처리
 *
 * @param file
 * @param steps
 * @param options
 * @returns
 */
export async function batchTreeProcessing(
  file: File | Blob,
  steps: TreeBatchStep[],
  options?: { thumbnailSize?: number },
): Promise<TreeBatchResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('steps', JSON.stringify(steps));
  if (options?.thumbnailSize) {
    form.append('thumbnailSize', options.thumbnailSize.toString());
  }

  const res = await api.post<TreeBatchResult>('/image-processing/batch-tree', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
}

/**
 * 타겟 노드의 원본 해상도와 동일한 이미지 url을 반환한다.
 * * DZI 생성 or 이미지 url을 반환한다.
 *
 * 고해상도인 경우
 * * dzi 타일이 생성
 * * dziUrl 반환
 *
 * 고해상도 아닌 경우
 * * imageUrl 반환
 */
export async function getOriginSizeUrl(
  fileId: string,
  steps: TreeBatchStep[],
  nodeId: string,
): Promise<{ dziUrl?: string; imageUrl?: string }> {
  const form = new FormData();
  form.append('steps', JSON.stringify(steps));
  form.append('nodeId', nodeId);

  const res = await api.post<{ dziUrl?: string; imageUrl?: string }>(
    `/image-processing/dzi/${fileId}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data;
}

/**
 * 개별 노드 이미지 다운로드 — 원본 이미지에 steps 체인을 적용하고 타겟 노드의 결과를 PNG로 다운로드한다.
 */
export async function downloadNodeImage(
  fileId: string,
  steps: TreeBatchStep[],
  nodeId: string,
): Promise<Blob> {
  const form = new FormData();
  form.append('steps', JSON.stringify(steps));
  form.append('nodeId', nodeId);

  const res = await api.post<Blob>(`/image-processing/download/${fileId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
  return res.data;
}

// ── Legacy Batch Processing ─────────────────────────────────────────────────

export async function batchProcessing(file: File | Blob, steps: BatchStep[]): Promise<BatchResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('steps', JSON.stringify(steps));

  const res = await api.post<Blob>('/image-processing/batch', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });

  const totalMs = Number(res.headers['x-total-process-time-ms'] ?? 0);
  const stepTimesRaw = (res.headers['x-step-times'] as string) ?? '';
  const stepTimes = stepTimesRaw
    .split(',')
    .filter(Boolean)
    .map((s) => {
      const [prcType, ms] = s.split(':');
      return { prcType: prcType!, executionMs: Number(ms) };
    });

  return { blob: res.data, totalExecutionMs: totalMs, stepTimes };
}

// ── File Upload ─────────────────────────────────────────────────────────────

export async function uploadFile(file: File | Blob): Promise<FileUploadResponse> {
  const form = new FormData();
  form.append('file', file);

  const res = await api.post<FileUploadResponse>('/image-processing/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
}
