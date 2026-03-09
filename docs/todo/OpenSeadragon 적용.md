# OpenSeadragon 적용 계획

## 배경

현재 `ImageZoomPopup.vue`에서 `vue3-zoomer`(ZoomImg)를 사용 중이다.
일반 이미지(~4000px 이하)에는 충분하지만, 고해상도 이미지(10MP+)에서는 브라우저 메모리·렌더링 한계에 부딪힌다.
백엔드(fastapi-server)에서 `pyvips.dzsave`로 DZI 타일을 생성하고, 프론트에서 OpenSeadragon으로 타일 기반 뷰어를 제공한다.

## 적용 범위

| 이미지 크기 | 뷰어 | 비고 |
|---|---|---|
| 한 변 < 4000px | 기존 ZoomImg | 변경 없음 |
| 한 변 >= 4000px | OpenSeadragon | DZI 타일 기반 |

백엔드 API 응답에 `dziUrl` 필드가 있으면 OpenSeadragon, 없으면 기존 ZoomImg를 사용한다.

## 구현 단계

### 1. 패키지 설치

```bash
npm install openseadragon
npm install -D @types/openseadragon
```

### 2. OpenSeadragon 뷰어 컴포넌트 생성

`src/components/flow/OsdViewer.vue` — OpenSeadragon을 래핑하는 컴포넌트.

```vue
<script setup lang="ts">
import OpenSeadragon from 'openseadragon';

const props = defineProps<{
  dziUrl: string;
}>();

const container = ref<HTMLElement>();
let viewer: OpenSeadragon.Viewer | null = null;

onMounted(() => {
  viewer = OpenSeadragon({
    element: container.value!,
    tileSources: props.dziUrl,
    showNavigator: true,
    navigatorPosition: 'BOTTOM_RIGHT',
    showNavigationControl: true,
    minZoomLevel: 0.5,
    maxZoomLevel: 20,
    animationTime: 0.3,
    prefixUrl: '', // 버튼 이미지는 Quasar 아이콘으로 대체
  });
});

onBeforeUnmount(() => {
  viewer?.destroy();
  viewer = null;
});

watch(() => props.dziUrl, (url) => {
  if (viewer) {
    viewer.open(url);
  }
});
</script>

<template>
  <div ref="container" class="osd-viewer" />
</template>

<style scoped>
.osd-viewer {
  width: 100%;
  height: 100%;
}
</style>
```

### 3. ImageZoomPopup 분기 처리

`ImageZoomPopup.vue`의 props에 `dziUrl`을 추가하고, 조건부로 뷰어를 전환한다.

```vue
<script setup lang="ts">
import { ZoomImg } from 'vue3-zoomer';
import OsdViewer from './OsdViewer.vue';

defineProps<{
  src: string | null;
  dziUrl?: string;    // 추가: DZI URL이 있으면 OpenSeadragon 사용
  title?: string;
}>();
</script>

<template>
  <!-- 이미지 영역 -->
  <div class="col" style="min-height: 0; position: relative">
    <!-- DZI 타일 뷰어 -->
    <OsdViewer v-if="dziUrl" :dzi-url="dziUrl" class="fit" />
    <!-- 일반 이미지 뷰어 -->
    <div v-else-if="src" class="zoom-container">
      <ZoomImg :src="src" :zoom-scale="3" :step="1" />
    </div>
    <div v-else class="fit column items-center justify-center text-grey-5">
      이미지가 없습니다
    </div>
  </div>
</template>
```

### 4. FilterNode에서 dziUrl 전달

백엔드 응답의 `dziUrl` 필드를 노드 데이터에 저장하고, 줌 팝업 열 때 전달한다.

```ts
// FilterNode에서 zoom 이벤트 emit 시
emit('zoom', { src: thumbnailUrl, dziUrl: result.dziUrl });
```

### 5. 백엔드 연동 (fastapi-server 쪽)

> 상세 내용은 fastapi-server `docs/done/고해상도 이미지 대응.md` 참조

- 처리 결과 이미지가 4000px 이상이면 `pyvips.dzsave`로 DZI 타일 생성
- API 응답에 `dziUrl` 필드 추가
- 타일 디렉토리를 StaticFiles로 서빙

## 고려사항

- **네비게이터(미니맵)**: OpenSeadragon 내장 navigator 활성화하여 현재 뷰포트 위치 표시
- **기존 드래그 이동과의 충돌**: OsdViewer 영역 내 마우스 이벤트는 OpenSeadragon이 처리하므로, 팝업 헤더에서만 드래그 이동이 발생하는 현재 구조와 충돌 없음
- **메모리 관리**: OpenSeadragon viewer는 팝업 닫힐 때 `destroy()` 호출 필수
- **네트워크 캐싱**: DZI 타일은 정적 파일이므로 브라우저 캐시 활용 가능
