import React, { useContext } from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { AuthContext } from '../context/AuthContext';
import { RobotContext, RobotProvider } from '../context/RobotContext';
import {
  connectRobotRequest,
  getRobotStatus,
  stopRobotRequest,
} from '../services/robotApi';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/robotApi', () => ({
  robotApi: {},
  setRobotApiBaseUrl: jest.fn(),
  connectRobotRequest: jest.fn(),
  disconnectRobotRequest: jest.fn(),
  getRobotStatus: jest.fn(),
  moveRobotRequest: jest.fn(),
  stopRobotRequest: jest.fn(),
  standUpRobotRequest: jest.fn(),
  sitDownRobotRequest: jest.fn(),
}));

describe('RobotContext', () => {
  const connectedStatus = {
    connection_state: 'connected',
    robot_type: 'go2',
    network_interface: 'eth0',
    connected_at: '2026-05-19T22:30:00Z',
    last_error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getRobotStatus.mockResolvedValue({ data: connectedStatus });
    connectRobotRequest.mockResolvedValue({ data: { success: true } });
    stopRobotRequest.mockResolvedValue({ data: { success: true } });
  });

  it('debe mantener estables los comandos cuando cambia el estado consultado', async () => {
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
      expect(getRobotStatus).toHaveBeenCalled();
      expect(stopReferences.length).toBeGreaterThan(1);
    });

    expect(new Set(stopReferences).size).toBe(1);
    unmount();
  });

  it('debe incluir la URL de API en errores de red de comandos', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const networkError = new Error('Network Error');
    stopRobotRequest.mockRejectedValue(networkError);

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

  it('debe incluir la URL de API en errores de timeout', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const timeoutError = new Error('timeout of 10000ms exceeded');
    timeoutError.code = 'ECONNABORTED';
    stopRobotRequest.mockRejectedValue(timeoutError);

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
      robotMessage: expect.stringContaining('Timeout consultando'),
    });
    expect(timeoutError.robotMessage).toContain('Revisá si la IP del backend cambió');

    unmount();
    console.error.mockRestore();
  });

  it('debe intentar reconectar automaticamente cuando el polling detecta desconexion no explicita', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const disconnectedStatus = {
      ...connectedStatus,
      connection_state: 'disconnected',
      last_error: 'Robot offline',
    };
    let connectRobot;
    let fetchStatus;

    function ContextProbe() {
      const context = useContext(RobotContext);
      connectRobot = context.connectRobot;
      fetchStatus = context.fetchStatus;
      return null;
    }

    const { unmount } = render(
      <AuthContext.Provider value={{ user: { username: 'operator' } }}>
        <RobotProvider>
          <ContextProbe />
        </RobotProvider>
      </AuthContext.Provider>
    );

    await act(async () => {
      await connectRobot('go2', 'eth0');
    });

    connectRobotRequest.mockClear();
    getRobotStatus
      .mockResolvedValueOnce({ data: disconnectedStatus })
      .mockResolvedValueOnce({ data: connectedStatus });

    await act(async () => {
      await fetchStatus();
    });

    expect(connectRobotRequest).toHaveBeenCalledWith('go2', 'eth0');

    unmount();
    console.warn.mockRestore();
  });
});
