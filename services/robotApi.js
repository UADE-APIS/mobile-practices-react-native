import { api, normalizeServerUrl } from '../config/api';

export const robotApi = api;

export function setRobotApiBaseUrl(serverUrl) {
  api.defaults.baseURL = normalizeServerUrl(serverUrl);
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
  return robotApi.post(`/action/${actionName}`, {});
}
