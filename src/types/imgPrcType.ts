// ── 필터 타입 ────────────────────────────────────────────────────────────────

export type PrcType =
  // Edge Detection
  | 'sobel' | 'prewitt' | 'laplacian' | 'canny' | 'roberts'
  // Blurring
  | 'gaussian' | 'blur' | 'gaussianBlur' | 'medianBlur' | 'bilateralFilter' | 'boxFilter'
  // Contour Detection
  | 'findContour' | 'convexHull' | 'boundingBox'
  // Brightness
  | 'plus' | 'minus' | 'gamma' | 'histogramEqualization'
  // Thresholding
  | 'binary' | 'inverse' | 'tozero' | 'tozeroInverse' | 'truncate' | 'otsu' | 'adaptive'
  // Morphological
  | 'erosion' | 'dilation' | 'opening' | 'closing'
  // Custom
  | 'custom';

// ── 파일 응답 ────────────────────────────────────────────────────────────────

export interface TFile {
  id: string;
  originNm: string;
  nm: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  options: Record<string, unknown>;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface FileListResponse {
  items: TFile[];
  hasMore: boolean;
  nextCursorUploadedAt: string | null;
  nextCursorId: string | null;
}

export interface FileSaveResponse {
  id: string;
  originNm: string;
  nm: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  options: Record<string, unknown>;
  width: number | null;
  height: number | null;
}

export interface GetProcessingImageOptions {
  limit?: number;
  cursorUploadedAt?: string;
  cursorId?: string;
}

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

// ── Preview (crop 기반 미리보기) ──────────────────────────────────────────────

export interface Viewport {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PreviewCropResponse {
  cropId: string;
  nodeImageUrl: string;
  width: number;
  height: number;
}

export interface PreviewTempStep {
  prcType: PrcType;
  parameters?: Record<string, unknown>;
}
