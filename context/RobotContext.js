import React, { createContext, useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from './AuthContext';
import { api, getDefaultServerUrl, normalizeServerUrl } from '../config/api';
import { addLogEntry, getHistoryList } from '../utils/history';
import {
  connectRobotRequest,
  disconnectRobotRequest,
  executeRobotAction,
  getRobotStatus,
  moveRobotRequest,
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
  const lastConnectionParams = useRef(null);

  const pollingEnabled = useRef(false);
  const consecutiveFailures = useRef(0);
  const pollTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const isReconnecting = useRef(false);

  const MAX_RECONNECT_ATTEMPTS = 3;
  const RECONNECT_DELAYS = process.env.NODE_ENV === 'test' ? [0, 0, 0] : [5000, 10000, 20000];
  const BASE_POLL_MS = 3000;
  const MAX_POLL_MS = 30000;

  const fetchStatusRef = useRef(null);
  const scheduleNextPollRef = useRef(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    api.defaults.baseURL = normalizeServerUrl(serverUrl);
    consecutiveFailures.current = 0;
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
    if (
      isReconnecting.current ||
      explicitDisconnect.current ||
      !lastConnectionParams.current ||
      !user ||
      reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS
    ) {
      return;
    }

    isReconnecting.current = true;
    const { robotType, iface } = lastConnectionParams.current;
    
    setStatus((currentStatus) => ({
      ...currentStatus,
      connection_state: 'reconnecting',
      robot_type: robotType,
      network_interface: iface,
      last_error: reason || null,
    }));

    const attempt = reconnectAttempts.current;
    const delay = RECONNECT_DELAYS[attempt] !== undefined ? RECONNECT_DELAYS[attempt] : 5000;

    console.log(`[Auto-reconnect] Attempt ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (explicitDisconnect.current || !lastConnectionParams.current || !user) {
      isReconnecting.current = false;
      return;
    }

    try {
      await connectRobotRequest(robotType, iface);
      reconnectAttempts.current = 0;
      isReconnecting.current = false;
      if (fetchStatusRef.current) {
        await fetchStatusRef.current();
      }
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo reconectar automaticamente con el robot.', serverUrl);
      reconnectAttempts.current += 1;
      
      setStatus((currentStatus) => ({
        ...currentStatus,
        connection_state: 'error',
        last_error: errorMessage,
      }));
      isReconnecting.current = false;
    }
  }, [serverUrl]);

  const scheduleNextPoll = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (!pollingEnabled.current || !user) return;

    const delay = Math.min(
      BASE_POLL_MS * Math.pow(2, consecutiveFailures.current),
      MAX_POLL_MS
    );

    pollTimeoutRef.current = setTimeout(async () => {
      try {
        if (fetchStatusRef.current) {
          await fetchStatusRef.current();
        }
      } catch (err) {
        console.error('Error in poll loop:', err);
      }
      if (scheduleNextPollRef.current) {
        scheduleNextPollRef.current();
      }
    }, delay);
  }, [user]);

  useEffect(() => {
    scheduleNextPollRef.current = scheduleNextPoll;
  }, [scheduleNextPoll]);

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      const response = await getRobotStatus();
      const nextStatus = response.data;
      const previousStatus = statusRef.current;
      setStatus(nextStatus);
      consecutiveFailures.current = 0;

      if (nextStatus.connection_state === 'connected') {
        reconnectAttempts.current = 0;
        if (!lastConnectionParams.current) {
          lastConnectionParams.current = {
            robotType: nextStatus.robot_type || 'go2',
            iface: nextStatus.network_interface || 'eth0'
          };
        }
        if (!pollingEnabled.current) {
          pollingEnabled.current = true;
          if (scheduleNextPollRef.current) {
            scheduleNextPollRef.current();
          }
        }
      } else if (
        (nextStatus.connection_state === 'disconnected' || nextStatus.connection_state === 'error') &&
        lastConnectionParams.current !== null &&
        !explicitDisconnect.current &&
        !isReconnecting.current &&
        reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
      ) {
        reconnectRobot(nextStatus.last_error || 'Se perdio la conexion con el robot. Intentando reconectar.');
      }
    } catch (err) {
      console.warn('Error fetching status:', err.message || err);
      consecutiveFailures.current += 1;

      if (err.response && err.response.status === 401) {
        console.warn('Token expired or invalid, logging out...');
        if (logout) {
          logout();
        }
      } else {
        const errorMessage = getRobotErrorMessage(err, 'No se pudo consultar el estado del robot.', serverUrl);
        setStatus((currentStatus) => ({
          ...currentStatus,
          connection_state: 'error',
          last_error: errorMessage,
        }));
        
        if (
          lastConnectionParams.current !== null &&
          !explicitDisconnect.current &&
          !isReconnecting.current &&
          reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectRobot(errorMessage);
        }
      }
    }
  }, [user, logout, serverUrl, reconnectRobot]);

  useEffect(() => {
    fetchStatusRef.current = fetchStatus;
  }, [fetchStatus]);

  // Poll status periodically when user is logged in
  useEffect(() => {
    if (user) {
      fetchStatus();
    } else {
      setStatus(DEFAULT_STATUS);
      pollingEnabled.current = false;
      lastConnectionParams.current = null;
      reconnectAttempts.current = 0;
      isReconnecting.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    }
    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [fetchStatus, user]);

  const connectRobot = useCallback(async (robotType, iface = 'eth0') => {
    setLoading(true);
    explicitDisconnect.current = false;
    lastConnectionParams.current = { robotType, iface };
    reconnectAttempts.current = 0;
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
      
      pollingEnabled.current = true;
      if (scheduleNextPollRef.current) {
        scheduleNextPollRef.current();
      }

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
    lastConnectionParams.current = null;
    pollingEnabled.current = false;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
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
      let response;
      if (statusRef.current.robot_type === 'go2') {
        response = await executeRobotAction('recovery_stand');
      } else {
        response = await standUpRobotRequest();
      }
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
