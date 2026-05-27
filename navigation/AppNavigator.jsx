import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { RobotContext } from '../context/RobotContext';
import { Theme } from '../config/theme';

// Import Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ControlScreen from '../screens/ControlScreen';
import ActionsScreen from '../screens/ActionsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import DiagnosticsScreen from '../screens/DiagnosticsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);
  const { status } = useContext(RobotContext);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Theme.colors.accent} />
      </View>
    );
  }

  // Header options for a futuristic look
  const globalScreenOptions = {
    headerStyle: {
      backgroundColor: Theme.colors.card,
    },
    headerTintColor: Theme.colors.text,
    headerTitleStyle: {
      fontWeight: 'bold',
      fontSize: 16,
    },
    headerShadowVisible: false,
  };

  const getRobotConnectionTitle = () => {
    if (status.connection_state === 'connected') {
      const type = status.robot_type ? status.robot_type.toUpperCase() : 'ROBOT';
      return `● CONECTADO - ${type}`;
    }
    if (status.connection_state === 'connecting') {
      return '○ CONECTANDO...';
    }
    if (status.connection_state === 'error') {
      return '● ERROR DE CONEXION';
    }
    return '● DESCONECTADO';
  };

  const getRobotConnectionColor = () => {
    if (status.connection_state === 'connected') return Theme.colors.success;
    if (status.connection_state === 'connecting') return Theme.colors.warning;
    if (status.connection_state === 'error') return Theme.colors.error;
    return Theme.colors.textMuted;
  };

  return (
    <Stack.Navigator screenOptions={globalScreenOptions}>
      {user === null ? (
        // Public screens
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen} 
            options={{ 
              title: 'Crear Operador',
              headerStyle: { backgroundColor: Theme.colors.background },
            }} 
          />
        </>
      ) : (
        // Private screens
        <>
          <Stack.Screen 
            name="Home" 
            component={HomeScreen} 
            options={{ 
              title: 'Centro de Control',
            }} 
          />
          <Stack.Screen 
            name="Control" 
            component={ControlScreen} 
            options={{ 
              title: 'Control de Movimiento',
              headerRight: () => (
                <View style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: getRobotConnectionColor(),
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getRobotConnectionColor() }} />
                    <ActivityIndicator size="small" animating={status.connection_state === 'connecting'} color={Theme.colors.warning} style={{ display: status.connection_state === 'connecting' ? 'flex' : 'none' }} />
                  </View>
                </View>
              )
            }} 
          />
          <Stack.Screen 
            name="Actions" 
            component={ActionsScreen} 
            options={{ 
              title: 'Acciones del Robot',
            }} 
          />
          <Stack.Screen 
            name="History" 
            component={HistoryScreen} 
            options={{ 
              title: 'Historial de Comandos',
            }} 
          />
          <Stack.Screen 
            name="Diagnostics" 
            component={DiagnosticsScreen} 
            options={{ 
              title: 'Diagnósticos Raw',
            }} 
          />
        </>
      )}
    </Stack.Navigator>
  );
}
