import axios from 'axios';

function getBaseURL(): string {
  const env = (
    import.meta as ImportMeta & {
      env?: { API_URL?: string };
    }
  ).env;

  return env?.API_URL ?? 'http://localhost:4000';
}

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (config.data !== undefined && !(config.data instanceof FormData)) {
    config.headers.set('Content-Type', 'application/json');
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401 && typeof window !== 'undefined') {
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export function getApiBaseURL(): string {
  return getBaseURL();
}
