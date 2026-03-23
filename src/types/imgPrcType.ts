// ── 필터 타입 ────────────────────────────────────────────────────────────────

export type FilterType =
  // Edge Detection
  | 'sobel'
  | 'prewitt'
  | 'laplacian'
  | 'canny'
  | 'roberts'
  // Blurring
  | 'gaussian'
  | 'blur'
  | 'gaussianBlur'
  | 'medianBlur'
  | 'bilateralFilter'
  | 'boxFilter'
  // Contour Detection
  | 'findContour'
  | 'convexHull'
  | 'boundingBox'
  // Brightness
  | 'plus'
  | 'minus'
  | 'gamma'
  | 'histogramEqualization'
  // Thresholding
  | 'binary'
  | 'inverse'
  | 'tozero'
  | 'tozeroInverse'
  | 'truncate'
  | 'otsu'
  | 'adaptive'
  // Morphological
  | 'erosion'
  | 'dilation'
  | 'opening'
  | 'closing'
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
  filterType: FilterType;
  kernelSize: number;
}

export interface SavePrcImageOptions {
  blob: Blob;
  originFileNm: string;
  /** 처리 유형 */
  filterType: FilterType;
  /** 처리시간 */
  prcMs: number;
}

export interface BatchStep {
  filterType: FilterType;
  parameters?: Record<string, unknown>;
}

export interface BatchResult {
  blob: Blob;
  totalExecutionMs: number;
  stepTimes: { filterType: string; executionMs: number }[];
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
  width: number | null;
  height: number | null;
}

// ── Tree Batch Processing ───────────────────────────────────────────────────

export interface TreeBatchStep {
  nodeId: string;
  filterType: FilterType;
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
  filterType: FilterType;
  parameters?: Record<string, unknown>;
}
