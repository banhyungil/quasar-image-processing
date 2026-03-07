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

export async function getProcessingImage(options: GetProcessingImageOptions = {}) {
  const params = {
    limit: options.limit ?? 20,
    cursorUploadedAt: options.cursorUploadedAt ?? undefined,
    cursorId: options.cursorId ?? undefined,
  };

  const res = await api.get<FileListResponse>('/image-processing', {
    params,
  });

  return res.data;
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
  options?: { fullSize?: boolean },
): Promise<TreeBatchResult> {
  const form = new FormData();
  form.append('file', file);
  form.append('steps', JSON.stringify(steps));
  if (options?.fullSize) {
    form.append('fullSize', 'true');
  }

  const res = await api.post<TreeBatchResult>('/image-processing/batch-tree', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
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
