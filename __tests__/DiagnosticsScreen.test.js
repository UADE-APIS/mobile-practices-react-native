import React from 'react';
import { render } from '@testing-library/react-native';
import DiagnosticsScreen from '../screens/DiagnosticsScreen';
import { RobotContext } from '../context/RobotContext';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialCommunityIcons: () => <View testID="icon" />,
  };
});

jest.mock('../config/api', () => ({
  getDefaultServerUrl: () => 'http://10.2.2.220:8000',
  normalizeServerUrl: (url) => url.trim().replace(/\/+$/, ''),
}));

jest.mock('../hooks/useRecommendedServerUrl', () => jest.fn());

import useRecommendedServerUrl from '../hooks/useRecommendedServerUrl';

describe('DiagnosticsScreen', () => {
  const mockSetServerUrl = jest.fn().mockResolvedValue(undefined);
  const mockFetchStatus = jest.fn();
  let recommendedUrl;
  const status = {
    connection_state: 'error',
    robot_type: 'go2',
    network_interface: 'eth0',
    connected_at: null,
    last_error: 'Network Error',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    recommendedUrl = 'http://10.2.2.220:8000';
    useRecommendedServerUrl.mockImplementation(() => ({
      recommendedUrl,
      networkState: { type: 'WIFI', isConnected: true, isInternetReachable: true },
      refreshRecommendedUrl: jest.fn(),
    }));
  });

  const renderScreen = () => render(
    <RobotContext.Provider
      value={{
        status,
        serverUrl: 'http://localhost:8000',
        setServerUrl: mockSetServerUrl,
        fetchStatus: mockFetchStatus,
      }}
    >
      <DiagnosticsScreen />
    </RobotContext.Provider>
  );

  it('debe mostrar la URL actual y la sugerida', () => {
    const { getByText } = renderScreen();

    expect(getByText('URL actual: http://localhost:8000')).toBeTruthy();
    expect(getByText('Recomendada: http://10.2.2.220:8000')).toBeTruthy();
    expect(getByText('Red: WIFI')).toBeTruthy();
    expect(getByText('La URL de API solo se cambia antes de iniciar sesión.')).toBeTruthy();
  });

  it('debe actualizar la URL sugerida cuando cambia la red sin cambiar la URL activa', () => {
    const screen = renderScreen();

    recommendedUrl = 'http://10.2.2.221:8000';
    screen.rerender(
      <RobotContext.Provider
        value={{
          status,
          serverUrl: 'http://localhost:8000',
          setServerUrl: mockSetServerUrl,
          fetchStatus: mockFetchStatus,
        }}
      >
        <DiagnosticsScreen />
      </RobotContext.Provider>
    );

    expect(screen.getByText('Recomendada: http://10.2.2.221:8000')).toBeTruthy();
    expect(screen.getByText('URL actual: http://localhost:8000')).toBeTruthy();
    expect(mockSetServerUrl).not.toHaveBeenCalled();
  });

  it('no debe mostrar controles para cambiar la API si ya esta logueado', () => {
    const { queryByTestId, queryByDisplayValue } = renderScreen();

    expect(queryByTestId('save-api-url')).toBeNull();
    expect(queryByTestId('use-recommended-api-url')).toBeNull();
    expect(queryByDisplayValue('http://localhost:8000')).toBeNull();
  });
});
