import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ControlScreen, { getJoystickCommand } from '../screens/ControlScreen';
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
    mockMoveRobot.mockResolvedValue({ success: true });
    mockStopRobot.mockResolvedValue({ success: true });
    mockStandUpRobot.mockResolvedValue({ success: true });
    mockSitDownRobot.mockResolvedValue({ success: true });
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

  it('debe mapear correctamente los cuatro controles direccionales', async () => {
    const { getByText } = renderControlScreen();

    fireEvent.press(getByText('Adelante'));
    await waitFor(() => expect(mockMoveRobot).toHaveBeenLastCalledWith(0.45, 0, 0));

    fireEvent.press(getByText('Atrás'));
    await waitFor(() => expect(mockMoveRobot).toHaveBeenLastCalledWith(-0.45, 0, 0));

    fireEvent.press(getByText('Izquierda'));
    await waitFor(() => expect(mockMoveRobot).toHaveBeenLastCalledWith(0, 0.45, 0));

    fireEvent.press(getByText('Derecha'));
    await waitFor(() => expect(mockMoveRobot).toHaveBeenLastCalledWith(0, -0.45, 0));
  });

  it('debe enviar detener', async () => {
    const { getByText } = renderControlScreen();

    fireEvent.press(getByText('Detener'));

    await waitFor(() => {
      expect(mockStopRobot).toHaveBeenCalled();
    });
  });

  it('debe mantener detener disponible mientras hay un movimiento pendiente', async () => {
    let resolveMove;
    let resolveStop;
    mockMoveRobot.mockImplementation(() => new Promise((resolve) => {
      resolveMove = resolve;
    }));
    mockStopRobot
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveStop = resolve;
      }))
      .mockResolvedValue({ success: true });

    const { getByText } = renderControlScreen();

    fireEvent.press(getByText('Adelante'));
    fireEvent.press(getByText('Detener'));

    await waitFor(() => {
      expect(mockStopRobot).toHaveBeenCalledTimes(1);
    });

    resolveMove({ success: true });
    fireEvent.press(getByText('Adelante'));

    expect(mockMoveRobot).toHaveBeenCalledTimes(1);

    resolveStop({ success: true });

    await waitFor(() => {
      expect(mockStopRobot).toHaveBeenCalledTimes(2);
    });
  });

  it('debe convertir la posicion del joystick en velocidades variables', () => {
    expect(getJoystickCommand(78, -78, 'lateral')).toEqual({ vx: 0.45, vy: 0.45, vyaw: 0 });
    expect(getJoystickCommand(-39, 39, 'giro')).toEqual({ vx: -0.23, vy: 0, vyaw: -0.6 });
  });

  it('debe enviar comandos de postura', async () => {
    const { getByText } = renderControlScreen();

    fireEvent.press(getByText('Pararse'));

    await waitFor(() => {
      expect(mockStandUpRobot).toHaveBeenCalled();
    });
    expect(mockStopRobot.mock.invocationCallOrder[0]).toBeLessThan(mockStandUpRobot.mock.invocationCallOrder[0]);

    fireEvent.press(getByText('Sentarse'));

    await waitFor(() => {
      expect(mockSitDownRobot).toHaveBeenCalled();
    });
    expect(mockStopRobot.mock.invocationCallOrder[1]).toBeLessThan(mockSitDownRobot.mock.invocationCallOrder[0]);
  });
});
