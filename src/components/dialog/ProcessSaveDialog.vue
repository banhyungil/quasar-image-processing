<script setup lang="ts">
const show = defineModel<boolean>({ required: true });

const props = defineProps<{
  isEditing: boolean;
  initialName: string;
}>();

const emit = defineEmits<{
  (e: 'confirm', name: string): void;
}>();

const processName = ref(props.initialName);

watch(
  () => show.value,
  (open) => {
    if (open) {
      processName.value = props.initialName;
    }
  },
);

function onConfirm() {
  if (!processName.value.trim()) return;
  emit('confirm', processName.value.trim());
}
</script>

<template>
  <q-dialog v-model="show">
    <q-card style="min-width: 300px">
      <q-card-section>
        <div class="text-h6">
          {{ isEditing ? '처리 데이터 수정' : '처리 데이터 저장' }}
        </div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-input
          v-model="processName"
          label="처리 이름"
          outlined
          dense
          autofocus
          @keyup.enter="onConfirm"
        />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup flat label="취소" />
        <q-btn
          unelevated
          :label="isEditing ? '수정' : '저장'"
          color="primary"
          :disabled="!processName.trim()"
          @click="onConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
