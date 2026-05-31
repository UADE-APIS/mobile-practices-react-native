import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { API_TIMEOUT, getDefaultServerUrl, normalizeServerUrl } from '../config/api';

export const RobotContext = createContext(null);

const DEFAULT_STATUS = {
  connection_state: 'disconnected',
  robot_type: null,
  network_interface: null,
  connected_at: null,
  last_error: null,
};

function getRobotErrorMessage(err, fallback) {
  return err.response?.data?.detail
    || err.response?.data?.error
    || err.message
    || fallback;
}

export function RobotProvider({ children }) {
  const { user } = useContext(AuthContext);
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
  }, []);

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
      console.error('Error fetching status:', err);
      setStatus((currentStatus) => ({
        ...currentStatus,
        connection_state: 'error',
        last_error: getRobotErrorMessage(err, 'No se pudo consultar el estado del robot.'),
      }));
    }
  }, [api, user]);

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
      await fetchStatus();
      return response.data;
    } catch (err) {
      console.error('Connection error:', err);
      setStatus((currentStatus) => ({
        ...currentStatus,
        connection_state: 'error',
        last_error: getRobotErrorMessage(err, 'No se pudo establecer la conexión con el robot.'),
      }));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api, fetchStatus]);

  const disconnectRobot = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.post('/disconnect');
      await fetchStatus();
      return response.data;
    } catch (err) {
      console.error('Disconnection error:', err);
      setStatus((currentStatus) => ({
        ...currentStatus,
        connection_state: 'error',
        last_error: getRobotErrorMessage(err, 'No se pudo desconectar el robot.'),
      }));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api, fetchStatus]);

  const moveRobot = useCallback(async (vx, vy, vyaw) => {
    try {
      const response = await api.post('/move', { vx, vy, vyaw });
      return response.data;
    } catch (err) {
      console.error('Move error:', err);
      throw err;
    }
  }, [api]);

  const stopRobot = useCallback(async () => {
    try {
      const response = await api.post('/stop');
      return response.data;
    } catch (err) {
      console.error('Stop error:', err);
      throw err;
    }
  }, [api]);

  const standUpRobot = useCallback(async () => {
    try {
      const response = await api.post('/standup');
      return response.data;
    } catch (err) {
      console.error('Stand up error:', err);
      throw err;
    }
  }, [api]);

  const sitDownRobot = useCallback(async () => {
    try {
      const response = await api.post('/sitdown');
      return response.data;
    } catch (err) {
      console.error('Sit down error:', err);
      throw err;
    }
  }, [api]);

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
        api,
      }}
    >
      {children}
    </RobotContext.Provider>
  );
}
