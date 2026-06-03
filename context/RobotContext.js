import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { AuthContext } from './AuthContext';
import { API_TIMEOUT, getDefaultServerUrl, normalizeServerUrl } from '../config/api';
import { addLogEntry, getHistoryList } from '../utils/history';

export const RobotContext = createContext(null);

export function RobotProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [serverUrl, setServerUrlState] = useState(getDefaultServerUrl());
  const [status, setStatus] = useState({
    connection_state: 'disconnected',
    robot_type: null,
    network_interface: null,
    connected_at: null,
    last_error: null,
  });
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
      console.error('Error fetching status:', err);
    }
  }, [api, user]);

  // Poll status periodically when user is logged in
  useEffect(() => {
    if (user) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 3000);
      return () => clearInterval(interval);
    } else {
      setStatus({
        connection_state: 'disconnected',
        robot_type: null,
        network_interface: null,
        connected_at: null,
        last_error: null,
      });
    }
  }, [fetchStatus, user]);

  const connectRobot = useCallback(async (robotType, iface = 'eth0') => {
    setLoading(true);
    try {
      const response = await api.post('/connect', {
        robot_type: robotType,
        network_interface: iface,
      });
      await addLogEntry('CONNECT', `robot_type=${robotType}, interface=${iface}`, true);
      await fetchStatus();
      return response.data;
    } catch (err) {
      await addLogEntry('CONNECT', `robot_type=${robotType}, interface=${iface}, error=${err.message || 'unknown'}`, false);
      console.error('Connection error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api, fetchStatus]);

  const disconnectRobot = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.post('/disconnect');
      await addLogEntry('DISCONNECT', '', true);
      await fetchStatus();
      return response.data;
    } catch (err) {
      await addLogEntry('DISCONNECT', `error=${err.message || 'unknown'}`, false);
      console.error('Disconnection error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api, fetchStatus]);

  const moveRobot = useCallback(async (vx, vy, vyaw) => {
    try {
      const response = await api.post('/move', { vx, vy, vyaw });
      await addLogEntry('MOVE', `vx=${vx}, vy=${vy}, vyaw=${vyaw}`, true);
      return response.data;
    } catch (err) {
      await addLogEntry('MOVE', `vx=${vx}, vy=${vy}, vyaw=${vyaw}, error=${err.message || 'unknown'}`, false);
      console.error('Move error:', err);
      throw err;
    }
  }, [api]);

  const stopRobot = useCallback(async () => {
    try {
      const response = await api.post('/stop');
      await addLogEntry('STOP', '', true);
      return response.data;
    } catch (err) {
      await addLogEntry('STOP', `error=${err.message || 'unknown'}`, false);
      console.error('Stop error:', err);
      throw err;
    }
  }, [api]);

  const standUpRobot = useCallback(async () => {
    try {
      const response = await api.post('/standup');
      await addLogEntry('STANDUP', '', true);
      return response.data;
    } catch (err) {
      await addLogEntry('STANDUP', `error=${err.message || 'unknown'}`, false);
      console.error('Stand up error:', err);
      throw err;
    }
  }, [api]);

  const sitDownRobot = useCallback(async () => {
    try {
      const response = await api.post('/sitdown');
      await addLogEntry('SITDOWN', '', true);
      return response.data;
    } catch (err) {
      await addLogEntry('SITDOWN', `error=${err.message || 'unknown'}`, false);
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
        getHistoryList,
        api,
      }}
    >
      {children}
    </RobotContext.Provider>
  );
}
