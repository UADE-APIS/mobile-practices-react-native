import React, { useContext } from 'react';
import { Button } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { AuthContext, AuthProvider } from '../context/AuthContext';
import { requestAuthToken } from '../services/authApi';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/authApi', () => ({
  requestAuthToken: jest.fn(),
  registerOperator: jest.fn(),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SecureStore.getItemAsync.mockResolvedValue(null);
    requestAuthToken.mockResolvedValue({
      data: {
        access_token: 'test-token',
        token_type: 'bearer',
      },
    });
  });

  it('debe enviar username o email como identifier al backend', async () => {
    function LoginProbe() {
      const { login } = useContext(AuthContext);
      return (
        <Button
          title="login"
          onPress={() => login('JBE10', 'password123', 'http://localhost:8000/')}
        />
      );
    }

    const { getByText } = render(
      <AuthProvider>
        <LoginProbe />
      </AuthProvider>
    );

    fireEvent.press(getByText('login'));

    await waitFor(() => {
      expect(requestAuthToken).toHaveBeenCalledWith('http://localhost:8000', 'JBE10', 'password123');
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('identifier', 'JBE10');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('username', 'JBE10');
  });
});
