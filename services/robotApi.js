import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_TIMEOUT, getDefaultServerUrl, normalizeServerUrl } from '../config/api';

let currentBaseUrl = normalizeServerUrl(getDefaultServerUrl());

export const robotApi = axios.create({
  baseURL: currentBaseUrl,
  timeout: API_TIMEOUT,
});

robotApi.interceptors.request.use(async (config) => {
  config.baseURL = currentBaseUrl;
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

if (robotApi.interceptors.response?.use) {
  robotApi.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  );
}

export function setRobotApiBaseUrl(serverUrl) {
  currentBaseUrl = normalizeServerUrl(serverUrl);
  robotApi.defaults.baseURL = currentBaseUrl;
}

export function getRobotStatus() {
  return robotApi.get('/status');
}

export function connectRobotRequest(robotType, iface) {
  return robotApi.post('/connect', {
    robot_type: robotType,
    network_interface: iface,
  });
}

export function disconnectRobotRequest() {
  return robotApi.post('/disconnect');
}

export function moveRobotRequest(vx, vy, vyaw) {
  return robotApi.post('/move', { vx, vy, vyaw });
}

export function stopRobotRequest() {
  return robotApi.post('/stop');
}

export function standUpRobotRequest() {
  return robotApi.post('/standup');
}

export function sitDownRobotRequest() {
  return robotApi.post('/sitdown');
}

export function getRobotActions() {
  return robotApi.get('/actions');
}

export function executeRobotAction(actionName) {
  return robotApi.post(`/action/${actionName}`);
}
