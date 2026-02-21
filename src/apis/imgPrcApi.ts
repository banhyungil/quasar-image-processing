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
}

export async function imageProcessing(options: ImgPrcOptions) {
  const form = new FormData();
  form.append('file', options.file);
  form.append('prcType', options.prcType);

  const res = await api.post('/image-processing', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  debugger;

  const data = res.data;
  return data;
}
