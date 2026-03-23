# Crop 선택 시 SourceNode 이미지 교체

## Context

Crop 선택 시 SourceNode의 이미지를 crop 이미지로 교체하여,
이후 필터 체인이 crop 이미지 기준으로 처리되도록 한다.
Crop 탭에서 원본 이미지도 표시하여 원본으로 복귀할 수 있게 한다.

## 변경 파일

| 파일 | 작업 | 설명 |
|---|---|---|
| `src/components/sidebar/CropListPanel.vue` | 수정 | 원본 이미지 항목 추가 |
| `src/pages/ImgPrcPage.vue` | 수정 | Crop 선택 시 SourceNode 이미지 교체 로직 |

## 구현 계획

### 1. CropListPanel에 원본 이미지 항목 추가

```
Crop 탭:
┌────────────────┐
│ 📷 원본 이미지  │ ← activeCropId === null 이면 활성 표시
├────────────────┤
│ ✂ Crop 1       │ ← 클릭 시 emit('select-crop', cropId)
│ ✂ Crop 2       │
└────────────────┘
```

- props에 `originalThumbnailUrl: string | null` 추가
- 맨 위에 원본 이미지 항목 표시 (항상)
- 원본 클릭 시 `emit('clear-crop')` → SourceNode가 원본으로 복귀

### 2. ImgPrcPage — Crop 선택 시 SourceNode 이미지 교체

`onSelectCrop(cropId)`:
1. `cropMgr.activeCropId` 설정
2. SourceNode의 `previewUrl`/`thumbnailUrl`을 crop 이미지 URL로 교체
3. `processAllLeaves()` 호출

`onClearCrop()`:
1. `cropMgr.activeCropId = null`
2. SourceNode의 이미지를 원본으로 복원
3. `processAllLeaves()` 호출

SourceNode 이미지 교체 — `SourceNodeData.previewUrl` 변경:
```ts
// crop 선택
const crop = cropMgr.cropList.value.find(c => c.cropId === cropId);
sourceNode.data.previewUrl = crop.nodeImageUrl;
sourceNode.data.thumbnailUrl = null;  // crop은 썸네일 없음

// 원본 복원
sourceNode.data.previewUrl = oOrigin.value.imageUrl;
sourceNode.data.thumbnailUrl = `${API_HOST}/api/files/thumbnail/${oOrigin.value.fileId}`;
```

## 검증

1. Crop 선택 → SourceNode 이미지가 crop으로 변경 확인
2. Crop 탭에서 원본 클릭 → SourceNode가 원본으로 복귀 확인
3. Crop 변경 후 필터 노드들이 재처리되는지 확인
