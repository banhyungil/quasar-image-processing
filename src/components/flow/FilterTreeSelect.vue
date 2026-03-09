<script setup lang="ts">
import { FN_LIST, FN_OPTIONS_MAP } from 'src/constants/imgPrc';
import type { PrcType } from 'src/types/imgPrcType';

interface FnTreeNode {
  label: string;
  value: string;
  selectable?: boolean;
  children?: FnTreeNode[];
}

defineProps<{
  /** 현재 선택된 알고리즘 */
  modelValue: PrcType;
  /** 버튼에 표시할 라벨 */
  label: string;
}>();

const emit = defineEmits<{
  (e: 'select', prcType: PrcType, label: string): void;
}>();

const fnTreeNodes: FnTreeNode[] = FN_LIST.map((cat) => ({
  label: cat.label,
  value: cat.value,
  selectable: false,
  children: FN_OPTIONS_MAP[cat.value].map((opt) => ({
    label: opt.label,
    value: opt.value,
  })),
}));

const filterSearch = ref('');
const btnDropdownRef = ref<InstanceType<typeof import('quasar')['QBtnDropdown']> | null>(null);

function onSelectFilter(value: string, label: string) {
  emit('select', value as PrcType, label);
  btnDropdownRef.value?.hide();
}
</script>

<template>
  <q-btn-dropdown
    ref="btnDropdownRef"
    flat
    dense
    no-caps
    :label="label"
    dropdown-icon="swap_horiz"
    content-class="filter-tree-select__dropdown"
    @before-show="filterSearch = ''"
  >
    <div class="q-pa-sm" style="min-width: 220px; max-height: 350px">
      <q-input
        v-model="filterSearch"
        dense
        outlined
        placeholder="검색..."
        clearable
        class="q-mb-xs"
      >
        <template #prepend><q-icon name="search" size="xs" /></template>
      </q-input>
      <q-tree
        :nodes="fnTreeNodes"
        node-key="value"
        label-key="label"
        :filter="filterSearch"
        default-expand-all
        dense
      >
        <template #default-header="{ node }">
          <div
            v-if="node.children"
            class="text-weight-bold text-caption"
          >
            {{ node.label }}
          </div>
          <div
            v-else
            class="cursor-pointer filter-tree-select__leaf"
            :class="{ 'text-primary text-weight-bold': node.value === modelValue }"
            @click="onSelectFilter(node.value, node.label)"
          >
            {{ node.label }}
          </div>
        </template>
      </q-tree>
    </div>
  </q-btn-dropdown>
</template>

<style scoped lang="scss">
.filter-tree-select {
  &__leaf {
    padding: 2px 4px;
    border-radius: 4px;

    &:hover {
      background: rgba(25, 118, 210, 0.08);
    }
  }
}
</style>
