import { NativeModules, Platform } from 'react-native';

export const API_TIMEOUT = 10000;

export function getDefaultServerUrl() {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  if (Platform.OS === 'ios') {
    const scriptURL = NativeModules.SourceCode?.scriptURL || '';
    const match = scriptURL.match(/^https?:\/\/([^:/]+)/);

    if (match) {
      return `http://${match[1]}:8000`;
    }
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
