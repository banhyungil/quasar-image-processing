// prettier-ignore
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

// 파라미터 필드 정의
export interface ParamFieldDef {
  key: string;
  label: string;
  type: 'number' | 'select';
  default: number | string;
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: string | number }[];
}

export const PARAM_FIELDS: Record<string, ParamFieldDef[]> = {
  sobel: [
    { key: 'kernelSize', label: '커널 크기', type: 'number', default: 3, min: 1, max: 31, step: 2 },
    { key: 'dx', label: 'dx', type: 'number', default: 1, min: 0, max: 2, step: 1 },
    { key: 'dy', label: 'dy', type: 'number', default: 1, min: 0, max: 2, step: 1 },
    { key: 'scale', label: 'Scale', type: 'number', default: 1.0, min: 0.1, max: 10, step: 0.1 },
  ],
  laplacian: [
    { key: 'kernelSize', label: '커널 크기', type: 'number', default: 3, min: 1, max: 31, step: 2 },
    { key: 'scale', label: 'Scale', type: 'number', default: 1.0, min: 0.1, max: 10, step: 0.1 },
    { key: 'delta', label: 'Delta', type: 'number', default: 0, min: -255, max: 255, step: 1 },
  ],
  canny: [
    { key: 'threshold1', label: 'Threshold 1', type: 'number', default: 100, min: 0, max: 500, step: 1 },
    { key: 'threshold2', label: 'Threshold 2', type: 'number', default: 200, min: 0, max: 500, step: 1 },
    { key: 'apertureSize', label: 'Aperture 크기', type: 'number', default: 3, min: 3, max: 7, step: 2 },
  ],
  gaussian: [
    { key: 'kernelSize', label: '커널 크기', type: 'number', default: 5, min: 1, max: 31, step: 2 },
    { key: 'sigmaX', label: 'Sigma X', type: 'number', default: 0, min: 0, max: 50, step: 0.5 },
  ],
  blur: [{ key: 'kernelSize', label: '커널 크기', type: 'number', default: 5, min: 1, max: 31, step: 2 }],
  gaussianBlur: [
    { key: 'kernelSize', label: '커널 크기', type: 'number', default: 5, min: 1, max: 31, step: 2 },
    { key: 'sigmaX', label: 'Sigma X', type: 'number', default: 0, min: 0, max: 50, step: 0.5 },
  ],
  medianBlur: [{ key: 'kernelSize', label: '커널 크기', type: 'number', default: 5, min: 1, max: 31, step: 2 }],
  bilateralFilter: [
    { key: 'd', label: 'd (직경)', type: 'number', default: 9, min: 1, max: 30, step: 1 },
    { key: 'sigmaColor', label: 'Sigma Color', type: 'number', default: 75, min: 1, max: 300, step: 1 },
    { key: 'sigmaSpace', label: 'Sigma Space', type: 'number', default: 75, min: 1, max: 300, step: 1 },
  ],
  boxFilter: [{ key: 'kernelSize', label: '커널 크기', type: 'number', default: 5, min: 1, max: 31, step: 2 }],
  findContour: [
    { key: 'thresholdValue', label: 'Threshold', type: 'number', default: 127, min: 0, max: 255, step: 1 },
    { key: 'thickness', label: '두께', type: 'number', default: 2, min: 1, max: 10, step: 1 },
  ],
  convexHull: [
    { key: 'thresholdValue', label: 'Threshold', type: 'number', default: 127, min: 0, max: 255, step: 1 },
    { key: 'thickness', label: '두께', type: 'number', default: 2, min: 1, max: 10, step: 1 },
  ],
  boundingBox: [
    { key: 'thresholdValue', label: 'Threshold', type: 'number', default: 127, min: 0, max: 255, step: 1 },
    { key: 'thickness', label: '두께', type: 'number', default: 2, min: 1, max: 10, step: 1 },
  ],
  plus: [
    { key: 'alpha', label: 'Alpha (대비)', type: 'number', default: 1.0, min: 0.1, max: 5, step: 0.1 },
    { key: 'beta', label: 'Beta (밝기)', type: 'number', default: 40, min: -255, max: 255, step: 1 },
  ],
  minus: [
    { key: 'alpha', label: 'Alpha (대비)', type: 'number', default: 1.0, min: 0.1, max: 5, step: 0.1 },
    { key: 'beta', label: 'Beta (밝기)', type: 'number', default: 40, min: -255, max: 255, step: 1 },
  ],
  gamma: [{ key: 'gamma', label: 'Gamma', type: 'number', default: 1.0, min: 0.1, max: 5, step: 0.1 }],
  binary: [
    { key: 'thresholdValue', label: 'Threshold', type: 'number', default: 127, min: 0, max: 255, step: 1 },
    { key: 'maxValue', label: 'Max Value', type: 'number', default: 255, min: 0, max: 255, step: 1 },
  ],
  inverse: [
    { key: 'thresholdValue', label: 'Threshold', type: 'number', default: 127, min: 0, max: 255, step: 1 },
    { key: 'maxValue', label: 'Max Value', type: 'number', default: 255, min: 0, max: 255, step: 1 },
  ],
  tozero: [
    { key: 'thresholdValue', label: 'Threshold', type: 'number', default: 127, min: 0, max: 255, step: 1 },
    { key: 'maxValue', label: 'Max Value', type: 'number', default: 255, min: 0, max: 255, step: 1 },
  ],
  tozeroInverse: [
    { key: 'thresholdValue', label: 'Threshold', type: 'number', default: 127, min: 0, max: 255, step: 1 },
    { key: 'maxValue', label: 'Max Value', type: 'number', default: 255, min: 0, max: 255, step: 1 },
  ],
  truncate: [
    { key: 'thresholdValue', label: 'Threshold', type: 'number', default: 127, min: 0, max: 255, step: 1 },
    { key: 'maxValue', label: 'Max Value', type: 'number', default: 255, min: 0, max: 255, step: 1 },
  ],
  otsu: [
    { key: 'thresholdValue', label: 'Threshold', type: 'number', default: 127, min: 0, max: 255, step: 1 },
    { key: 'maxValue', label: 'Max Value', type: 'number', default: 255, min: 0, max: 255, step: 1 },
  ],
  adaptive: [
    { key: 'maxValue', label: 'Max Value', type: 'number', default: 255, min: 0, max: 255, step: 1 },
    {
      key: 'adaptiveMethod',
      label: 'Adaptive Method',
      type: 'select',
      default: 'gaussian',
      options: [
        { label: 'Gaussian', value: 'gaussian' },
        { label: 'Mean', value: 'mean' },
      ],
    },
    { key: 'blockSize', label: 'Block Size', type: 'number', default: 11, min: 3, max: 99, step: 2 },
    { key: 'c', label: 'C', type: 'number', default: 2, min: -50, max: 50, step: 0.5 },
  ],
  erosion: [
    { key: 'kernelSize', label: '커널 크기', type: 'number', default: 5, min: 1, max: 31, step: 2 },
    {
      key: 'kernelShape',
      label: '커널 모양',
      type: 'select',
      default: 'rect',
      options: [
        { label: '사각형', value: 'rect' },
        { label: '십자형', value: 'cross' },
        { label: '타원형', value: 'ellipse' },
      ],
    },
    { key: 'iterations', label: '반복 횟수', type: 'number', default: 1, min: 1, max: 20, step: 1 },
  ],
  dilation: [
    { key: 'kernelSize', label: '커널 크기', type: 'number', default: 5, min: 1, max: 31, step: 2 },
    {
      key: 'kernelShape',
      label: '커널 모양',
      type: 'select',
      default: 'rect',
      options: [
        { label: '사각형', value: 'rect' },
        { label: '십자형', value: 'cross' },
        { label: '타원형', value: 'ellipse' },
      ],
    },
    { key: 'iterations', label: '반복 횟수', type: 'number', default: 1, min: 1, max: 20, step: 1 },
  ],
  opening: [
    { key: 'kernelSize', label: '커널 크기', type: 'number', default: 5, min: 1, max: 31, step: 2 },
    {
      key: 'kernelShape',
      label: '커널 모양',
      type: 'select',
      default: 'rect',
      options: [
        { label: '사각형', value: 'rect' },
        { label: '십자형', value: 'cross' },
        { label: '타원형', value: 'ellipse' },
      ],
    },
    { key: 'iterations', label: '반복 횟수', type: 'number', default: 1, min: 1, max: 20, step: 1 },
  ],
  closing: [
    { key: 'kernelSize', label: '커널 크기', type: 'number', default: 5, min: 1, max: 31, step: 2 },
    {
      key: 'kernelShape',
      label: '커널 모양',
      type: 'select',
      default: 'rect',
      options: [
        { label: '사각형', value: 'rect' },
        { label: '십자형', value: 'cross' },
        { label: '타원형', value: 'ellipse' },
      ],
    },
    { key: 'iterations', label: '반복 횟수', type: 'number', default: 1, min: 1, max: 20, step: 1 },
  ],
};
