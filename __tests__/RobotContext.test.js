import React, { useContext } from 'react';
import { render, waitFor } from '@testing-library/react-native';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { RobotContext, RobotProvider } from '../context/RobotContext';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: {
        use: jest.fn(),
      },
    },
  })),
}));

describe('RobotContext', () => {
  it('debe mantener estables los comandos cuando cambia el estado consultado', async () => {
    const api = {
      get: jest.fn().mockResolvedValue({
        data: {
          connection_state: 'connected',
          robot_type: 'go2',
          network_interface: 'eth0',
          connected_at: '2026-05-19T22:30:00Z',
          last_error: null,
        },
      }),
      post: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(() => 1),
          eject: jest.fn(),
        },
      },
    };
    axios.create.mockReturnValue(api);

    const stopReferences = [];

    function ContextProbe() {
      const { stopRobot } = useContext(RobotContext);
      stopReferences.push(stopRobot);
      return null;
    }

    const { unmount } = render(
      <AuthContext.Provider value={{ user: { username: 'operator' } }}>
        <RobotProvider>
          <ContextProbe />
        </RobotProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/status');
      expect(stopReferences.length).toBeGreaterThan(1);
    });

    expect(new Set(stopReferences).size).toBe(1);
    unmount();
  });

  it('debe incluir la URL de API en errores de red de comandos', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const networkError = new Error('Network Error');
    const api = {
      get: jest.fn(),
      post: jest.fn().mockRejectedValue(networkError),
      interceptors: {
        request: {
          use: jest.fn(() => 1),
          eject: jest.fn(),
        },
      },
    };
    axios.create.mockReturnValue(api);

    let stopRobot;

    function ContextProbe() {
      stopRobot = useContext(RobotContext).stopRobot;
      return null;
    }

    const { unmount } = render(
      <AuthContext.Provider value={{ user: null }}>
        <RobotProvider>
          <ContextProbe />
        </RobotProvider>
      </AuthContext.Provider>
    );

    await expect(stopRobot()).rejects.toMatchObject({
      robotMessage: expect.stringContaining('No se pudo conectar con'),
    });
    expect(networkError.robotMessage).toContain('Verificá la URL de la API');

    unmount();
    console.error.mockRestore();
  });
});
