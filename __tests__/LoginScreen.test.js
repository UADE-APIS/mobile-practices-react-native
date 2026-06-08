import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../screens/LoginScreen';
import { AuthContext } from '../context/AuthContext';

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialCommunityIcons: () => <View testID="icon" />,
  };
});

jest.mock('../config/api', () => ({
  getDefaultServerUrl: () => 'http://localhost:8000',
  normalizeServerUrl: (url) => url.trim().replace(/\/+$/, ''),
}));

describe('LoginScreen', () => {
  const mockLogin = jest.fn();
  const mockNavigate = jest.fn();
  
  const mockRoute = {
    params: {},
  };

  const mockNavigation = {
    navigate: mockNavigate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    Alert.alert.mockRestore();
  });

  const renderLoginScreen = (routeParams = mockRoute.params) => {
    return render(
      <AuthContext.Provider value={{ login: mockLogin }}>
        <LoginScreen 
          route={{ params: routeParams }} 
          navigation={mockNavigation} 
        />
      </AuthContext.Provider>
    );
  };

  it('debe renderizar todos los campos del formulario con el servidor default', () => {
    const { getByPlaceholderText, getByText, getByDisplayValue } = renderLoginScreen();

    expect(getByDisplayValue('http://localhost:8000')).toBeTruthy();
    expect(getByPlaceholderText('JBE10 u operador@uade.edu.ar')).toBeTruthy();
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
    expect(getByText('INICIAR SESIÓN')).toBeTruthy();
  });

  it('debe mostrar alerta si los campos están incompletos', () => {
    const { getByText } = renderLoginScreen();
    const submitButton = getByText('INICIAR SESIÓN');

    fireEvent.press(submitButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Campos incompletos',
      'Por favor completa todos los campos.'
    );
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('debe iniciar sesion exitosamente con los valores ingresados', async () => {
    mockLogin.mockResolvedValue({ success: true });
    
    const { getByPlaceholderText, getByText } = renderLoginScreen();

    fireEvent.changeText(getByPlaceholderText('JBE10 u operador@uade.edu.ar'), 'JBE10');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');

    const submitButton = getByText('INICIAR SESIÓN');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        'JBE10',
        'password123',
        'http://localhost:8000'
      );
    });
  });

  it('debe mostrar alerta de error si el login falla', async () => {
    const loginError = new Error('Credenciales incorrectas');
    mockLogin.mockRejectedValue(loginError);
    
    const { getByPlaceholderText, getByText } = renderLoginScreen();

    fireEvent.changeText(getByPlaceholderText('JBE10 u operador@uade.edu.ar'), 'JBE10');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'wrongpassword');

    const submitButton = getByText('INICIAR SESIÓN');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Credenciales incorrectas',
        'Credenciales incorrectas'
      );
    });
  });

  it('debe actualizar la URL del servidor si se pasa por route params', () => {
    const { getByDisplayValue } = renderLoginScreen({ serverUrl: 'http://192.168.1.100:8000' });
    expect(getByDisplayValue('http://192.168.1.100:8000')).toBeTruthy();
  });
});
