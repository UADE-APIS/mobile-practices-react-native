import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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

describe('DiagnosticsScreen', () => {
  const mockSetServerUrl = jest.fn().mockResolvedValue(undefined);
  const mockFetchStatus = jest.fn();
  const status = {
    connection_state: 'error',
    robot_type: 'go2',
    network_interface: 'eth0',
    connected_at: null,
    last_error: 'Network Error',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Alert.alert.mockRestore();
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
    expect(getByText('Sugerida para Expo Go: http://10.2.2.220:8000')).toBeTruthy();
  });

  it('debe guardar la URL de API normalizada', async () => {
    const { getByDisplayValue, getByTestId } = renderScreen();

    fireEvent.changeText(getByDisplayValue('http://localhost:8000'), 'http://10.2.2.220:8000/');
    fireEvent.press(getByTestId('save-api-url'));

    await waitFor(() => {
      expect(mockSetServerUrl).toHaveBeenCalledWith('http://10.2.2.220:8000');
    });
  });

  it('debe guardar la URL sugerida', async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('use-recommended-api-url'));

    await waitFor(() => {
      expect(mockSetServerUrl).toHaveBeenCalledWith('http://10.2.2.220:8000');
    });
  });
});
