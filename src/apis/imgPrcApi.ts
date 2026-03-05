import { api } from 'src/boot/axios';
import type { components, operations } from 'src/types/api';

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

//ANCHOR - Types

// api.d.ts 기반 타입 별칭
export type PrcType =
  components['schemas']['Body_img_processing_api_image_processing_post']['prcType'];
export type FileSaveResponse = components['schemas']['FileSaveResponse'];
export type FileListResponse = components['schemas']['FileListResponse'];
export type FileListItem = components['schemas']['FileListItem'];
export type GetProcessingImageOptions = NonNullable<
  operations['get_saved_images_api_image_processing_get']['parameters']['query']
>;

interface ImgPrcOptions {
  file: File;
  prcType: PrcType;
  kernelSize: number;
}

interface SavePrcImageOptions {
  blob: Blob;
  originFileNm: string;
  /** 처리 유형 */
  prcType: PrcType;
  /** 처리시간 */
  prcMs: number;
}

export interface BatchStep {
  prcType: PrcType;
  parameters?: Record<string, unknown>;
}

export interface BatchResult {
  blob: Blob;
  totalExecutionMs: number;
  stepTimes: { prcType: string; executionMs: number }[];
}

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
