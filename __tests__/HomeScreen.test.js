import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../screens/HomeScreen';
import { AuthContext } from '../context/AuthContext';
import { RobotContext } from '../context/RobotContext';

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialCommunityIcons: () => <View testID="icon" />,
  };
});

describe('HomeScreen (Panel de Conexión)', () => {
  const mockLogout = jest.fn();
  const mockConnectRobot = jest.fn().mockResolvedValue({ success: true });
  const mockDisconnectRobot = jest.fn().mockResolvedValue({ success: true });
  const mockFetchStatus = jest.fn();

  const mockUser = { username: 'TestOperator' };
  
  const defaultRobotStatus = {
    connection_state: 'disconnected',
    robot_type: null,
    network_interface: null,
    connected_at: null,
    last_error: null,
  };

  const renderHomeScreen = (robotStatus = defaultRobotStatus) => {
    return render(
      <AuthContext.Provider value={{ user: mockUser, logout: mockLogout }}>
        <RobotContext.Provider
          value={{
            status: robotStatus,
            loading: false,
            serverUrl: 'http://localhost:8000',
            connectRobot: mockConnectRobot,
            disconnectRobot: mockDisconnectRobot,
            fetchStatus: mockFetchStatus,
          }}
        >
          <HomeScreen navigation={{ navigate: jest.fn() }} />
        </RobotContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe renderizar el saludo al operador y estado de desconexión', () => {
    const { getByText } = renderHomeScreen();
    
    expect(getByText('TestOperator')).toBeTruthy();
    expect(getByText('DESCONECTADO')).toBeTruthy();
    expect(getByText('CONECTAR ROBOT')).toBeTruthy();
  });

  it('debe permitir seleccionar robot Go2 o G1', () => {
    const { getByText } = renderHomeScreen();
    
    const go2Button = getByText('Unitree Go2');
    const g1Button = getByText('Unitree G1');
    
    expect(go2Button).toBeTruthy();
    expect(g1Button).toBeTruthy();
  });

  it('debe llamar a connectRobot cuando se hace click en conectar', async () => {
    const { getByText } = renderHomeScreen();
    const connectButton = getByText('CONECTAR ROBOT');
    
    fireEvent.press(connectButton);
    
    await waitFor(() => {
      expect(mockConnectRobot).toHaveBeenCalledWith('go2', 'eth0');
    });
  });

  it('debe renderizar estado conectado y botón desloguear cuando el robot está conectado', () => {
    const connectedStatus = {
      connection_state: 'connected',
      robot_type: 'go2',
      network_interface: 'eth0',
      connected_at: '2026-05-19T22:30:00Z',
      last_error: null,
    };
    
    const { getByText } = renderHomeScreen(connectedStatus);
    
    expect(getByText('CONECTADO')).toBeTruthy();
    expect(getByText('DESCONECTAR ROBOT')).toBeTruthy();
  });

  it('debe llamar a disconnectRobot cuando se hace click en desconectar', async () => {
    const connectedStatus = {
      connection_state: 'connected',
      robot_type: 'go2',
      network_interface: 'eth0',
      connected_at: '2026-05-19T22:30:00Z',
      last_error: null,
    };
    
    const { getByText } = renderHomeScreen(connectedStatus);
    const disconnectButton = getByText('DESCONECTAR ROBOT');
    
    fireEvent.press(disconnectButton);
    
    await waitFor(() => {
      expect(mockDisconnectRobot).toHaveBeenCalled();
    });
  });
});
