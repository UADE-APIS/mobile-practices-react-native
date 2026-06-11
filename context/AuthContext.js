import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { getApiErrorMessage, normalizeServerUrl, API_TIMEOUT } from '../config/api';
import { registerOperator, requestAuthToken } from '../services/authApi';
import { disconnectRobotRequest } from '../services/robotApi';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const identifier = await SecureStore.getItemAsync('identifier');
        const serverUrl = await SecureStore.getItemAsync('server_url');
        
        if (token && identifier && serverUrl) {
          try {
            await axios.get(`${serverUrl}/status`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: API_TIMEOUT
            });
            setUser({ identifier, username: identifier });
          } catch (verifyErr) {
            if (verifyErr.response && verifyErr.response.status === 401) {
              await SecureStore.deleteItemAsync('token');
              await SecureStore.deleteItemAsync('identifier');
              await SecureStore.deleteItemAsync('server_url');
              setUser(null);
            } else {
              setUser({ identifier, username: identifier });
            }
          }
        }
      } catch (e) {
        console.error('Failed to load login state from SecureStore:', e);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (identifier, password, serverUrl) => {
    try {
      const cleanServerUrl = normalizeServerUrl(serverUrl);
      const cleanIdentifier = identifier.trim();

      const response = await requestAuthToken(cleanServerUrl, cleanIdentifier, password);
      const { access_token } = response.data;

      // Consolidación de claves (Bug 7)
      await SecureStore.setItemAsync('token', access_token);
      await SecureStore.setItemAsync('identifier', cleanIdentifier);
      await SecureStore.setItemAsync('server_url', cleanServerUrl);

      setUser({ identifier: cleanIdentifier, username: cleanIdentifier });
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      throw new Error(getApiErrorMessage(err));
    }
  };

  const register = async (username, email, password, serverUrl) => {
    try {
      const cleanServerUrl = normalizeServerUrl(serverUrl);
      await registerOperator(cleanServerUrl, username.trim(), email.trim(), password);
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      throw new Error(getApiErrorMessage(err));
    }
  };

  const logout = async () => {
    try {
      try {
        await disconnectRobotRequest();
      } catch (disconnectErr) {
        console.log('Robot disconnect on logout:', disconnectErr.message);
      }

      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('identifier');
      await SecureStore.deleteItemAsync('server_url');
      setUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}