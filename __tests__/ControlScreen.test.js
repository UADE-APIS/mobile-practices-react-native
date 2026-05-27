import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ControlScreen from '../screens/ControlScreen';
import { RobotContext } from '../context/RobotContext';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialCommunityIcons: () => <View testID="icon" />,
  };
});

describe('ControlScreen (Control de Movimiento)', () => {
  const mockMoveRobot = jest.fn().mockResolvedValue({ success: true });
  const mockStopRobot = jest.fn().mockResolvedValue({ success: true });
  const mockStandUpRobot = jest.fn().mockResolvedValue({ success: true });
  const mockSitDownRobot = jest.fn().mockResolvedValue({ success: true });

  const disconnectedStatus = {
    connection_state: 'disconnected',
    robot_type: null,
    network_interface: null,
    connected_at: null,
    last_error: null,
  };

  const connectedStatus = {
    connection_state: 'connected',
    robot_type: 'go2',
    network_interface: 'eth0',
    connected_at: '2026-05-19T22:30:00Z',
    last_error: null,
  };

  const renderControlScreen = (status = connectedStatus) => render(
    <NavigationContainer>
      <RobotContext.Provider
        value={{
          status,
          moveRobot: mockMoveRobot,
          stopRobot: mockStopRobot,
          standUpRobot: mockStandUpRobot,
          sitDownRobot: mockSitDownRobot,
        }}
      >
        <ControlScreen />
      </RobotContext.Provider>
    </NavigationContainer>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe mostrar la pantalla deshabilitada si el robot no está conectado', () => {
    const { getByText } = renderControlScreen(disconnectedStatus);

    expect(getByText('Robot desconectado')).toBeTruthy();

    fireEvent.press(getByText('Adelante'));
    expect(mockMoveRobot).not.toHaveBeenCalled();
  });

  it('debe enviar movimiento hacia adelante', async () => {
    const { getByText } = renderControlScreen();

    fireEvent.press(getByText('Adelante'));

    await waitFor(() => {
      expect(mockMoveRobot).toHaveBeenCalledWith(0.45, 0, 0);
    });
  });

  it('debe enviar detener', async () => {
    const { getByText } = renderControlScreen();

    fireEvent.press(getByText('Detener'));

    await waitFor(() => {
      expect(mockStopRobot).toHaveBeenCalled();
    });
  });

  it('debe enviar comandos de postura', async () => {
    const { getByText } = renderControlScreen();

    fireEvent.press(getByText('Pararse'));

    await waitFor(() => {
      expect(mockStandUpRobot).toHaveBeenCalled();
    });

    fireEvent.press(getByText('Sentarse'));

    await waitFor(() => {
      expect(mockSitDownRobot).toHaveBeenCalled();
    });
  });
});
