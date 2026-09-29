// ============================================================
// Clyptus Job Portal - Shared Platform API Client
// ============================================================

import axios, { AxiosInstance } from 'axios';
import { clearPlatformAccessToken, getPlatformAccessToken } from './auth-session';

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = getPlatformAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      clearPlatformAccessToken();
      window.dispatchEvent(new CustomEvent('clyptus:platform-session-expired'));
    }

    const serverError = error.response?.data?.error;
    const errorPayload = {
      ...(serverError || {
        code: status ? `HTTP_${status}` : 'NETWORK_ERROR',
        message: error.message || 'Failed to connect to platform API server',
      }),
      status,
    };

    return Promise.reject(errorPayload);
  },
);
