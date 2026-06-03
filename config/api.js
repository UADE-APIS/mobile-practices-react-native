import { NativeModules, Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const API_TIMEOUT = 10000;

function getBundlerHost() {
  const scriptURL = NativeModules.SourceCode?.scriptURL || '';
  const match = scriptURL.match(/^https?:\/\/([^:/]+)/);

  return match?.[1] || null;
}

export function getDefaultServerUrl() {
  const bundlerHost = getBundlerHost();

  if (bundlerHost) {
    return `http://${bundlerHost}:8000`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }
  return 'http://localhost:8000';
}

export function normalizeServerUrl(url) {
  return url.trim().replace(/\/+$/, '');
}

export function withTimeout(promise, message) {
  let timeoutId;

  const timeout = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), API_TIMEOUT);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export function getApiErrorMessage(err) {
  return err.response?.data?.detail
    || err.response?.data?.error
    || (err.code === 'ECONNABORTED' && 'El servidor tardo demasiado en responder.')
    || err.message
    || 'Error de conexion con el servidor.';
}

export const api = axios.create({
  baseURL: getDefaultServerUrl(),
  timeout: API_TIMEOUT,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
