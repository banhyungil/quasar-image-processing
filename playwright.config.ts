import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

export default defineConfig({
  testDir: './e2e',
  // webServer: {
  //   command: 'npx quasar dev', // 테스트 전 dev 서버 자동 실행
  //   port: 9000,
  //   reuseExistingServer: true,
  // },
  use: {
    baseURL: `http://localhost:${process.env.VITE_PORT}`,
    viewport: { width: 1920, height: 1080 },
    trace: 'retain-on-failure', // 실패시에 trace 가록
    video: 'on', // 실패시에 영상 가록
    screenshot: 'on', // 매 테스트마다 스크린샷 촬영
    launchOptions: { slowMo: 300 },
  },
});
