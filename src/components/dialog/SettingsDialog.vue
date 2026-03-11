<script setup lang="ts">
const settingsStore = useSettingsStore();

const show = defineModel<boolean>({ required: true });
</script>

<template>
  <q-dialog v-model="show">
    <q-card style="min-width: 320px">
      <q-card-section>
        <div class="text-h6">설정</div>
      </q-card-section>

      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">이미지 휠 줌 감도</div>
        <div class="row items-center q-gutter-sm">
          <q-btn
            flat
            round
            dense
            icon="remove"
            :disable="settingsStore.defaultZoomPerScroll <= 1.1"
            @click="
              settingsStore.setDefaultZoomPerScroll(
                Math.round((settingsStore.defaultZoomPerScroll - 0.1) * 10) / 10,
              )
            "
          />
          <q-slider
            :model-value="settingsStore.defaultZoomPerScroll"
            :min="1.1"
            :max="2.5"
            :step="0.1"
            :label-value="`x${settingsStore.defaultZoomPerScroll.toFixed(1)}`"
            label-always
            switch-label-side
            class="col"
            @update:model-value="settingsStore.setDefaultZoomPerScroll($event as number)"
          />
          <q-btn
            flat
            round
            dense
            icon="add"
            :disable="settingsStore.defaultZoomPerScroll >= 2.5"
            @click="
              settingsStore.setDefaultZoomPerScroll(
                Math.round((settingsStore.defaultZoomPerScroll + 0.1) * 10) / 10,
              )
            "
          />
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat label="닫기" color="primary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
