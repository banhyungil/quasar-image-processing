import type { PrcType } from 'src/apis/imgPrcApi';

export type FunctionKey = 'filtering' | 'blurring' | 'findContour' | 'brightness' | 'threshold';

export const FN_LIST = [
  { label: '필터링', value: 'filtering' },
  { label: '블러링', value: 'blurring' },
  { label: 'Find Contour', value: 'findContour' },
  { label: '밝기 변환', value: 'brightness' },
  { label: '이진화', value: 'threshold' },
] as const satisfies Array<{ label: string; value: FunctionKey }>;

export const FN_OPTIONS_MAP: Record<FunctionKey, Array<{ label: string; value: PrcType }>> = {
  filtering: [
    { label: '소벨 (Sobel)', value: 'sobel' },
    { label: '프르윗 (Prewitt)', value: 'prewitt' },
    { label: '라플라시안 (Laplacian)', value: 'laplacian' },
    { label: '가우시안 (Gaussian)', value: 'gaussian' },
  ],
  blurring: [
    { label: '블러 (Blur)', value: 'blur' },
    { label: '가우시안 블러 (Gaussian Blur)', value: 'gaussianBlur' },
    { label: '중앙값 블러 (Median Blur)', value: 'medianBlur' },
    { label: '양방향 필터 (BilateralFilter)', value: 'bilateralFilter' },
  ],
  findContour: [{ label: 'Find Contour', value: 'findContour' }],
  brightness: [
    { label: '밝기 증가 (+)', value: 'plus' },
    { label: '밝기 감소 (-)', value: 'minus' },
  ],
  threshold: [
    { label: '일반 (Binary)', value: 'binary' },
    { label: 'Inverse', value: 'inverse' },
    { label: 'Tozero', value: 'tozero' },
    { label: 'TozeroInverse', value: 'tozeroInverse' },
  ],
};

export const DEFAULT_KERNEL_SIZES: Partial<Record<PrcType, number>> = {
  sobel: 3,
  laplacian: 3,
  gaussian: 5,
  blur: 5,
  gaussianBlur: 5,
  medianBlur: 5,
  bilateralFilter: 9,
};
