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
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

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
      <q-list>
        <EssentialLink
          v-for="link in linksList"
          :key="link.title"
          v-bind="link"
          :mini="isLeftDrawerMini"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import EssentialLink, { type EssentialLinkProps } from 'components/EssentialLink.vue';

const $q = useQuasar();

const linksList: EssentialLinkProps[] = [
  {
    title: 'Docs',
    caption: 'quasar.dev',
    icon: 'code',
    to: { name: 'img-prc-basic' },
  },
  // {
  //   title: 'Github',
  //   caption: 'github.com/quasarframework',
  //   icon: 'code',
  //   link: 'https://github.com/quasarframework',
  // },
  // {
  //   title: 'Discord Chat Channel',
  //   caption: 'chat.quasar.dev',
  //   icon: 'chat',
  //   link: 'https://chat.quasar.dev',
  // },
  // {
  //   title: 'Forum',
  //   caption: 'forum.quasar.dev',
  //   icon: 'record_voice_over',
  //   link: 'https://forum.quasar.dev',
  // },
  // {
  //   title: 'Twitter',
  //   caption: '@quasarframework',
  //   icon: 'rss_feed',
  //   link: 'https://twitter.quasar.dev',
  // },
  // {
  //   title: 'Facebook',
  //   caption: '@QuasarFramework',
  //   icon: 'public',
  //   link: 'https://facebook.quasar.dev',
  // },
  // {
  //   title: 'Quasar Awesome',
  //   caption: 'Community Quasar projects',
  //   icon: 'favorite',
  //   link: 'https://awesome.quasar.dev',
  // },
];

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
