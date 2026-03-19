# 프론트 API 레이어 정리

## 현재 상태
- `imgPrcApi.ts` 하나에 모든 API가 집중
- 경로가 전부 `/image-processing/*`으로 되어있음
- 백엔드는 `/files/*`, `/filters/*`로 정리 완료

## 변경: imgPrcApi.ts → filesApi.ts

모든 API가 `/files` 리소스 하위이므로 `filesApi.ts` 하나로 통합.

### filesApi.ts — 전체 API (`/files`)

#### 파일 CRUD
| 함수 | 현재 경로 | 변경 경로 |
|---|---|---|
| `getFiles` (기존 getProcessingImage) | GET `/image-processing` | GET `/files` |
| `deleteFile` | DELETE `/image-processing/{id}` | DELETE `/files/{id}` |
| `renameFile` | PATCH `/image-processing/{id}` | PATCH `/files/{id}` |
| `uploadFile` | POST `/image-processing/upload` | POST `/files/upload` |
| `saveProcessingImage` | POST `/image-processing/save` | POST `/files/save` |

#### 처리
| 함수 | 현재 경로 | 변경 경로 |
|---|---|---|
| `batchTreeProcessing` | POST `/image-processing/batch-tree` | POST `/files/process/batch-tree` |

#### Crop
| 함수 | 현재 경로 | 변경 경로 |
|---|---|---|
| `createCrop` (기존 previewCrop) | POST `/image-processing/preview/crop` | POST `/files/crop` |
| `applyCrop` (기존 previewApply) | POST `/image-processing/preview/apply` | POST `/files/crop/apply` |
| `applyCropAll` (기존 previewApplyAll) | POST `/image-processing/preview/apply-all` | POST `/files/crop/apply-all` |
| `deleteCrop` (기존 previewDelete) | DELETE `/image-processing/preview/crop/{fId}/{cId}` | DELETE `/files/crop/{fId}/{cId}` |

#### DZI / 다운로드
| 함수 | 현재 경로 | 변경 경로 |
|---|---|---|
| `getOriginSizeUrl` | POST `/image-processing/dzi/{id}` | POST `/files/dzi/{id}` |
| `downloadNodeImage` | POST `/image-processing/download/{id}` | POST `/files/download/{id}` |

## 호출부 import 수정 대상

### ImgPrcPage.vue
| 현재 | 변경 |
|---|---|
| `import * as imgPrcApi` | `import * as filesApi` |
| `imgPrcApi.uploadFile` | `filesApi.uploadFile` |
| `imgPrcApi.batchTreeProcessing` | `filesApi.batchTreeProcessing` |
| `imgPrcApi.downloadNodeImage` | `filesApi.downloadNodeImage` |

### ImageGalleryDialog.vue
| 현재 | 변경 |
|---|---|
| `import * as imgPrcApi` | `import * as filesApi` |
| `imgPrcApi.getProcessingImage` | `filesApi.getFiles` |
| `imgPrcApi.uploadFile` | `filesApi.uploadFile` |
| `imgPrcApi.deleteFile` | `filesApi.deleteFile` |
| `imgPrcApi.renameFile` | `filesApi.renameFile` |

### useCropManager.ts
| 현재 | 변경 |
|---|---|
| `import * as imgPrcApi` | `import * as filesApi` |
| `imgPrcApi.previewCrop` | `filesApi.createCrop` |
| `imgPrcApi.previewDelete` | `filesApi.deleteCrop` |

### usePreviewManager.ts
| 현재 | 변경 |
|---|---|
| `import * as imgPrcApi` | `import * as filesApi` |
| `imgPrcApi.previewApply` | `filesApi.applyCrop` |
| `imgPrcApi.previewApplyAll` | `filesApi.applyCropAll` |

### ImageZoomPopup.vue
| 현재 | 변경 |
|---|---|
| `import * as imgPrcApi` | `import * as filesApi` |
| `imgPrcApi.getOriginSizeUrl` | `filesApi.getOriginSizeUrl` |

## 삭제 대상
- `imgPrcApi.ts` — 삭제 (filesApi.ts로 완전 대체)
- `filesApi.ts` (이미 생성 시작한 파일) — 내용 보강 후 사용

## 진행 순서
1. `filesApi.ts` 완성 (모든 함수 + 경로 변경)
2. 호출부 import 수정 (5개 파일)
3. `imgPrcApi.ts` 삭제
4. 동작 확인
