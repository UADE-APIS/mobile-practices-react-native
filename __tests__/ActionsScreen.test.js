import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ActionsScreen from '../screens/ActionsScreen';
import { api } from '../config/api';

// Mock de las llamadas HTTP
jest.mock('../config/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
  getApiErrorMessage: jest.fn(),
}));

describe('ActionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Evita que los test se frenen tratando de renderizar un Alert nativo
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  test('carga y dibuja la lista de acciones obtenida de la API', async () => {
    api.get.mockResolvedValueOnce({ data: { actions: ['stand', 'sit'] } });

    const { findByText } = render(<ActionsScreen />);

    // findByText espera asíncronamente hasta que el elemento aparece en el DOM
    expect(await findByText('stand')).toBeTruthy();
    expect(await findByText('sit')).toBeTruthy();
    expect(api.get).toHaveBeenCalledWith('/actions');
  });

  test('llama a la función ejecutora al presionar un botón', async () => {
    api.get.mockResolvedValueOnce({ data: { actions: ['dance'] } });
    api.post.mockResolvedValueOnce({ data: { success: true } });

    const { findByText } = render(<ActionsScreen />);

    const boton = await findByText('dance');
    fireEvent.press(boton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/action/dance');
    });
  });
});