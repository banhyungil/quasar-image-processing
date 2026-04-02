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
  id: number;
  originNm: string;
  nm: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  sourceType: string;
  options: Record<string, unknown>;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface FileListRes {
  items: TFile[];
  hasMore: boolean;
  nextCursorUploadedAt: string | null;
  nextCursorId: number | null;
}

export interface FileSaveRes {
  id: number;
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
  cursorId?: number;
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

export interface FileUploadRes {
  id: number;
  originNm: string;
  nm: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  sourceType: string;
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
  width: number;
  height: number;
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

export interface PreviewCropRes {
  cropId: string;
  nodeImageUrl: string;
  width: number;
  height: number;
}

export interface PreviewTempStep {
  filterType: FilterType;
  parameters?: Record<string, unknown>;
}

// ── Local Import ──────────────────────────────────────────────────────────

export interface LocalFileInfo {
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  thumbnailUrl: string;
  alreadyRegistered: boolean;
}

export interface LocalScanRes {
  items: LocalFileInfo[];
}

export interface LocalRegisterRes {
  items: FileUploadRes[];
}
