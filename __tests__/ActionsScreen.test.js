import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ActionsScreen from '../screens/ActionsScreen';
import { RobotContext } from '../context/RobotContext';

const mockApi = {
  get: jest.fn(),
  post: jest.fn(),
};

describe('ActionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  const renderActionsScreen = () => {
    return render(
      <RobotContext.Provider value={{ api: mockApi }}>
        <ActionsScreen />
      </RobotContext.Provider>
    );
  };

  test('carga y dibuja la lista de acciones obtenida de la API', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { actions: ['stand', 'sit'] } });

    const { findByText } = renderActionsScreen();

    expect(await findByText('stand')).toBeTruthy();
    expect(await findByText('sit')).toBeTruthy();
    expect(mockApi.get).toHaveBeenCalledWith('/actions');
  });

  test('llama a la función ejecutora al presionar un botón', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { actions: ['dance'] } });
    mockApi.post.mockResolvedValueOnce({ data: { success: true } });

    const { findByText } = renderActionsScreen();

    const boton = await findByText('dance');
    fireEvent.press(boton);

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/action/dance');
    });
  });
});