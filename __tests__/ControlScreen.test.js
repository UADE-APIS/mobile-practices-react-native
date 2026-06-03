import React from 'react';
import * as ReactNative from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import ControlScreen, {
  getJoystickCommand,
  getMoveJoystickCommand,
  getVectorFromTouch,
  getYawJoystickCommand,
  normalizeJoystickVector,
} from '../screens/ControlScreen';
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
    jest.restoreAllMocks();
    ReactNative.Dimensions.set({
      window: { width: 390, height: 844, scale: 1, fontScale: 1 },
      screen: { width: 390, height: 844, scale: 1, fontScale: 1 },
    });
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
    expect(getJoystickCommand(78, -78, 'lateral')).toEqual({ vx: 0.32, vy: 0.32, vyaw: 0 });
    expect(getJoystickCommand(-39, 39)).toEqual({ vx: -0.23, vy: -0.23, vyaw: 0 });
  });

  it('debe soportar diagonales en modo lateral', () => {
    expect(getMoveJoystickCommand(39, -39)).toEqual({ vx: 0.23, vy: 0.23, vyaw: 0 });
  });

  it('debe mantener vyaw en cero al mover hacia las esquinas', () => {
    expect(getJoystickCommand(39, -39)).toEqual({ vx: 0.23, vy: 0.23, vyaw: 0 });
    expect(getJoystickCommand(-39, -39)).toEqual({ vx: 0.23, vy: -0.23, vyaw: 0 });
  });

  it('debe convertir el joystick de direccion en vyaw', () => {
    expect(getYawJoystickCommand(39)).toEqual({ vx: 0, vy: 0, vyaw: 0.6 });
    expect(getYawJoystickCommand(-39)).toEqual({ vx: 0, vy: 0, vyaw: -0.6 });
    expect(getYawJoystickCommand(999).vyaw).toBeLessThanOrEqual(1.2);
  });

  it('debe obtener el vector desde la posicion exacta del dedo', () => {
    const event = {
      nativeEvent: {
        locationX: 149,
        locationY: 71,
      },
    };

    expect(getVectorFromTouch(event)).toEqual({ x: 39, y: -39 });
    expect(getVectorFromTouch(event, false)).toEqual({ x: 39, y: 0 });
  });

  it('debe normalizar circularmente el vector del joystick', () => {
    const vector = normalizeJoystickVector(78, 78);

    expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(78);
    expect(vector.x).toBeCloseTo(55.15, 2);
    expect(vector.y).toBeCloseTo(55.15, 2);
  });

  it('no debe anular el comando por pequeños desvios fuera del eje', () => {
    const command = getJoystickCommand(2, -50, 'lateral');

    expect(command.vx).toBeGreaterThan(0);
    expect(command.vy).toBeGreaterThan(0);
  });

  it('debe devolver comandos validos y dentro de rango', () => {
    const invalidCommand = getJoystickCommand(undefined, NaN, 'lateral');
    const largeCommand = getJoystickCommand(999, -999);

    [...Object.values(invalidCommand), ...Object.values(largeCommand)].forEach((value) => {
      expect(Number.isFinite(value)).toBe(true);
    });
    expect(invalidCommand).toEqual({ vx: 0, vy: 0, vyaw: 0 });
    expect(Math.abs(largeCommand.vx)).toBeLessThanOrEqual(0.45);
    expect(Math.abs(largeCommand.vy)).toBeLessThanOrEqual(0.45);
    expect(largeCommand.vyaw).toBe(0);
  });

  it('debe permitir elegir modo arrastre', () => {
    const { getByText } = renderControlScreen();

    fireEvent.press(getByText('Arrastre'));

    expect(getByText('Arrastrá dentro del área')).toBeTruthy();
  });

  it('debe mostrar el control de orientacion horizontal', () => {
    const { getByTestId, getByText, queryByTestId } = renderControlScreen();

    fireEvent.press(getByTestId('orientation-toggle'));

    expect(getByText('Poné el celular en horizontal para ver los dos joysticks.')).toBeTruthy();
    expect(queryByTestId('move-joystick-base')).toBeNull();
  });

  it('no debe cambiar el layout automaticamente al girar el celular', () => {
    ReactNative.Dimensions.set({
      window: { width: 900, height: 420, scale: 1, fontScale: 1 },
      screen: { width: 900, height: 420, scale: 1, fontScale: 1 },
    });

    const { getByTestId, queryByTestId } = renderControlScreen();

    expect(getByTestId('joystick-base')).toBeTruthy();
    expect(queryByTestId('move-joystick-base')).toBeNull();

    fireEvent.press(getByTestId('orientation-toggle'));
    expect(getByTestId('move-joystick-base')).toBeTruthy();
  });

  it('debe volver al layout vertical al tocar otra vez el boton de orientacion', () => {
    ReactNative.Dimensions.set({
      window: { width: 900, height: 420, scale: 1, fontScale: 1 },
      screen: { width: 900, height: 420, scale: 1, fontScale: 1 },
    });

    const { getByTestId, queryByTestId } = renderControlScreen();

    fireEvent.press(getByTestId('orientation-toggle'));
    expect(getByTestId('move-joystick-base')).toBeTruthy();

    fireEvent.press(getByTestId('orientation-toggle'));
    expect(getByTestId('joystick-base')).toBeTruthy();
    expect(queryByTestId('move-joystick-base')).toBeNull();
  });

  it('debe mostrar etiquetas de dos joysticks en layout horizontal manual', () => {
    ReactNative.Dimensions.set({
      window: { width: 900, height: 420, scale: 1, fontScale: 1 },
      screen: { width: 900, height: 420, scale: 1, fontScale: 1 },
    });

    const { getByTestId, getByText } = renderControlScreen();

    fireEvent.press(getByTestId('orientation-toggle'));

    expect(getByText('Movimiento')).toBeTruthy();
    expect(getByText('Dirección')).toBeTruthy();
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
