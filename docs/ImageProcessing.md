# 영상처리 필터 종류

✅ = 구현됨

---

## 1. 필터링 (Edge Detection)

엣지(윤곽선)를 검출하는 미분 기반 필터.

| 필터 | prcType | 커널 기본값 | 특징 |
|------|---------|------------|------|
| ✅ 소벨 (Sobel) | `sobel` | 3 | x/y 방향 1차 미분. 노이즈에 비교적 강함 |
| ✅ 프르윗 (Prewitt) | `prewitt` | - | Sobel과 유사, 가중치 균일 |
| ✅ 라플라시안 (Laplacian) | `laplacian` | 3 | 2차 미분. 방향 무관 엣지 검출, 노이즈에 민감 |
| ✅ 가우시안 (Gaussian) | `gaussian` | 5 | 스무딩 후 엣지 강조 (LoG 방식) |
| Canny | - | - | 다단계 엣지 검출, 가장 정밀 |
| Roberts | - | - | 대각선 방향 미분 |

---

## 2. 블러링 (Blurring / Smoothing)

노이즈 제거, 이미지 부드럽게 처리.

| 필터 | prcType | 커널 기본값 | 특징 |
|------|---------|------------|------|
| ✅ 블러 (Average Blur) | `blur` | 5 | 단순 평균. 빠르지만 엣지 손실 큼 |
| ✅ 가우시안 블러 (Gaussian Blur) | `gaussianBlur` | 5 | 가우시안 가중 평균. 자연스러운 블러 |
| ✅ 중앙값 블러 (Median Blur) | `medianBlur` | 5 | 중앙값 사용. salt-and-pepper 노이즈 제거에 효과적 |
| ✅ 양방향 필터 (Bilateral Filter) | `bilateralFilter` | 9 | 엣지 보존 블러. 색상/공간 거리 동시 고려 |
| Box Filter | - | - | Average Blur와 유사, 정규화 옵션 있음 |

---

## 3. 윤곽선 검출 (Contour Detection)

객체의 외곽선을 찾아 표시.

| 필터 | prcType | 특징 |
|------|---------|------|
| ✅ Find Contour | `findContour` | 이진화 후 윤곽선 검출 및 시각화 |
| Convex Hull | - | 윤곽선의 볼록 껍질 |
| Bounding Box | - | 윤곽선의 외접 사각형 |

---

## 4. 밝기 변환 (Brightness)

픽셀 값에 상수를 더하거나 빼서 밝기 조절.

| 필터 | prcType | 특징 |
|------|---------|------|
| ✅ 밝기 증가 | `plus` | 픽셀 + 상수 (클리핑: max 255) |
| ✅ 밝기 감소 | `minus` | 픽셀 - 상수 (클리핑: min 0) |
| 감마 보정 | - | 비선형 밝기 변환 |
| 히스토그램 평탄화 | - | 밝기 분포 균등화 |

---

## 5. 이진화 (Thresholding)

픽셀을 임계값 기준으로 0 또는 255로 변환.

| 필터 | prcType | 특징 |
|------|---------|------|
| ✅ Binary | `binary` | 임계값 이상 → 255, 미만 → 0 |
| ✅ Inverse | `inverse` | Binary 반전 |
| ✅ Tozero | `tozero` | 임계값 미만 → 0, 이상 → 원본 유지 |
| ✅ TozeroInverse | `tozeroInverse` | Tozero 반전 |
| Truncate | - | 임계값 초과 → 임계값으로 클리핑 |
| Otsu | - | 자동 임계값 결정 |
| Adaptive | - | 영역별 로컬 임계값 적용 |

---

## 6. 형태학적 처리 (Morphological)

> 미구현 카테고리

| 필터 | 특징 |
|------|------|
| 침식 (Erosion) | 객체 축소, 노이즈 제거 |
| 팽창 (Dilation) | 객체 확장 |
| 열기 (Opening) | 침식 후 팽창. 작은 노이즈 제거 |
| 닫기 (Closing) | 팽창 후 침식. 작은 구멍 메움 |
