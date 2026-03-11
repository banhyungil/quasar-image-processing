<template>
  <!-- @SEE https://quasar.dev/layout/layout#understanding-the-view-prop
   1. HEADER
   - l/h h/H r/h
   2. PAGE
   - l/L p r/R
   3. FOOTER
   - l/f f/F r/f

  * 대문자로하면 fixed처럼 동작.
  * header, footer 설정에 따라 page 사이드의 공간이 달라짐. (l/L, r/R)
  ** q-drawer는 page 사이드의 공간 차지
  -->
  <q-layout view="hHh Lpr fFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          :color="isLeftDrawerMini ? 'secondary' : undefined"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title> Image Processing App </q-toolbar-title>

        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="isLeftDrawerOpen"
      side="left"
      show-if-above
      bordered
      :mini="isLeftDrawerMini"
      :width="240"
      :mini-width="72"
    >
      <AppSidebar :mini="isLeftDrawerMini" />
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import AppSidebar from 'components/AppSidebar.vue';

const $q = useQuasar();

const isLeftDrawerOpen = ref(true);
const isLeftDrawerMini = ref(false);

function toggleLeftDrawer() {
  if ($q.screen.lt.md) {
    isLeftDrawerOpen.value = !isLeftDrawerOpen.value;
    return;
  }

  isLeftDrawerOpen.value = true;
  isLeftDrawerMini.value = !isLeftDrawerMini.value;
}
</script>
