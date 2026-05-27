import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await SecureStore.getItemAsync('token');
        const username = await SecureStore.getItemAsync('username');
        
        if (token && username) {
          setUser({ username });
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
      const response = await axios.post(`${serverUrl}/auth/token`, {
        identifier,
        password,
      });

      const { access_token } = response.data;
      
      // Save credentials and configuration
      await SecureStore.setItemAsync('token', access_token);
      await SecureStore.setItemAsync('username', identifier); // Save the username
      await SecureStore.setItemAsync('server_url', serverUrl);
      
      setUser({ username: identifier });
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const detail = err.response?.data?.detail || 'Error de conexión con el servidor.';
      throw new Error(detail);
    }
  };

  const register = async (username, email, password, serverUrl) => {
    try {
      await axios.post(`${serverUrl}/auth/register`, {
        username,
        email,
        password,
      });
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      const detail = err.response?.data?.detail || 'Error de conexión con el servidor.';
      throw new Error(detail);
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
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
