import { api } from 'src/boot/axios';

export type PrcType =
  | 'sobel'
  | 'prewitt'
  | 'laplacian'
  | 'gaussian'
  | 'blur'
  | 'gaussianBlur'
  | 'medianBlur'
  | 'bilateralFilter'
  | 'findContour'
  | 'plus'
  | 'minus'
  | 'binary'
  | 'inverse'
  | 'tozero'
  | 'tozeroInverse';

export interface FileSaveResponse {
  id: string;
  originNm: string;
  nm: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  options: {
    prcType: string;
  };
}

/**
 * form vs 객체 전송 차이
 * 1. 객체(JSON) 전송
 * * application/json
 * * 구조화 데이터 전달에 최적
 * * 파일(File/Blob) 직접 전송엔 부적합(보통 Base64 변환 필요)
 *
 * 2. FormData 전송
 * * multipart/form-data
 * * 파일 + 텍스트 필드를 함께 보내기 적합
 * * 백엔드에서 업로드 처리(OpenCV 입력)하기 쉬움
 */

interface ImgPrcOptions {
  file: File;
  prcType: PrcType;
  kernelSize: number;
}

interface SavePrcImageOptions {
  blob: Blob;
  originFileNm: string;
  prcType: PrcType;
}

export interface GetProcessingImageOptions {
  limit?: number;
  cursorUploadedAt?: string | Date | null;
  cursorId?: string | null;
}

export interface FileListResponse {
  items: FileSaveResponse[];
  nextCursorUploadedAt: string | null;
  nextCursorId: string | null;
}

export async function imageProcessing(options: ImgPrcOptions) {
  const form = new FormData();
  form.append('file', options.file);
  form.append('prcType', options.prcType);
  form.append('kenelSize', options.kernelSize.toString());

  const res = await api.post<Blob>('/image-processing', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });

  return res.data;
}

export async function saveProcessingImage(options: SavePrcImageOptions) {
  const form = new FormData();
  const fileName = `${options.originFileNm}_${options.prcType}.png`;

  form.append('blob', options.blob, fileName);
  form.append('prcType', options.prcType);

  const res = await api.post<FileSaveResponse>('/image-processing/save', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return res.data;
}

export async function getProcessingImage(options: GetProcessingImageOptions = {}) {
  const params = {
    limit: options.limit ?? 20,
    cursorUploadedAt:
      options.cursorUploadedAt instanceof Date
        ? options.cursorUploadedAt.toISOString()
        : (options.cursorUploadedAt ?? undefined),
    cursorId: options.cursorId ?? undefined,
  };

  const res = await api.get<FileListResponse>('/image-processing', {
    params,
  });

  return res.data;
}
