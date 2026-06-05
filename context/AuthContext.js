import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { getApiErrorMessage, normalizeServerUrl } from '../config/api';
import { registerOperator, requestAuthToken } from '../services/authApi';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const identifier = await SecureStore.getItemAsync('identifier');
        const email = await SecureStore.getItemAsync('email');
        const username = await SecureStore.getItemAsync('username');
        const savedIdentifier = identifier || username || email;
        
        if (token && savedIdentifier) {
          setUser({
            identifier: savedIdentifier,
            email,
            username: username || savedIdentifier,
          });
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

      await SecureStore.setItemAsync('token', access_token);
      await SecureStore.setItemAsync('identifier', cleanIdentifier);
      await SecureStore.setItemAsync('username', cleanIdentifier);
      await SecureStore.deleteItemAsync('email');
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
      await SecureStore.deleteItemAsync('token');
      await SecureStore.deleteItemAsync('identifier');
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
