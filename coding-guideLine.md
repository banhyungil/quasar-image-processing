# Coding Guidline

## Import

- store, composable, 기타, package 순으로 작성.
  - 알파벳 순으로 정렬
- 각 그룹별로 공백 한 칸 씩

## store, composable 사용

- script 최 상단에서 선언 후 사용
  - store - composable 순으로 작성

- store
  - side effect logic을 포함시키지 않는다. store는 중앙 상태관리를 위한 용도이므로 다양한 곳에서 호출 될 수 있기 때문
    - side effect logic이 있다면 동일한 life cycle을 가지는 곳에서 동시 사용 시 side effect 중첩이 생길 수 있다.

- composable
  - side effect logic이 있을 수 있음. 대신 unMounted hook에서 해제 하는 과정을 꼭 포함시킬것. 메모리 누수를 방지하기 위함.
  - watch는 unMounted hook에서 자동으로 해제됨. 그러나 Event는 해제가 안되므로 unMounted에서 꼭 해제하도록
  - setup root scope에서 선언해야 된다. 그렇지 않으면 component lifecycle hook을 주입받을 수 없음(onMounted, unMounted 등과 같은 hook 사용 불가능)
  - setup root scope에서 사용하더라도. watch immediate가 발동하면 setup process가 종료된다. watch immediate가 선언된 composable은 사용시 제일 마지막에 사용하도록 한다.

## Naming

### Event

- 'on' prefix를 사용
- 1. 기본 event에 따라 naming
- 기본 event는 "(기본 event 명)(name)"을 사용한다.
  - 예) onClickMarker, onClickPmarker
- 2. 기능에 따라 naming
  - 예) onCreate, onRemove

### emit

- 기능명을 사용하여 emit한다.
- 보통 이벤트에 따라 emit하는 경우가 많다. 이벤트명에서 'on' prefix를 제거 한 naming을 따른다.
- 예) onDelete -> emit('delete'), onRemove -> emit('remove')

### Store

- postfix : 'Store'
  - <이름>Store
  - 예) const heatMapStore = useHeatMapStore()
- setter 설정
  - 단일 값인 경우는 setter 함수를 생성해준다. 값 변경 추적시 용이하다.
  - 참조값인 경우는 별도 setter없이 참조 값을 직접 바꾸는 것을 허용한다.
    - setter로 하는 경우는 삭제, 추가 등 많은 경우에 대비하여 생성해줘야 하기 떄문이다.
- 제약사항
  - store내에서는 composeble 함수를 사용하지 않는것으로 한다
    - composable에 watch나 provide, inject등 component와 관련된 함수가 있을 가능성이 높기 떄문이다.

### Computed

- prefix : 'c'
  - c<이름>
  - 예) const cIsUlEdit = computed(() => userLayerEdit.value != null);

### key-Row Object

- DB에서 조회한 Rows는 Array 형태를 띈다.
- Rows 조작은 빈번 하기 때문에 대부분 Row Key를 이용하여 Object 형식으로 변환하여 조작한다.
- 1. object 이용
- 이때 key-row Object Naming은 prefix 'd'를 사용한다.
  - key-row 구조로 변환 시 Lodash에 'keyBy' 함수를 사용하면 편리하다.
  - 예)
    "`"
const places = [{placeId:1, placeName:'place1'}, {placeId:2, placeName:'place2'}]
const dPlace = _.keyBy(places, 'placeId');_
"`"
- 2. Map 객체 이용
- key 값에 대해 삭제도 수행할시에는 Map 객체를 이용하는 것이 좋다.
- has, delete와 같이 api가 잘 구현되어 있고, typescript와 호환성도 좋다.
- prefix는 'm'을 사용한다
- 예)
- "```"
- const mPlace = ...
- "```"

### 변수

- selected -> sel

### 내장 속성 prefix

- 현재 네이버는 '\_'를 내장 속성으로 사용하고 있다.
- 다른 라이브러리들도 '\_'를 내장 속성으로 사용하는 경우가 많다.
- 그러므로 안정성을 위해 dms는 '$'를 내장속성 prefix로 사용한다.
