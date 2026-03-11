<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor';
import type { CustomFilter } from 'src/apis/customFilterApi';
import * as customFilterApi from 'src/apis/customFilterApi';
import type { ParamFieldDef } from 'src/constants/imgPrc';

const show = defineModel<boolean>({ required: true });

const props = defineProps<{
  customFilter?: CustomFilter;
}>();

const emit = defineEmits<{
  (e: 'saved', filter: CustomFilter): void;
}>();

const DEFAULT_CODE = 'result = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)\n';

const nm = ref('');
const description = ref('');
const code = ref(DEFAULT_CODE);
const paramDefs = ref<ParamFieldDef[]>([]);
const saving = ref(false);

const isEditing = computed(() => !!props.customFilter);

watch(
  () => show.value,
  (open) => {
    if (open) {
      if (props.customFilter) {
        nm.value = props.customFilter.nm;
        description.value = props.customFilter.description;
        code.value = props.customFilter.code;
        paramDefs.value = Array.isArray(props.customFilter.params)
          ? (props.customFilter.params as unknown as ParamFieldDef[]).map((p) => ({ ...p }))
          : [];
      } else {
        nm.value = '';
        description.value = '';
        code.value = DEFAULT_CODE;
        paramDefs.value = [];
      }
    }
  },
);

// ── 파라미터 정의 ──────────────────────────────────────────────────────────

function addParamDef() {
  paramDefs.value.push({
    key: '',
    label: '',
    type: 'number',
    default: 0,
    min: 0,
    max: 100,
    step: 1,
  });
}

function removeParamDef(index: number) {
  paramDefs.value.splice(index, 1);
}

// ── 저장 ────────────────────────────────────────────────────────────────────

const canSave = computed(() => nm.value.trim() && code.value.trim());

async function onSave() {
  if (!canSave.value || saving.value) return;
  saving.value = true;
  try {
    const body = {
      nm: nm.value.trim(),
      description: description.value.trim(),
      code: code.value,
      params: paramDefs.value.map((p) => ({ ...p })),
    };

    let saved: CustomFilter;
    if (isEditing.value && props.customFilter) {
      saved = await customFilterApi.updateCustomFilter(props.customFilter.id, body);
    } else {
      saved = await customFilterApi.createCustomFilter(body);
    }
    emit('saved', saved);
    show.value = false;
  } catch (err) {
    console.error('커스텀 필터 저장 실패:', err);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <q-dialog v-model="show" maximized transition-show="slide-up" transition-hide="slide-down">
    <q-card class="column">
      <!-- 헤더 -->
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ isEditing ? '커스텀 필터 수정' : '커스텀 필터 생성' }}</div>
        <q-space />
        <q-btn v-close-popup flat round dense icon="close" />
      </q-card-section>

      <!-- 이름 / 설명 -->
      <q-card-section class="row q-gutter-sm q-py-sm">
        <q-input v-model="nm" label="이름" outlined dense class="col" />
        <q-input v-model="description" label="설명 (선택)" outlined dense class="col" />
      </q-card-section>

      <!-- 코드 에디터 -->
      <q-card-section class="column q-py-none" style="flex: 1 1 60%; min-height: 200px">
        <pre
          class="fn-signature q-mb-xs"
          style="flex-shrink: 0"
        ><span class="text-grey-6"># 사용 가능 모듈: cv2, np (numpy), math</span>
def <strong>{{ nm.trim() || 'filter_name' }}</strong>(image: np.ndarray, params: dict) -> np.ndarray:
    <span class="text-grey-6"># image : BGR uint8 원본 이미지</span>
    <span class="text-grey-6"># params: 파라미터 dict — params.get('key', default)</span>
    <span class="text-grey-6"># return: result (np.ndarray, uint8)</span></pre>
        <div class="editor-wrapper col">
          <VueMonacoEditor
            v-model:value="code"
            language="python"
            theme="vs"
            :options="{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
            }"
          />
        </div>
      </q-card-section>

      <!-- 파라미터 정의 -->
      <q-card-section class="q-py-sm" style="max-height: 250px; overflow-y: auto; flex-shrink: 0">
        <div class="row items-center q-mb-xs">
          <div class="text-subtitle2">파라미터 정의</div>
          <q-space />
          <q-btn
            flat
            dense
            size="sm"
            icon="add"
            label="추가"
            color="primary"
            @click="addParamDef"
          />
        </div>

        <q-markup-table
          v-if="paramDefs.length > 0"
          flat
          bordered
          dense
          separator="cell"
          class="param-table"
        >
          <thead>
            <tr>
              <th>key</th>
              <th>label</th>
              <th>type</th>
              <th>default</th>
              <th>min</th>
              <th>max</th>
              <th>step</th>
              <th style="width: 40px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(p, idx) in paramDefs" :key="idx">
              <td><q-input v-model="p.key" dense borderless input-class="text-caption" /></td>
              <td><q-input v-model="p.label" dense borderless input-class="text-caption" /></td>
              <td>
                <q-select
                  v-model="p.type"
                  :options="['number', 'select']"
                  dense
                  borderless
                  options-dense
                  class="text-caption"
                />
              </td>
              <td>
                <q-input
                  v-model.number="p.default"
                  type="number"
                  dense
                  borderless
                  input-class="text-caption"
                />
              </td>
              <td>
                <q-input
                  v-model.number="p.min"
                  type="number"
                  dense
                  borderless
                  input-class="text-caption"
                />
              </td>
              <td>
                <q-input
                  v-model.number="p.max"
                  type="number"
                  dense
                  borderless
                  input-class="text-caption"
                />
              </td>
              <td>
                <q-input
                  v-model.number="p.step"
                  type="number"
                  dense
                  borderless
                  input-class="text-caption"
                />
              </td>
              <td class="text-center">
                <q-btn
                  flat
                  round
                  dense
                  size="xs"
                  icon="delete"
                  color="negative"
                  @click="removeParamDef(idx)"
                />
              </td>
            </tr>
          </tbody>
        </q-markup-table>

        <div v-else class="text-caption text-grey-5 text-center q-pa-sm">파라미터가 없습니다</div>
      </q-card-section>

      <!-- 하단 버튼 -->
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn v-close-popup flat label="취소" />
        <q-btn
          unelevated
          :label="isEditing ? '수정' : '저장'"
          color="primary"
          :disabled="!canSave"
          :loading="saving"
          @click="onSave"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.editor-wrapper {
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  overflow: hidden;
}

.fn-signature {
  margin: 0;
  padding: 6px 10px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #f8f8f8;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  white-space: pre;
  overflow-x: auto;
}

.param-table th,
.param-table td {
  padding: 2px 4px;
}
</style>
