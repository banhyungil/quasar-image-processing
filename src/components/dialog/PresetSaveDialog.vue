<script setup lang="ts">
const show = defineModel<boolean>({ required: true });

const props = defineProps<{
  isEditing: boolean;
  initialName: string;
  initialDescription: string;
}>();

const emit = defineEmits<{
  (e: 'confirm', name: string, description: string): void;
}>();

const presetName = ref(props.initialName);
const presetDescription = ref(props.initialDescription);

watch(
  () => show.value,
  (open) => {
    if (open) {
      presetName.value = props.initialName;
      presetDescription.value = props.initialDescription;
    }
  },
);

function onConfirm() {
  if (!presetName.value.trim()) return;
  emit('confirm', presetName.value.trim(), presetDescription.value.trim());
}
</script>

<template>
  <q-dialog v-model="show">
    <q-card style="min-width: 300px">
      <q-card-section>
        <div class="text-h6">{{ isEditing ? 'Preset 수정' : 'Preset 저장' }}</div>
      </q-card-section>
      <q-card-section class="q-pt-none column q-gutter-sm">
        <q-input
          v-model="presetName"
          label="Preset 이름"
          outlined
          dense
          autofocus
          @keyup.enter="onConfirm"
        />
        <q-input v-model="presetDescription" label="설명 (선택)" outlined dense />
      </q-card-section>
      <q-card-actions align="right">
        <q-btn v-close-popup flat label="취소" />
        <q-btn
          unelevated
          :label="isEditing ? '수정' : '저장'"
          color="primary"
          :disabled="!presetName.trim()"
          @click="onConfirm"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
