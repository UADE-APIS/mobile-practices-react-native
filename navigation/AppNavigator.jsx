import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text } from 'react-native';
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

  const getRobotConnectionLabel = () => {
    if (status.connection_state === 'connected') return 'Conectado';
    if (status.connection_state === 'connecting') return 'Conectando';
    if (status.connection_state === 'reconnecting') return 'Reconectando';
    if (status.connection_state === 'error') return 'Error';
    return 'Desconectado';
  };

  const getRobotConnectionColor = () => {
    if (status.connection_state === 'connected') return Theme.colors.success;
    if (status.connection_state === 'connecting' || status.connection_state === 'reconnecting') return Theme.colors.warning;
    if (status.connection_state === 'error') return Theme.colors.error;
    return Theme.colors.textMuted;
  };

  const renderConnectionBadge = () => (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderWidth: 1,
      borderColor: getRobotConnectionColor(),
      marginRight: 4,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getRobotConnectionColor() }} />
        {(status.connection_state === 'connecting' || status.connection_state === 'reconnecting') && (
          <ActivityIndicator size="small" color={Theme.colors.warning} />
        )}
        <Text style={{
          color: getRobotConnectionColor(),
          fontSize: 11,
          fontWeight: 'bold',
          textTransform: 'uppercase',
        }}>
          {getRobotConnectionLabel()}
        </Text>
      </View>
    </View>
  );

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
              headerRight: renderConnectionBadge,
            }} 
          />
          <Stack.Screen 
            name="Control" 
            component={ControlScreen} 
            options={{ 
              title: 'Control de Movimiento',
              headerRight: renderConnectionBadge,
            }} 
          />
          <Stack.Screen 
            name="Actions" 
            component={ActionsScreen} 
            options={{ 
              title: 'Acciones del Robot',
              headerRight: renderConnectionBadge,
            }} 
          />
          <Stack.Screen 
            name="History" 
            component={HistoryScreen} 
            options={{ 
              title: 'Historial de Comandos',
              headerRight: renderConnectionBadge,
            }} 
          />
          <Stack.Screen 
            name="Diagnostics" 
            component={DiagnosticsScreen} 
            options={{ 
              title: 'Diagnósticos Raw',
              headerRight: renderConnectionBadge,
            }} 
          />
        </>
      )}
    </Stack.Navigator>
  );
}
