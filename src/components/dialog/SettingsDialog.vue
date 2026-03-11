<script setup lang="ts">
import { useSettingsStore, type NodeSizeKey } from 'src/stores/settings-store';

const settingsStore = useSettingsStore();

const show = defineModel<boolean>({ required: true });

const nodeSizeOptions: { label: string; value: NodeSizeKey }[] = [
  { label: 'XS', value: 'xs' },
  { label: 'S', value: 'sm' },
  { label: 'M', value: 'md' },
  { label: 'L', value: 'lg' },
  { label: 'XL', value: 'xl' },
];
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

      <q-card-section>
        <div class="text-subtitle2 q-mb-sm">노드 크기</div>
        <q-btn-toggle
          :model-value="settingsStore.nodeSizeKey"
          toggle-color="primary"
          :options="nodeSizeOptions"
          spread
          no-caps
          unelevated
          @update:model-value="settingsStore.setNodeSize($event as NodeSizeKey)"
        />
        <div class="text-caption text-grey-6 q-mt-xs">
          썸네일 해상도: {{ settingsStore.nodeSize.thumbResolution }}px
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn v-close-popup flat label="닫기" color="primary" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
