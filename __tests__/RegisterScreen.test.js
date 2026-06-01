import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../screens/RegisterScreen';
import { AuthContext } from '../context/AuthContext';

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialCommunityIcons: () => <View testID="icon" />,
  };
});

describe('RegisterScreen', () => {
  const mockRegister = jest.fn();
  const mockNavigate = jest.fn();
  
  const mockRoute = {
    params: {
      serverUrl: 'http://localhost:8000',
    },
  };

  const mockNavigation = {
    navigate: mockNavigate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  const renderRegisterScreen = (routeParams = mockRoute.params) => {
    return render(
      <AuthContext.Provider value={{ register: mockRegister }}>
        <RegisterScreen 
          route={{ params: routeParams }} 
          navigation={mockNavigation} 
        />
      </AuthContext.Provider>
    );
  };

  it('debe renderizar todos los campos del formulario', () => {
    const { getByPlaceholderText, getByText } = renderRegisterScreen();

    expect(getByPlaceholderText('http://localhost:8000')).toBeTruthy();
    expect(getByPlaceholderText('Ej: JBE10')).toBeTruthy();
    expect(getByPlaceholderText('Ej: operador@uade.edu.ar')).toBeTruthy();
    expect(getByText('REGISTRARSE')).toBeTruthy();
  });

  it('debe mostrar alerta si los campos están incompletos', () => {
    const { getByText } = renderRegisterScreen();
    const submitButton = getByText('REGISTRARSE');

    fireEvent.press(submitButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Campos incompletos',
      'Por favor completa todos los campos.'
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('debe mostrar alerta si las contraseñas no coinciden', () => {
    const { getByPlaceholderText, getAllByPlaceholderText, getByText } = renderRegisterScreen();

    fireEvent.changeText(getByPlaceholderText('Ej: JBE10'), 'operator');
    fireEvent.changeText(getByPlaceholderText('Ej: operador@uade.edu.ar'), 'operator@example.com');
    
    const passwordFields = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordFields[0], 'password123');
    fireEvent.changeText(passwordFields[1], 'password456');

    const submitButton = getByText('REGISTRARSE');
    fireEvent.press(submitButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Contraseña no coincide',
      'Las contraseñas ingresadas no son iguales.'
    );
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('debe registrar exitosamente y navegar al Login', async () => {
    mockRegister.mockResolvedValue({ success: true });
    
    const { getByPlaceholderText, getAllByPlaceholderText, getByText } = renderRegisterScreen();

    fireEvent.changeText(getByPlaceholderText('Ej: JBE10'), 'operator');
    fireEvent.changeText(getByPlaceholderText('Ej: operador@uade.edu.ar'), 'operator@example.com');
    
    const passwordFields = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordFields[0], 'password123');
    fireEvent.changeText(passwordFields[1], 'password123');

    const submitButton = getByText('REGISTRARSE');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'operator',
        'operator@example.com',
        'password123',
        'http://localhost:8000'
      );
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Registro Exitoso',
      'Operador registrado con éxito. Ya podés iniciar sesión.',
      expect.any(Array)
    );
    
    // Simular el click en el botón OK del Alert
    const alertButtons = Alert.alert.mock.calls[0][2];
    alertButtons[0].onPress();
    
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('debe mostrar alerta amigable si el usuario o email ya existe', async () => {
    mockRegister.mockRejectedValue(new Error('username already exists'));
    
    const { getByPlaceholderText, getAllByPlaceholderText, getByText } = renderRegisterScreen();

    fireEvent.changeText(getByPlaceholderText('Ej: JBE10'), 'operator');
    fireEvent.changeText(getByPlaceholderText('Ej: operador@uade.edu.ar'), 'operator@example.com');
    
    const passwordFields = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordFields[0], 'password123');
    fireEvent.changeText(passwordFields[1], 'password123');

    const submitButton = getByText('REGISTRARSE');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error de Registro',
        'El email o nombre de usuario ya existe. Probá iniciar sesión o usá otros datos.'
      );
    });
  });

  it('debe mostrar el mensaje de error original si es una falla general', async () => {
    const generalErrorMessage = 'Error de red o caída del servidor.';
    mockRegister.mockRejectedValue(new Error(generalErrorMessage));
    
    const { getByPlaceholderText, getAllByPlaceholderText, getByText } = renderRegisterScreen();

    fireEvent.changeText(getByPlaceholderText('Ej: JBE10'), 'operator');
    fireEvent.changeText(getByPlaceholderText('Ej: operador@uade.edu.ar'), 'operator@example.com');
    
    const passwordFields = getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passwordFields[0], 'password123');
    fireEvent.changeText(passwordFields[1], 'password123');

    const submitButton = getByText('REGISTRARSE');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error de Registro',
        generalErrorMessage
      );
    });
  });
});
