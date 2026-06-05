import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ActionsScreen from '../screens/ActionsScreen';
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

  const renderActionsScreen = () => {
    return render(<ActionsScreen />);
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
});
