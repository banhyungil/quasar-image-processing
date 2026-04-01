<script setup lang="ts">
import EssentialLink, { type EssentialLinkProps } from 'components/EssentialLink.vue';
import SettingsDialog from 'components/dialog/SettingsDialog.vue';

defineProps<{
  mini?: boolean;
}>();

const showSettings = ref(false);

function onKeyDown(e: KeyboardEvent) {
  if (e.ctrlKey && e.key === ',') {
    e.preventDefault();
    showSettings.value = !showSettings.value;
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown));

const linksList: EssentialLinkProps[] = [
  {
    title: '영상처리',
    caption: '영상처리',
    icon: 'photo_filter',
    to: { name: 'img-prc' },
  },
  {
    title: '테스트',
    caption: '테스트',
    icon: 'photo_filter',
    to: { name: 'test' },
  },
];
</script>

<template>
  <div class="column fit">
    <!-- 상단 영역: 네비게이션 -->
    <q-list>
      <EssentialLink v-for="link in linksList" :key="link.title" v-bind="link" :mini="mini" />
    </q-list>

    <!-- 남은 영역을 차지하는 역할, 상단 하단 분리에 사용 -->
    <q-space />

    <!-- 하단 영역: 아래부터 쌓임 -->
    <q-list class="q-pb-sm">
      <q-item clickable @click="showSettings = true">
        <q-item-section avatar>
          <q-icon name="settings" />
        </q-item-section>
        <q-item-section v-if="!mini">설정</q-item-section>
        <q-tooltip v-if="mini" anchor="center right" self="center left">설정</q-tooltip>
      </q-item>
    </q-list>
  </div>

  <SettingsDialog v-model="showSettings" />
</template>
