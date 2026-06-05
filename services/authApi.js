import axios from 'axios';
import { API_TIMEOUT, normalizeServerUrl, withTimeout } from '../config/api';

export const authApi = axios.create({
  timeout: API_TIMEOUT,
});

export function requestAuthToken(serverUrl, identifier, password) {
  const cleanServerUrl = normalizeServerUrl(serverUrl);
  return withTimeout(
    authApi.post('/auth/token', {
      identifier,
      password,
    }, {
      baseURL: cleanServerUrl,
      timeout: API_TIMEOUT,
    }),
    'No se pudo conectar con el servidor.'
  );
}

export function registerOperator(serverUrl, username, email, password) {
  const cleanServerUrl = normalizeServerUrl(serverUrl);
  return withTimeout(
    authApi.post('/auth/register', {
      username,
      email,
      password,
    }, {
      baseURL: cleanServerUrl,
      timeout: API_TIMEOUT,
    }),
    'No se pudo conectar con el servidor.'
  );
}
