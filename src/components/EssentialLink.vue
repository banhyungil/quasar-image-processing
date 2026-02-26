<template>
  <q-item clickable :to="to">
    <q-item-section v-if="icon" avatar>
      <q-icon :name="icon" />
      <q-tooltip v-if="mini" class="q-mini-drawer-only" anchor="center right" self="center left">
        {{ title }}
      </q-tooltip>
    </q-item-section>

    <q-item-section class="q-mini-drawer-hide">
      <q-item-label>{{ title }}</q-item-label>
      <q-item-label caption>{{ caption }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import type { RouteRecordRaw } from 'vue-router';

export interface EssentialLinkProps {
  title: string;
  caption?: string;
  to?: Partial<RouteRecordRaw>;
  link?: string;
  icon?: string;
  mini?: boolean;
}

withDefaults(defineProps<EssentialLinkProps>(), {
  caption: '',
  link: '#',
  icon: '',
  mini: false,
});
</script>
