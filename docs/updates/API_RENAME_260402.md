API_RENAME_260402:09

- src/apis 전반의 함수명을 가이드 패턴(fetch/create/update/remove)에 맞춰 정리했다.
- filesApi의 주요 CRUD 함수명을 fetchList/create/update/remove로 변경하고, 조회성 함수명 getOriginSizeUrl을 fetchOriginSizeUrl로 변경했다.
- processesApi, presetsApi, customFilterApi의 get/create/update/delete 계열 함수명을 fetch/create/update/remove 형태로 통일했다.
- 컴포넌트와 composable 사용부(ImageGalleryDialog, ImgPrcPage, FilterListPanel, CustomFilterEditorDialog, useCropManager)에서 변경된 API 함수명으로 호출 코드를 갱신했다.
- tests/apis/filesApi.test.ts의 import 및 호출 함수명을 신규 API 명세에 맞춰 수정했다.
