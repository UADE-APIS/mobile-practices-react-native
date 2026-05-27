import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const RobotContext = createContext(null);

export function RobotProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [serverUrl, setServerUrlState] = useState(
    Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000'
  );
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
  }), []);

  useEffect(() => {
    const interceptor = api.interceptors.request.use(
      async (config) => {
        config.baseURL = serverUrl;
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
          setServerUrlState(savedUrl);
        }
      } catch (err) {
        console.error('Failed to load server URL from SecureStore:', err);
      }
    };
    loadConfig();
  }, []);

  const setServerUrl = async (url) => {
    try {
      await SecureStore.setItemAsync('server_url', url);
      setServerUrlState(url);
    } catch (err) {
      console.error('Failed to save server URL:', err);
    }
  };

  const fetchStatus = async () => {
    if (!user) return;
    try {
      const response = await api.get('/status');
      setStatus(response.data);
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  };

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
  }, [user, serverUrl]);

  const connectRobot = async (robotType, iface = 'eth0') => {
    setLoading(true);
    try {
      const response = await api.post('/connect', {
        robot_type: robotType,
        network_interface: iface,
      });
      await fetchStatus();
      return response.data;
    } catch (err) {
      console.error('Connection error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const disconnectRobot = async () => {
    setLoading(true);
    try {
      const response = await api.post('/disconnect');
      await fetchStatus();
      return response.data;
    } catch (err) {
      console.error('Disconnection error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const moveRobot = async (vx, vy, vyaw) => {
    try {
      const response = await api.post('/move', { vx, vy, vyaw });
      return response.data;
    } catch (err) {
      console.error('Move error:', err);
      throw err;
    }
  };

  const stopRobot = async () => {
    try {
      const response = await api.post('/stop');
      return response.data;
    } catch (err) {
      console.error('Stop error:', err);
      throw err;
    }
  };

  const standUpRobot = async () => {
    try {
      const response = await api.post('/standup');
      return response.data;
    } catch (err) {
      console.error('Stand up error:', err);
      throw err;
    }
  };

  const sitDownRobot = async () => {
    try {
      const response = await api.post('/sitdown');
      return response.data;
    } catch (err) {
      console.error('Sit down error:', err);
      throw err;
    }
  };

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
