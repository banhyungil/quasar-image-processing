<template>
  <q-page class="test-page column" style="height: 0">
    <div class="test-page__top col overflow-hidden border">상단</div>
    <!-- 하단 -->
    <div class="test-page__bottom col row overflow-hidden" style="height: 0">
      <!-- 좌 -->
      <q-scroll-area class="col h-full">
        <div v-for="n in 20" :key="n" class="border" style="height: 100px">
          {{ n }}
        </div>
      </q-scroll-area>
      <!-- 우 -->
      <div class="col border overflow-auto h-full">
        <div v-for="n in 20" :key="n" class="border" style="height: 100px">
          {{ n }}
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts"></script>

<style scoped>
.a {
  flex: 1 1 0%;
}
</style>
