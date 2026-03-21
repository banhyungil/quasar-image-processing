import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    /**
     * happy-dom
     * 1. 주요기능
     * 경랭 DOM 구현체
     * Node.js 환경에서 브라우저 DOM API를 시뮬레이션 해주는 라이브러리
     * SSR: 서버 사이드에서 DOM 조작이 필요할 때 활용
     * 2. jsdom 대안
     * * jsdom 보다 가볍고 성능이 더좋아 테스트 속도가 향상됨
     */
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      src: fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
