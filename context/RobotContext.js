import React, { createContext, useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from './AuthContext';
import { getDefaultServerUrl, normalizeServerUrl } from '../config/api';
import { addLogEntry, getHistoryList } from '../utils/history';
import {
  connectRobotRequest,
  disconnectRobotRequest,
  getRobotStatus,
  moveRobotRequest,
  robotApi,
  setRobotApiBaseUrl,
  sitDownRobotRequest,
  standUpRobotRequest,
  stopRobotRequest,
} from '../services/robotApi';

export const RobotContext = createContext(null);

const DEFAULT_STATUS = {
  connection_state: 'disconnected',
  robot_type: null,
  network_interface: null,
  connected_at: null,
  last_error: null,
};

function getRobotErrorMessage(err, fallback, serverUrl) {
  if (err.robotMessage) {
    return err.robotMessage;
  }

  if (err.message === 'Network Error' && serverUrl) {
    return `No se pudo conectar con ${serverUrl}. Verificá la URL de la API y que el backend esté accesible desde el celular.`;
  }

  if (err.code === 'ECONNABORTED' && serverUrl) {
    return `Timeout consultando ${serverUrl}. Revisá si la IP del backend cambió o si el celular está en la misma red.`;
  }

  return err.response?.data?.detail
    || err.response?.data?.error
    || err.message
    || fallback;
}

function logCommand(action, details, success) {
  addLogEntry(action, details, success).catch((err) => {
    console.error('Failed to write robot history:', err);
  });
}

export function RobotProvider({ children }) {
  const { user, logout } = useContext(AuthContext);
  const [serverUrl, setServerUrlState] = useState(getDefaultServerUrl());
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [loading, setLoading] = useState(false);
  const statusRef = useRef(DEFAULT_STATUS);
  const explicitDisconnect = useRef(false);
  const reconnecting = useRef(false);
  const lastConnectionParams = useRef(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    setRobotApiBaseUrl(serverUrl);
  }, [serverUrl]);

  // Load server URL from SecureStore on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedUrl = await SecureStore.getItemAsync('server_url');
        if (savedUrl) {
          setServerUrlState(normalizeServerUrl(savedUrl));
        }
      } catch (err) {
        console.error('Failed to load server URL from SecureStore:', err);
      }
    };
    loadConfig();
  }, [user]);

  const reconnectRobot = useCallback(async (reason) => {
    if (reconnecting.current || explicitDisconnect.current || !lastConnectionParams.current) {
      return;
    }

    reconnecting.current = true;
    const { robotType, iface } = lastConnectionParams.current;
    setStatus((currentStatus) => ({
      ...currentStatus,
      connection_state: 'connecting',
      robot_type: robotType,
      network_interface: iface,
      last_error: reason || null,
    }));

    try {
      await connectRobotRequest(robotType, iface);
      const response = await getRobotStatus();
      setStatus(response.data);
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo reconectar automaticamente con el robot.', serverUrl);
      setStatus((currentStatus) => ({
        ...currentStatus,
        connection_state: 'error',
        last_error: errorMessage,
      }));
    } finally {
      reconnecting.current = false;
    }
  }, [serverUrl]);

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      const response = await getRobotStatus();
      const nextStatus = response.data;
      const previousStatus = statusRef.current;
      setStatus(nextStatus);

      if (
        previousStatus.connection_state === 'connected'
        && nextStatus.connection_state !== 'connected'
        && !explicitDisconnect.current
      ) {
        reconnectRobot(nextStatus.last_error || 'Se perdio la conexion con el robot. Intentando reconectar.');
      }
    } catch (err) {
      console.warn('Error fetching status:', err.message || err);
      if (err.response && err.response.status === 401) {
        console.warn('Token expired or invalid, logging out...');
        if (logout) {
          logout();
        }
      } else {
        const previousStatus = statusRef.current;
        const errorMessage = getRobotErrorMessage(err, 'No se pudo consultar el estado del robot.', serverUrl);
        setStatus((currentStatus) => ({
          ...currentStatus,
          connection_state: 'error',
          last_error: errorMessage,
        }));
        if (previousStatus.connection_state === 'connected' && !explicitDisconnect.current) {
          reconnectRobot(errorMessage);
        }
      }
    }
  }, [user, logout, serverUrl, reconnectRobot]);

  // Poll status periodically when user is logged in
  useEffect(() => {
    if (user) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    } else {
      setStatus(DEFAULT_STATUS);
    }
  }, [fetchStatus, user]);

  const connectRobot = useCallback(async (robotType, iface = 'eth0') => {
    setLoading(true);
    explicitDisconnect.current = false;
    lastConnectionParams.current = { robotType, iface };
    setStatus((currentStatus) => ({
      ...currentStatus,
      connection_state: 'connecting',
      robot_type: robotType,
      network_interface: iface,
      last_error: null,
    }));
    try {
      const response = await connectRobotRequest(robotType, iface);
      await addLogEntry('CONNECT', `robot_type=${robotType}, interface=${iface}`, true);
      await fetchStatus();
      return response.data;
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo establecer la conexión con el robot.', serverUrl);
      err.robotMessage = errorMessage;
      await addLogEntry('CONNECT', `robot_type=${robotType}, interface=${iface}, error=${errorMessage}`, false);
      console.error('Connection error:', err);
      setStatus((currentStatus) => ({
        ...currentStatus,
        connection_state: 'error',
        last_error: errorMessage,
      }));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStatus, serverUrl]);

  const disconnectRobot = useCallback(async () => {
    setLoading(true);
    explicitDisconnect.current = true;
    try {
      const response = await disconnectRobotRequest();
      await addLogEntry('DISCONNECT', '', true);
      await fetchStatus();
      return response.data;
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo desconectar el robot.', serverUrl);
      err.robotMessage = errorMessage;
      await addLogEntry('DISCONNECT', `error=${errorMessage}`, false);
      console.error('Disconnection error:', err);
      setStatus((currentStatus) => ({
        ...currentStatus,
        connection_state: 'error',
        last_error: errorMessage,
      }));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchStatus, serverUrl]);

  const moveRobot = useCallback(async (vx, vy, vyaw) => {
    try {
      const response = await moveRobotRequest(vx, vy, vyaw);
      logCommand('MOVE', `vx=${vx}, vy=${vy}, vyaw=${vyaw}`, true);
      return response.data;
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo enviar el movimiento.', serverUrl);
      err.robotMessage = errorMessage;
      logCommand('MOVE', `vx=${vx}, vy=${vy}, vyaw=${vyaw}, error=${errorMessage}`, false);
      console.error('Move error:', err);
      throw err;
    }
  }, [serverUrl]);

  const stopRobot = useCallback(async () => {
    try {
      const response = await stopRobotRequest();
      logCommand('STOP', '', true);
      return response.data;
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo detener el robot.', serverUrl);
      err.robotMessage = errorMessage;
      logCommand('STOP', `error=${errorMessage}`, false);
      console.error('Stop error:', err);
      throw err;
    }
  }, [serverUrl]);

  const standUpRobot = useCallback(async () => {
    try {
      const response = await standUpRobotRequest();
      await addLogEntry('STANDUP', '', true);
      return response.data;
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo enviar el comando Pararse.', serverUrl);
      err.robotMessage = errorMessage;
      await addLogEntry('STANDUP', `error=${errorMessage}`, false);
      console.error('Stand up error:', err);
      throw err;
    }
  }, [serverUrl]);

  const sitDownRobot = useCallback(async () => {
    try {
      const response = await sitDownRobotRequest();
      await addLogEntry('SITDOWN', '', true);
      return response.data;
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo enviar el comando Sentarse.', serverUrl);
      err.robotMessage = errorMessage;
      await addLogEntry('SITDOWN', `error=${errorMessage}`, false);
      console.error('Sit down error:', err);
      throw err;
    }
  }, [serverUrl]);

  const contextValue = useMemo(() => ({
    status,
    loading,
    serverUrl,
    connectRobot,
    disconnectRobot,
    moveRobot,
    stopRobot,
    standUpRobot,
    sitDownRobot,
    fetchStatus,
    getHistoryList,
    api: robotApi,
  }), [
    status,
    loading,
    serverUrl,
    connectRobot,
    disconnectRobot,
    moveRobot,
    stopRobot,
    standUpRobot,
    sitDownRobot,
    fetchStatus,
  ]);

  return (
    <RobotContext.Provider value={contextValue}>
      {children}
    </RobotContext.Provider>
  );
}
