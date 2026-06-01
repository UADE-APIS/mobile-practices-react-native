import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_TIMEOUT, getApiErrorMessage, normalizeServerUrl, withTimeout } from '../config/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const email = await SecureStore.getItemAsync('email');
        const username = await SecureStore.getItemAsync('username');
        
        if (token && (email || username)) {
          setUser({ email: email || username, username: username || email });
        }
      } catch (e) {
        console.error('Failed to load login state from SecureStore:', e);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const login = async (email, password, serverUrl) => {
    try {
      const cleanServerUrl = normalizeServerUrl(serverUrl);
      const cleanEmail = email.trim().toLowerCase();

      const response = await withTimeout(
        axios.post(`${cleanServerUrl}/auth/token`, {
          identifier: cleanEmail,
          password,
        }, {
          timeout: API_TIMEOUT,
        }),
        'No se pudo conectar con el servidor.'
      );

      const { access_token } = response.data;

      await SecureStore.setItemAsync('token', access_token);
      await SecureStore.setItemAsync('email', cleanEmail);
      await SecureStore.setItemAsync('username', cleanEmail);
      await SecureStore.setItemAsync('server_url', cleanServerUrl);

      setUser({ email: cleanEmail, username: cleanEmail });
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      throw new Error(getApiErrorMessage(err));
    }
  };

  const register = async (username, email, password, serverUrl) => {
    try {
      const cleanServerUrl = normalizeServerUrl(serverUrl);

      await withTimeout(
        axios.post(`${cleanServerUrl}/auth/register`, {
          username: username.trim(),
          email: email.trim(),
          password,
        }, {
          timeout: API_TIMEOUT,
        }),
        'No se pudo conectar con el servidor.'
      );
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      throw new Error(getApiErrorMessage(err));
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('email');
      await SecureStore.deleteItemAsync('username');
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
