import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function rotateTokens(): Promise<string> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No refresh token is available.");
  const response = await axios.post<{
    accessToken: string;
    refreshToken: string;
  }>(`${baseURL}/api/auth/refresh`, { refreshToken });
  localStorage.setItem("authToken", response.data.accessToken);
  localStorage.setItem("refreshToken", response.data.refreshToken);
  return response.data.accessToken;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    if (!config || error.response?.status !== 401 || config._retry || config.url?.includes("/api/auth/")) throw error;
    config._retry = true;
    try {
      refreshPromise ??= rotateTokens().finally(() => { refreshPromise = null; });
      const accessToken = await refreshPromise;
      config.headers.Authorization = `Bearer ${accessToken}`;
      return api.request(config);
    } catch (refreshError) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("authorization");
      throw refreshError;
    }
  }
);

export default api;
