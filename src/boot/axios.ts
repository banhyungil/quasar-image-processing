import { defineBoot } from '#q-app/wrappers';
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { Notify } from 'quasar';

declare module 'vue' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance;
    $api: AxiosInstance;
  }
}

// Moduel Augmentation (모듈 확장)
declare module 'axios' {
  interface AxiosRequestConfig {
    /** true 시 응답 에러 인터셉터의 글로벌 Notify 알림을 생략하고, 호출부에서 직접 에러를 처리한다. */
    _skipNotify?: boolean;
  }
}

// Be careful when using SSR for cross-request state pollution
// due to creating a Singleton instance here;
// If any client changes this (global) instance, it might be a
// good idea to move this instance creation inside of the
// "export default () => {}" function below (which runs individually
// for each client)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
const api = axios.create({ baseURL: `${API_BASE_URL}/api` });

// 백엔드 에러 응답 타입
interface AppErrorRes {
  code?: string;
  message?: string;
  detail?: string | Record<string, unknown>;
}

// 응답 에러 공통 처리
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<AppErrorRes>) => {
    // abort된 요청은 알림 없이 무시
    if (axios.isCancel(err)) {
      return Promise.reject(err);
    }

    // _skipNotify 플래그가 있으면 글로벌 알림 생략
    if (err.config?._skipNotify) {
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
