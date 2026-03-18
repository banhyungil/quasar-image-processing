import { defineBoot } from '#q-app/wrappers';
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { Notify } from 'quasar';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
export const API_HOST = 'http://127.0.0.1:8000';
const api = axios.create({ baseURL: `${API_HOST}/api` });

// 백엔드 에러 응답 타입
interface AppErrorResponse {
  code?: string;
  message?: string;
  detail?: string | Record<string, unknown>;
}

// 응답 에러 공통 처리
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<AppErrorResponse>) => {
    // abort된 요청은 알림 없이 무시
    if (axios.isCancel(err)) {
      return Promise.reject(err);
    }

    const status = err.response?.status;
    const data = err.response?.data;

    // AppError 응답: { code, message, detail? }
    // HTTPException 응답: { detail }
    const message =
      data?.message ??
      (typeof data?.detail === 'string' ? data.detail : null) ??
      err.message ??
      '요청 실패';

    const code = data?.code;

    Notify.create({
      type: 'negative',
      message: code ? `[${code}] ${message}` : status ? `[${status}] ${message}` : message,
      timeout: 3000,
    });

    return Promise.reject(err);
  },
);

export default defineBoot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api

  app.config.globalProperties.$axios = axios;
  // ^ ^ ^ this will allow you to use this.$axios (for Vue Options API form)
  //       so you won't necessarily have to import axios in each vue file

  app.config.globalProperties.$api = api;
  // ^ ^ ^ this will allow you to use this.$api (for Vue Options API form)
  //       so you can easily perform requests against your app's API
});

export { api };
