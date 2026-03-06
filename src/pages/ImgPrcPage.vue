<script setup lang="ts">
//
// - 이미지와 여러 알고리즘 처리 절차를 한눈에 볼수있는 화면
// - 하나에 이미지에 여러 알고리즘을 적용할 수 있음
// - 알고리즘과 적용되는 옵션이 한눈에 들어와야 됨
// - 적용순서도 쉽게 볼수있어야한다.
// - 알고리즘이라는건 고정적인게 아니라 동적으로 추가가능한 사항이다.
// - 알고리즘 OFF 기능은 적용할 알고리즘 리스트에 따라 재연산 기능을 수행하도록 한다.

import { VueDraggableNext } from 'vue-draggable-next';
import { FN_LIST, FN_OPTIONS_MAP, PARAM_FIELDS } from 'src/constants/imgPrc';
import type { FunctionKey, ParamFieldDef } from 'src/constants/imgPrc';
import { batchProcessing } from 'src/apis/imgPrcApi';
import type { PrcType } from 'src/apis/imgPrcApi';
import {
  getPresets,
  createPreset,
  updatePreset as updatePresetApi,
  deletePreset as deletePresetApi,
} from 'src/apis/presetApi';
import type { PresetResponse } from 'src/apis/presetApi';
import { getProcesses, getProcess } from 'src/apis/processApi';
import type { ProcessResponse } from 'src/apis/processApi';
import { ZoomImg } from 'vue3-zoomer';

const CATEGORY_ICONS: Record<FunctionKey, string> = {
  filtering: 'filter_alt',
  blurring: 'blur_on',
  findContour: 'category',
  brightness: 'brightness_6',
  threshold: 'tonality',
};

interface NodeItem {
  id: string;
  prcType: PrcType;
  label: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
}

const showOptionPanel = ref(false);
const optionPanelTarget = ref<string | null>(null); // node ID
const nodeList = ref<NodeItem[]>([]);
const presets = ref<PresetResponse[]>([]);
const processList = ref<ProcessResponse[]>([]);
const mainTab = ref<'list' | 'prc' | 'prcFlow'>('list');
const nodeListExpanded = ref(true);
const presetExpanded = ref(false);
const showSavePresetDialog = ref(false);
const presetName = ref('');
const presetDescription = ref('');
const editingPresetId = ref<string | null>(null);
const showEditPresetDialog = ref(false);
const editPresetName = ref('');
const editPresetDescription = ref('');

// 원본 이미지 관련
const originalFile = ref<File | null>(null);
const originalPreviewUrl = ref<string | null>(null);
const originalInputRef = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

// 처리 결과 관련
const resultPreviewUrl = ref<string | null>(null);
const totalExecutionMs = ref(0);
const isProcessing = ref(false);

function setOriginalFile(file: File | null) {
  if (file == null) {
    originalFile.value = null;
    if (originalPreviewUrl.value) {
      URL.revokeObjectURL(originalPreviewUrl.value);
      originalPreviewUrl.value = null;
    }
    if (originalInputRef.value) {
      originalInputRef.value.value = '';
    }
    return;
  }
  if (!file.type.startsWith('image/')) return;
  originalFile.value = file;
  if (originalPreviewUrl.value) {
    URL.revokeObjectURL(originalPreviewUrl.value);
  }
  originalPreviewUrl.value = URL.createObjectURL(file);
}

function openOriginalPicker() {
  originalInputRef.value?.click();
}

function onOriginalInputChange(event: Event) {
  const input = event.target as HTMLInputElement;
  setOriginalFile(input.files?.[0] ?? null);
}

function onOriginalDrop(event: DragEvent) {
  isDragOver.value = false;
  setOriginalFile(event.dataTransfer?.files?.[0] ?? null);
}

// 초기 데이터 로드
onMounted(async () => {
  await Promise.all([loadPresets(), loadProcessList()]);
});

async function loadPresets() {
  const res = await getPresets();
  presets.value = res.items;
}

async function loadProcessList() {
  const res = await getProcesses();
  processList.value = res.items;
}

function toggleOptionPanel(nodeId: string) {
  if (optionPanelTarget.value === nodeId && showOptionPanel.value) {
    showOptionPanel.value = false;
    optionPanelTarget.value = null;
  } else {
    optionPanelTarget.value = nodeId;
    showOptionPanel.value = true;
  }
}

const selectedNode = computed(() =>
  nodeList.value.find((n) => n.id === optionPanelTarget.value) ?? null,
);

const selectedNodeFields = computed<ParamFieldDef[]>(() => {
  if (!selectedNode.value) return [];
  return PARAM_FIELDS[selectedNode.value.prcType] ?? [];
});

function getDefaultParams(prcType: string): Record<string, unknown> {
  const fields = PARAM_FIELDS[prcType];
  if (!fields) return {};
  return Object.fromEntries(fields.map((f) => [f.key, f.default]));
}

function updateParam(key: string, value: unknown) {
  if (!selectedNode.value) return;
  selectedNode.value.parameters[key] = value;
}

function addNode(prcType: PrcType, label: string) {
  nodeList.value.push({
    id: `${prcType}-${Date.now()}`,
    prcType,
    label,
    enabled: true,
    parameters: getDefaultParams(prcType),
  });
}

function removeNode(id: string) {
  if (optionPanelTarget.value === id) {
    showOptionPanel.value = false;
    optionPanelTarget.value = null;
  }
  const idx = nodeList.value.findIndex((n) => n.id === id);
  if (idx !== -1) nodeList.value.splice(idx, 1);
}

// Preset 저장 (API 연동)
async function savePreset() {
  if (!presetName.value.trim()) return;
  await createPreset({
    nm: presetName.value.trim(),
    description: presetDescription.value.trim() || null,
    steps: nodeList.value.map((n, i) => ({
      algorithmNm: n.prcType,
      stepOrder: i,
      parameters: { ...n.parameters },
    })),
  });
  presetName.value = '';
  presetDescription.value = '';
  showSavePresetDialog.value = false;
  await loadPresets();
}

// Preset 클릭 → 노드리스트 로드
function loadPreset(preset: PresetResponse) {
  nodeList.value = preset.steps.map((s) => ({
    id: `${s.algorithmNm}-${Date.now()}-${s.stepOrder}`,
    prcType: s.algorithmNm as PrcType,
    label: s.algorithmNm,
    enabled: true,
    parameters: { ...getDefaultParams(s.algorithmNm), ...(s.parameters ?? {}) },
  }));
}

// Preset 수정 다이얼로그 열기
function openEditPreset(preset: PresetResponse) {
  editingPresetId.value = preset.id;
  editPresetName.value = preset.nm;
  editPresetDescription.value = preset.description ?? '';
  showEditPresetDialog.value = true;
}

// Preset 수정 (API 연동)
async function confirmEditPreset() {
  if (!editingPresetId.value || !editPresetName.value.trim()) return;
  await updatePresetApi(editingPresetId.value, {
    nm: editPresetName.value.trim(),
    description: editPresetDescription.value.trim() || null,
  });
  showEditPresetDialog.value = false;
  editingPresetId.value = null;
  await loadPresets();
}

// Preset 삭제 (API 연동)
async function removePreset(presetId: string) {
  await deletePresetApi(presetId);
  await loadPresets();
}

// 배치 처리 실행
const enabledNodes = computed(() => nodeList.value.filter((n) => n.enabled));
const canProcess = computed(() => originalFile.value != null && enabledNodes.value.length > 0);

async function onProcessBatch() {
  if (!originalFile.value || enabledNodes.value.length === 0) return;
  isProcessing.value = true;
  try {
    const steps = enabledNodes.value.map((n) => ({
      prcType: n.prcType,
      parameters: { ...n.parameters },
    }));
    const result = await batchProcessing(originalFile.value, steps);
    if (resultPreviewUrl.value) {
      URL.revokeObjectURL(resultPreviewUrl.value);
    }
    resultPreviewUrl.value = URL.createObjectURL(result.blob);
    totalExecutionMs.value = result.totalExecutionMs;
  } finally {
    isProcessing.value = false;
  }
}

// 처리목록 더블클릭 → 메인탭 이동 + 노드리스트 로드
async function onProcessDblClick(process: ProcessResponse) {
  // 상세 조회로 최신 steps 가져오기
  const detail = await getProcess(process.id);
  nodeList.value = detail.steps.map((s) => ({
    id: `${s.algorithmNm}-${Date.now()}-${s.stepOrder}`,
    prcType: s.algorithmNm as PrcType,
    label: s.algorithmNm,
    enabled: s.isEnabled,
    parameters: { ...getDefaultParams(s.algorithmNm), ...(s.parameters ?? {}) },
  }));
  mainTab.value = 'prc';
}
</script>

<template>
  <q-page class="fit row overflow-hidden">
    <!-- 1. 사이드바: 카테고리별 필터함수 목록 -->
    <div
      class="column"
      style="width: 260px; min-width: 260px; border-right: 1px solid rgba(0, 0, 0, 0.12)"
    >
      <q-scroll-area class="fit">
        <q-list>
          <q-expansion-item
            v-for="fn in FN_LIST"
            :key="fn.value"
            :icon="CATEGORY_ICONS[fn.value]"
            :label="fn.label"
            default-opened
            expand-separator
          >
            <div
              v-for="option in FN_OPTIONS_MAP[fn.value]"
              :key="option.value"
              class="q-px-sm q-py-xs"
            >
              <q-card flat bordered>
                <q-card-section class="q-pa-xs row items-center no-wrap q-gutter-x-xs">
                  <q-icon
                    :name="CATEGORY_ICONS[fn.value]"
                    size="xs"
                    color="primary"
                    class="q-ml-xs"
                  />
                  <div class="col text-caption ellipsis">{{ option.label }}</div>
                  <q-btn
                    flat
                    round
                    dense
                    size="xs"
                    icon="add"
                    color="positive"
                    @click="addNode(option.value, option.label)"
                  >
                    <q-tooltip>노드에 추가</q-tooltip>
                  </q-btn>
                </q-card-section>
              </q-card>
            </div>
          </q-expansion-item>
        </q-list>
      </q-scroll-area>
    </div>

    <!-- 메인 영역 -->
    <div class="row col min-h-0 overflow-hidden">
      <!-- 2. 노드 리스트 + Preset 아코디언 -->
      <div
        class="col-4"
        style="border-bottom: 1px solid rgba(0, 0, 0, 0.12); overflow-y: auto; flex-shrink: 0"
      >
        <!-- 노드 리스트 섹션 -->
        <q-expansion-item v-model="nodeListExpanded" expand-separator>
          <template #header>
            <q-item-section avatar>
              <q-icon name="account_tree" />
            </q-item-section>
            <q-item-section>노드 리스트</q-item-section>
            <q-item-section side>
              <q-btn
                flat
                dense
                size="sm"
                icon="save"
                label="Preset 저장"
                color="secondary"
                :disabled="nodeList.length === 0"
                @click.stop="showSavePresetDialog = true"
              />
            </q-item-section>
          </template>

          <div class="q-pa-sm">
            <div v-if="nodeList.length === 0" class="text-center text-caption text-grey-6 q-pa-md">
              사이드바에서 필터함수를 추가하세요
            </div>
            <VueDraggableNext v-model="nodeList" handle=".cursor-grab" item-key="id">
              <div
                v-for="(node, index) in nodeList"
                :key="node.id"
                class="row items-center no-wrap q-pa-xs q-mb-xs rounded-borders node-item"
                :class="{ 'bg-grey-2': !node.enabled }"
              >
                <q-icon
                  name="drag_indicator"
                  color="grey-5"
                  size="sm"
                  class="q-mr-xs cursor-grab"
                />
                <span class="text-caption text-grey-6 q-mr-xs">{{ index + 1 }}.</span>
                <div class="col text-body2 ellipsis" :class="{ 'text-grey-5': !node.enabled }">
                  {{ node.label }}
                </div>
                <q-btn
                  flat
                  round
                  dense
                  size="xs"
                  icon="tune"
                  :color="
                    optionPanelTarget === node.id && showOptionPanel ? 'primary' : 'grey-5'
                  "
                  @click="toggleOptionPanel(node.id)"
                />
                <q-toggle v-model="node.enabled" dense size="xs" />
                <q-btn
                  flat
                  round
                  dense
                  size="xs"
                  icon="close"
                  color="negative"
                  @click="removeNode(node.id)"
                />
              </div>
            </VueDraggableNext>
          </div>
        </q-expansion-item>

        <!-- Preset 섹션 -->
        <q-expansion-item v-model="presetExpanded" icon="bookmarks" label="Preset" expand-separator>
          <div class="q-pa-sm">
            <div v-if="presets.length === 0" class="text-center text-caption text-grey-6 q-pa-md">
              저장된 Preset이 없습니다
            </div>
            <div
              v-for="preset in presets"
              :key="preset.id"
              class="row items-center no-wrap q-pa-xs q-mb-xs rounded-borders bg-grey-1"
              style="border: 1px solid rgba(0, 0, 0, 0.1)"
            >
              <div class="col text-body2 ellipsis cursor-pointer" @click="loadPreset(preset)">
                {{ preset.nm }}
              </div>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="edit"
                color="grey-7"
                @click.stop="openEditPreset(preset)"
              >
                <q-tooltip>수정</q-tooltip>
              </q-btn>
              <q-btn
                flat
                round
                dense
                size="xs"
                icon="delete"
                color="negative"
                @click.stop="removePreset(preset.id)"
              >
                <q-tooltip>삭제</q-tooltip>
              </q-btn>
            </div>
          </div>
        </q-expansion-item>
      </div>

      <!-- 3. 파라미터 패널 (필터별 토글) -->
      <transition name="slide-option">
        <div
          v-if="showOptionPanel && optionPanelTarget"
          class="column option-panel"
          style="width: 220px; min-width: 220px; border-right: 1px solid rgba(0, 0, 0, 0.12)"
        >
          <div
            class="row items-center no-wrap q-px-sm q-py-xs"
            style="border-bottom: 1px solid rgba(0, 0, 0, 0.12); flex-shrink: 0"
          >
            <div class="col text-body2 text-weight-medium q-ml-xs">옵션</div>
            <q-btn flat round dense size="xs" icon="close" @click="showOptionPanel = false" />
          </div>
          <q-scroll-area class="col">
            <div v-if="selectedNode" class="q-pa-sm column q-gutter-sm">
              <div class="text-caption text-grey-7 q-mb-xs">{{ selectedNode.label }}</div>

              <template v-if="selectedNodeFields.length === 0">
                <div class="text-caption text-grey-5 text-center q-pt-md">
                  파라미터 없음
                </div>
              </template>

              <template v-for="field in selectedNodeFields" :key="field.key">
                <q-input
                  v-if="field.type === 'number'"
                  :model-value="selectedNode.parameters[field.key] as number"
                  @update:model-value="updateParam(field.key, Number($event))"
                  :label="field.label"
                  type="number"
                  :min="field.min"
                  :max="field.max"
                  :step="field.step"
                  outlined
                  dense
                />
                <q-select
                  v-else-if="field.type === 'select'"
                  :model-value="selectedNode.parameters[field.key]"
                  @update:model-value="updateParam(field.key, $event)"
                  :label="field.label"
                  :options="field.options"
                  emit-value
                  map-options
                  outlined
                  dense
                />
              </template>

              <q-btn
                flat
                dense
                size="sm"
                label="기본값 초기화"
                icon="restart_alt"
                color="grey-7"
                class="q-mt-sm"
                @click="selectedNode.parameters = getDefaultParams(selectedNode.prcType)"
              />
            </div>
          </q-scroll-area>
        </div>
      </transition>

      <!-- 4. 이미지 표시 탭 -->
      <div class="col column min-h-0">
        <div class="row items-center no-wrap">
          <q-tabs
            v-model="mainTab"
            dense
            align="left"
            active-color="primary"
            indicator-color="primary"
            class="col"
          >
            <q-tab name="list" label="처리목록" />
            <q-tab name="prc" label="메인" />
            <q-tab name="prcFlow" label="Flow" />
          </q-tabs>
          <div class="row q-gutter-xs q-px-sm">
            <q-btn
              flat
              dense
              size="md"
              icon="functions"
              label="처리"
              :loading="isProcessing"
              :disabled="!canProcess"
              @click="onProcessBatch"
            />
          </div>
        </div>
        <q-separator />

        <q-tab-panels v-model="mainTab" class="col" style="min-height: 0; overflow: hidden">
          <!-- 처리목록 탭 -->
          <q-tab-panel name="list" style="height: 100%; padding: 0">
            <q-scroll-area style="height: 100%">
              <div class="q-pa-sm">
                <div v-if="processList.length === 0" class="row justify-center q-pa-xl">
                  <span class="text-caption text-grey-6">처리된 이미지가 없습니다</span>
                </div>
                <q-list separator>
                  <q-item
                    v-for="proc in processList"
                    :key="proc.id"
                    clickable
                    @dblclick="onProcessDblClick(proc)"
                  >
                    <q-item-section avatar>
                      <q-icon name="image" color="primary" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ proc.nm }}</q-item-label>
                      <q-item-label caption>
                        {{ proc.steps.length }}단계
                        <template v-if="proc.totalExecutionMs != null">
                          · {{ proc.totalExecutionMs }}ms
                        </template>
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-badge
                        :color="proc.isLatest ? 'positive' : 'grey-5'"
                        :label="proc.isLatest ? '최신' : '이전'"
                      />
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-scroll-area>
          </q-tab-panel>

          <!-- 메인 탭: 원본 + 최종 처리 이미지 -->
          <q-tab-panel name="prc" style="height: 100%; padding: 8px; display: flex; gap: 8px">
            <div class="col column min-h-0">
              <q-card flat bordered class="col q-pa-md column">
                <div class="row justify-between items-center q-mb-sm">
                  <div class="text-subtitle2 text-weight-medium">원본 이미지</div>
                  <q-btn
                    size="xs"
                    color="primary"
                    label="초기화"
                    :disabled="originalFile == null"
                    unelevated
                    @click="setOriginalFile(null)"
                  />
                </div>

                <input
                  ref="originalInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onOriginalInputChange"
                />

                <div
                  v-if="originalPreviewUrl == null"
                  class="col rounded-borders overflow-hidden cursor-pointer column"
                  :class="isDragOver ? 'bg-blue-1' : 'bg-grey-2'"
                  @click="openOriginalPicker"
                  @dragover.prevent
                  @dragenter.prevent="isDragOver = true"
                  @dragleave.prevent="isDragOver = false"
                  @drop.prevent="onOriginalDrop"
                >
                  <div class="fit row items-center justify-center text-grey-7 text-caption">
                    이미지를 드래그하거나 클릭해서 업로드하세요
                  </div>
                </div>
                <div
                  v-else
                  class="col min-h-0 rounded-borders overflow-hidden column"
                  style="flex: 1 1 0%"
                >
                  <ZoomImg :src="originalPreviewUrl" class="fit" :zoom-scale="3" :step="1" />
                </div>
              </q-card>
            </div>
            <div class="col column min-h-0">
              <q-card flat bordered class="col q-pa-md column">
                <div class="text-subtitle2 text-weight-medium q-mb-sm">
                  최종 처리 이미지
                  <span v-if="totalExecutionMs > 0" class="text-caption text-grey-6">
                    ({{ totalExecutionMs.toFixed(1) }}ms)
                  </span>
                </div>
                <div
                  v-if="resultPreviewUrl == null"
                  class="col bg-grey-2 rounded-borders row items-center justify-center"
                >
                  <span class="text-caption text-grey-6">처리 버튼을 눌러 결과를 확인하세요</span>
                </div>
                <div
                  v-else
                  class="col min-h-0 rounded-borders overflow-hidden column"
                  style="flex: 1 1 0%"
                >
                  <ZoomImg :src="resultPreviewUrl" class="fit" :zoom-scale="3" :step="1" />
                </div>
              </q-card>
            </div>
          </q-tab-panel>

          <!-- Flow 탭: 노드 순서 처리이미지 세로 나열 -->
          <q-tab-panel name="prcFlow" style="height: 100%; padding: 0">
            <q-scroll-area style="height: 100%">
              <div class="q-pa-sm">
                <div v-if="nodeList.length === 0" class="row justify-center q-pa-xl">
                  <span class="text-caption text-grey-6">처리 노드가 없습니다</span>
                </div>
                <div v-for="(node, index) in nodeList" :key="node.id" class="q-mb-sm">
                  <q-card flat bordered class="q-pa-sm">
                    <div class="row items-center no-wrap q-mb-sm">
                      <span class="text-caption text-grey-6 q-mr-xs">{{ index + 1 }}.</span>
                      <span class="text-body2">{{ node.label }}</span>
                      <q-badge v-if="!node.enabled" label="비활성" color="grey-5" class="q-ml-sm" />
                    </div>
                    <div
                      class="bg-grey-2 rounded-borders row items-center justify-center"
                      style="height: 200px"
                    >
                      <span class="text-caption text-grey-6">처리 이미지 #{{ index + 1 }}</span>
                    </div>
                  </q-card>
                </div>
              </div>
            </q-scroll-area>
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>

    <!-- Preset 저장 다이얼로그 -->
    <q-dialog v-model="showSavePresetDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">Preset 저장</div>
        </q-card-section>
        <q-card-section class="q-pt-none column q-gutter-sm">
          <q-input
            v-model="presetName"
            label="Preset 이름"
            outlined
            dense
            autofocus
            @keyup.enter="savePreset"
          />
          <q-input v-model="presetDescription" label="설명 (선택)" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" v-close-popup />
          <q-btn
            unelevated
            label="저장"
            color="primary"
            :disabled="!presetName.trim()"
            @click="savePreset"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Preset 수정 다이얼로그 -->
    <q-dialog v-model="showEditPresetDialog">
      <q-card style="min-width: 300px">
        <q-card-section>
          <div class="text-h6">Preset 수정</div>
        </q-card-section>
        <q-card-section class="q-pt-none column q-gutter-sm">
          <q-input
            v-model="editPresetName"
            label="Preset 이름"
            outlined
            dense
            autofocus
            @keyup.enter="confirmEditPreset"
          />
          <q-input v-model="editPresetDescription" label="설명 (선택)" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="취소" v-close-popup />
          <q-btn
            unelevated
            label="수정"
            color="primary"
            :disabled="!editPresetName.trim()"
            @click="confirmEditPreset"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.min-h-0 {
  min-height: 0;
}

.node-item {
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.node-item:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.slide-option-enter-active,
.slide-option-leave-active {
  transition:
    width 0.2s ease,
    min-width 0.2s ease,
    opacity 0.2s ease;
  overflow: hidden;
}

.slide-option-enter-from,
.slide-option-leave-to {
  width: 0 !important;
  min-width: 0 !important;
  opacity: 0;
}
</style>
