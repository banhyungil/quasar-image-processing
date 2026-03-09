import type { components, operations } from './api';

// api.d.ts 기반 타입 별칭
export type PrcType =
  components['schemas']['Body_img_processing_api_image_processing_post']['prcType'];
export type FileSaveResponse = components['schemas']['FileSaveResponse'];
export type FileListResponse = components['schemas']['FileListResponse'];
export type GetProcessingImageOptions = NonNullable<
  operations['get_saved_images_api_image_processing_get']['parameters']['query']
>;

export interface ImgPrcOptions {
  file: File;
  prcType: PrcType;
  kernelSize: number;
}

export interface SavePrcImageOptions {
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

// ── File Upload ─────────────────────────────────────────────────────────────

export interface FileUploadResponse {
  id: string;
  originNm: string;
  nm: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

// ── Tree Batch Processing ───────────────────────────────────────────────────

export interface TreeBatchStep {
  nodeId: string;
  prcType: PrcType;
  parameters?: Record<string, unknown>;
  parentId?: string | null;
}

export interface TreeNodeResult {
  nodeId: string;
  imageUrl: string;
  executionMs: number;
}

export interface TreeBatchResult {
  totalExecutionMs: number;
  results: TreeNodeResult[];
}
