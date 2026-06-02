import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HistoryScreen from '../screens/HistoryScreen';
import { RobotContext } from '../context/RobotContext';

// Mock navigation hooks from react-navigation
jest.mock('@react-navigation/native', () => {
  const { useEffect } = require('react');
  return {
    useFocusEffect: (callback) => {
      useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialCommunityIcons: () => <View testID="icon" />,
  };
});

describe('HistoryScreen', () => {
  const mockGetHistoryList = jest.fn();

  const renderHistoryScreen = () => {
    return render(
      <RobotContext.Provider value={{ getHistoryList: mockGetHistoryList }}>
        <HistoryScreen />
      </RobotContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe renderizar un mensaje de lista vacía si no hay registros', async () => {
    mockGetHistoryList.mockResolvedValue([]);

    const { getByText } = renderHistoryScreen();

    await waitFor(() => {
      expect(mockGetHistoryList).toHaveBeenCalled();
      expect(getByText('No hay comandos registrados en esta sesión.')).toBeTruthy();
    });
  });

  it('debe listar los comandos obtenidos del context correctamente', async () => {
    const mockHistory = [
      {
        timestamp: '2026-06-02T19:00:00.000Z',
        command_type: 'CONNECT',
        details: 'robot_type=go2, interface=eth0',
        success: true,
      },
      {
        timestamp: '2026-06-02T19:01:00.000Z',
        command_type: 'MOVE',
        details: 'vx=0.3, vy=0.0, vyaw=0.0',
        success: false,
      },
    ];
    mockGetHistoryList.mockResolvedValue(mockHistory);

    const { getByText } = renderHistoryScreen();

    await waitFor(() => {
      expect(mockGetHistoryList).toHaveBeenCalled();
      expect(getByText('CONNECT')).toBeTruthy();
      expect(getByText('MOVE')).toBeTruthy();
      expect(getByText('robot_type=go2, interface=eth0')).toBeTruthy();
      expect(getByText('vx=0.3, vy=0.0, vyaw=0.0')).toBeTruthy();
      expect(getByText('ÉXITO')).toBeTruthy();
      expect(getByText('FALLO')).toBeTruthy();
    });
  });

  it('debe mostrar mensaje de error y permitir reintentar si la llamada falla', async () => {
    mockGetHistoryList.mockRejectedValueOnce(new Error('SecureStore error'));
    mockGetHistoryList.mockResolvedValueOnce([]);

    const { getByText, queryByText } = renderHistoryScreen();

    await waitFor(() => {
      expect(getByText('No se pudo cargar el historial de comandos.')).toBeTruthy();
    });

    const retryButton = getByText('Reintentar');
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(mockGetHistoryList).toHaveBeenCalledTimes(2);
      expect(queryByText('No se pudo cargar el historial de comandos.')).toBeNull();
      expect(getByText('No hay comandos registrados en esta sesión.')).toBeTruthy();
    });
  });
});
