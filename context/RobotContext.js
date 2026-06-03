import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { API_TIMEOUT, getDefaultServerUrl, normalizeServerUrl } from '../config/api';
import { addLogEntry, getHistoryList } from '../utils/history';

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

<<<<<<< HEAD
  if (err.code === 'ECONNABORTED' && serverUrl) {
    return `Timeout consultando ${serverUrl}. Revisá si la IP del backend cambió o si el celular está en la misma red.`;
  }

=======
>>>>>>> main
  return err.response?.data?.detail
    || err.response?.data?.error
    || err.message
    || fallback;
}

export function RobotProvider({ children }) {
  const { user, logout } = useContext(AuthContext);
  const [serverUrl, setServerUrlState] = useState(getDefaultServerUrl());
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [loading, setLoading] = useState(false);

  const api = useMemo(() => axios.create({
    baseURL: serverUrl,
    timeout: API_TIMEOUT,
  }), []);

  useEffect(() => {
    const interceptor = api.interceptors.request.use(
      async (config) => {
        config.baseURL = normalizeServerUrl(serverUrl);
        const token = await SecureStore.getItemAsync('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => api.interceptors.request.eject(interceptor);
  }, [api, serverUrl]);

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

  const setServerUrl = useCallback(async (url) => {
    try {
      const cleanUrl = normalizeServerUrl(url);
      await SecureStore.setItemAsync('server_url', cleanUrl);
      setServerUrlState(cleanUrl);
    } catch (err) {
      console.error('Failed to save server URL:', err);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    try {
      const response = await api.get('/status');
      setStatus(response.data);
    } catch (err) {
      console.warn('Error fetching status:', err.message || err);
      if (err.response && err.response.status === 401) {
        console.warn('Token expired or invalid, logging out...');
        if (logout) {
          logout();
        }
      } else {
        setStatus((currentStatus) => ({
          ...currentStatus,
          connection_state: 'error',
          last_error: getRobotErrorMessage(err, 'No se pudo consultar el estado del robot.', serverUrl),
        }));
      }
    }
  }, [api, user, logout, serverUrl]);

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
    setStatus((currentStatus) => ({
      ...currentStatus,
      connection_state: 'connecting',
      robot_type: robotType,
      network_interface: iface,
      last_error: null,
    }));
    try {
      const response = await api.post('/connect', {
        robot_type: robotType,
        network_interface: iface,
      });
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
  }, [api, fetchStatus, serverUrl]);

  const disconnectRobot = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.post('/disconnect');
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
  }, [api, fetchStatus, serverUrl]);

  const moveRobot = useCallback(async (vx, vy, vyaw) => {
    try {
      const response = await api.post('/move', { vx, vy, vyaw });
      await addLogEntry('MOVE', `vx=${vx}, vy=${vy}, vyaw=${vyaw}`, true);
      return response.data;
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo enviar el movimiento.', serverUrl);
      err.robotMessage = errorMessage;
      await addLogEntry('MOVE', `vx=${vx}, vy=${vy}, vyaw=${vyaw}, error=${errorMessage}`, false);
      console.error('Move error:', err);
      throw err;
    }
  }, [api, serverUrl]);

  const stopRobot = useCallback(async () => {
    try {
      const response = await api.post('/stop');
      await addLogEntry('STOP', '', true);
      return response.data;
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo detener el robot.', serverUrl);
      err.robotMessage = errorMessage;
      await addLogEntry('STOP', `error=${errorMessage}`, false);
      console.error('Stop error:', err);
      throw err;
    }
  }, [api, serverUrl]);

  const standUpRobot = useCallback(async () => {
    try {
      const response = await api.post('/standup');
      await addLogEntry('STANDUP', '', true);
      return response.data;
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo enviar el comando Pararse.', serverUrl);
      err.robotMessage = errorMessage;
      await addLogEntry('STANDUP', `error=${errorMessage}`, false);
      console.error('Stand up error:', err);
      throw err;
    }
  }, [api, serverUrl]);

  const sitDownRobot = useCallback(async () => {
    try {
      const response = await api.post('/sitdown');
      await addLogEntry('SITDOWN', '', true);
      return response.data;
    } catch (err) {
      const errorMessage = getRobotErrorMessage(err, 'No se pudo enviar el comando Sentarse.', serverUrl);
      err.robotMessage = errorMessage;
      await addLogEntry('SITDOWN', `error=${errorMessage}`, false);
      console.error('Sit down error:', err);
      throw err;
    }
  }, [api, serverUrl]);

  return (
    <RobotContext.Provider
      value={{
        status,
        loading,
        serverUrl,
        setServerUrl,
        connectRobot,
        disconnectRobot,
        moveRobot,
        stopRobot,
        standUpRobot,
        sitDownRobot,
        fetchStatus,
        getHistoryList,
        api,
      }}
    >
      {children}
    </RobotContext.Provider>
  );
}
