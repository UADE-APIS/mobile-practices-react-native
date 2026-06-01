import React, { useContext } from 'react';
import { Button } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { AuthContext, AuthProvider } from '../context/AuthContext';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('axios', () => ({
  post: jest.fn(),
  create: jest.fn(() => ({
    interceptors: {
      request: {
        use: jest.fn(),
      },
    },
  })),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SecureStore.getItemAsync.mockResolvedValue(null);
    axios.post.mockResolvedValue({
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
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/auth/token',
        {
          identifier: 'JBE10',
          password: 'password123',
        },
        {
          timeout: 10000,
        }
      );
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('identifier', 'JBE10');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('username', 'JBE10');
  });
});
