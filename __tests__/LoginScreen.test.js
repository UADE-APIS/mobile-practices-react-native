import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import LoginScreen from '../screens/LoginScreen';
import { AuthContext } from '../context/AuthContext';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialCommunityIcons: () => <View testID="icon" />,
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
}));

jest.mock('../config/api', () => ({
  isLocalServerUrl: (url) => url.includes('localhost') || url.includes('127.0.0.1') || url.includes('10.0.2.2'),
  normalizeServerUrl: (url) => url.trim().replace(/\/+$/, ''),
}));

jest.mock('../hooks/useRecommendedServerUrl', () => jest.fn());

import useRecommendedServerUrl from '../hooks/useRecommendedServerUrl';

describe('LoginScreen', () => {
  const mockLogin = jest.fn().mockResolvedValue({ success: true });
  const mockNavigate = jest.fn();
  let recommendedUrl;

  beforeEach(() => {
    jest.clearAllMocks();
    recommendedUrl = 'http://10.2.2.220:8000';
    useRecommendedServerUrl.mockImplementation(() => ({
      recommendedUrl,
      networkState: { type: 'WIFI', isConnected: true, isInternetReachable: true },
      refreshRecommendedUrl: jest.fn(),
    }));
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Alert.alert.mockRestore();
  });

  const renderScreen = () => render(
    <AuthContext.Provider value={{ login: mockLogin }}>
      <LoginScreen navigation={{ navigate: mockNavigate }} />
    </AuthContext.Provider>
  );

  it('debe autocolocar la URL recomendada aunque exista una URL local guardada', async () => {
    SecureStore.getItemAsync.mockResolvedValue('http://localhost:8000');

    const { getByDisplayValue, getByText } = renderScreen();

    expect(getByText('Recomendada: http://10.2.2.220:8000')).toBeTruthy();

    await waitFor(() => {
      expect(getByDisplayValue('http://10.2.2.220:8000')).toBeTruthy();
    });
  });

  it('debe permitir cambiar manualmente la URL usada para login', async () => {
    const { getByDisplayValue, getByPlaceholderText, getByText } = renderScreen();

    await waitFor(() => {
      expect(getByDisplayValue('http://10.2.2.220:8000')).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText('http://localhost:8000'), 'http://192.168.1.44:8000');
    fireEvent.changeText(getByPlaceholderText('JBE10 u operador@uade.edu.ar'), 'JBE10');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText('INICIAR SESIÓN'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('JBE10', 'password123', 'http://192.168.1.44:8000');
    });
  });

  it('debe actualizar la URL si cambia la red y el campo sigue en automático', async () => {
    SecureStore.getItemAsync.mockResolvedValue('http://localhost:8000');
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://10.2.2.220:8000')).toBeTruthy();
    });

    recommendedUrl = 'http://10.2.2.221:8000';
    screen.rerender(
      <AuthContext.Provider value={{ login: mockLogin }}>
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://10.2.2.221:8000')).toBeTruthy();
    });
  });

  it('no debe pisar una URL manual cuando cambia la red', async () => {
    const screen = renderScreen();

    await waitFor(() => {
      expect(screen.getByDisplayValue('http://10.2.2.220:8000')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByPlaceholderText('http://localhost:8000'), 'http://192.168.1.44:8000');

    recommendedUrl = 'http://10.2.2.221:8000';
    screen.rerender(
      <AuthContext.Provider value={{ login: mockLogin }}>
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      </AuthContext.Provider>
    );

    expect(screen.getByDisplayValue('http://192.168.1.44:8000')).toBeTruthy();
  });
});
