import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ActionsScreen from '../screens/ActionsScreen';
import { RobotContext } from '../context/RobotContext';
import { executeRobotAction, getRobotActions } from '../services/robotApi';

jest.mock('../services/robotApi', () => ({
  executeRobotAction: jest.fn(),
  getRobotActions: jest.fn(),
}));

describe('ActionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  const renderActionsScreen = (connectionState = 'connected') => {
    return render(
      <RobotContext.Provider value={{ status: { connection_state: connectionState } }}>
        <ActionsScreen />
      </RobotContext.Provider>
    );
  };

  test('carga y dibuja la lista de acciones obtenida de la API', async () => {
    getRobotActions.mockResolvedValueOnce({ data: { actions: ['stand', 'sit'] } });

    const { findByText } = renderActionsScreen();

    expect(await findByText('stand')).toBeTruthy();
    expect(await findByText('sit')).toBeTruthy();
    expect(getRobotActions).toHaveBeenCalled();
  });

  test('llama a la función ejecutora al presionar un botón', async () => {
    getRobotActions.mockResolvedValueOnce({ data: { actions: ['dance'] } });
    executeRobotAction.mockResolvedValueOnce({ data: { success: true } });

    const { findByText } = renderActionsScreen();

    const boton = await findByText('dance');
    fireEvent.press(boton);

    await waitFor(() => {
      expect(executeRobotAction).toHaveBeenCalledWith('dance');
    });
  });

  test('no carga acciones si el robot esta desconectado', async () => {
    const { findByText } = renderActionsScreen('disconnected');

    expect(await findByText('Conectá un robot para cargar acciones disponibles.')).toBeTruthy();
    expect(getRobotActions).not.toHaveBeenCalled();
  });

  test('muestra feedback inline sin Alert al ejecutar una accion', async () => {
    getRobotActions.mockResolvedValueOnce({ data: { actions: ['dance'] } });
    executeRobotAction.mockResolvedValueOnce({ data: { success: true } });

    const { findByText } = renderActionsScreen();

    const boton = await findByText('dance');
    fireEvent.press(boton);

    expect(await findByText('La acción "dance" se ejecutó correctamente.')).toBeTruthy();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  test('ignora respuestas tardias de acciones luego de desconectarse', async () => {
    let resolveActions;
    getRobotActions.mockReturnValueOnce(new Promise((resolve) => {
      resolveActions = resolve;
    }));

    const { queryByText, rerender, findByText } = renderActionsScreen();

    rerender(
      <RobotContext.Provider value={{ status: { connection_state: 'disconnected' } }}>
        <ActionsScreen />
      </RobotContext.Provider>
    );

    resolveActions({ data: { actions: ['dance'] } });

    expect(await findByText('Conectá un robot para cargar acciones disponibles.')).toBeTruthy();
    await waitFor(() => {
      expect(queryByText('dance')).toBeNull();
    });
  });
});
