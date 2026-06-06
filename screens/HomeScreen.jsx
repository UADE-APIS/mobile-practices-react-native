import React, { useContext, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { RobotContext } from '../context/RobotContext';
import { Theme } from '../config/theme';

export default function HomeScreen({ navigation }) {
  const { logout, user } = useContext(AuthContext);
  const { status, loading, connectRobot, disconnectRobot } = useContext(RobotContext);

  const [selectedRobot, setSelectedRobot] = useState('go2');
  const [networkInterface, setNetworkInterface] = useState('eth0');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    if (status.connection_state === 'connected') {
      if (status.robot_type) setSelectedRobot(status.robot_type);
      if (status.network_interface) setNetworkInterface(status.network_interface);
    }
  }, [status.connection_state, status.robot_type, status.network_interface]);

  const handleConnect = async () => {
    try {
      await connectRobot(selectedRobot, networkInterface);
      Alert.alert('Conectado', `Conexión establecida con el robot ${selectedRobot.toUpperCase()} en ${networkInterface}`);
    } catch (err) {
      Alert.alert('Error de Conexión', err.response?.data?.detail || 'No se pudo establecer la conexión con el robot.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectRobot();
      Alert.alert('Desconectado', 'Se ha cerrado la sesión de control con el robot.');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'No se pudo desconectar el robot.');
    }
  };

  const isConnected = status.connection_state === 'connected';
  const isError = status.connection_state === 'error';
  const isConnecting = status.connection_state === 'connecting';
  const isReconnecting = status.connection_state === 'reconnecting';
  const isConfigDisabled = isConnected || isConnecting || isReconnecting;

  // Theme accent colors based on selected robot
  const robotAccent = selectedRobot === 'go2' ? Theme.colors.go2 : Theme.colors.g1;

  const getStatusColor = () => {
    if (isConnected) return Theme.colors.success;
    if (isError) return Theme.colors.error;
    if (isConnecting || isReconnecting) return Theme.colors.warning;
    return Theme.colors.textMuted;
  };

  const getStatusText = () => {
    if (isConnected) return 'CONECTADO';
    if (isError) return 'ERROR';
    if (isReconnecting) return 'RECONECTANDO...';
    if (isConnecting) return 'CONECTANDO...';
    return 'DESCONECTADO';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Bienvenido,</Text>
          <Text style={styles.usernameText}>{user?.username || 'Operador'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <MaterialCommunityIcons name="logout" size={24} color={Theme.colors.error} />
        </TouchableOpacity>
      </View>

      {/* Connection State Badge */}
      <View style={[styles.statusCard, { borderColor: getStatusColor() }]}>
        <View style={styles.statusRow}>
          <MaterialCommunityIcons
            name={isConnected ? 'robot' : isError ? 'robot-dead' : 'robot-off'}
            size={40}
            color={getStatusColor()}
          />
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Estado del Robot</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.statusIndicatorDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>
        </View>
        {status.connected_at && isConnected && (
          <Text style={styles.connectedAtText}>
            Conectado desde: {new Date(status.connected_at).toLocaleTimeString()}
          </Text>
        )}
        {status.last_error && isError && (
          <Text style={styles.errorText}>Detalle: {status.last_error}</Text>
        )}
      </View>

      {/* Robot Config Panel (disabled when connected/connecting/reconnecting) */}
      <View style={[styles.panelCard, isConfigDisabled && styles.disabledCard]}>
        <Text style={styles.panelTitle}>Configuración de Conexión</Text>

        <Text style={styles.inputLabel}>Seleccionar Robot</Text>
        <View style={styles.robotSelector}>
          <TouchableOpacity
            style={[
              styles.robotCard,
              selectedRobot === 'go2' && { borderColor: Theme.colors.go2, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
              isConfigDisabled && selectedRobot !== 'go2' && styles.disabledOption,
            ]}
            onPress={() => !isConfigDisabled && setSelectedRobot('go2')}
            disabled={isConfigDisabled}
          >
            <MaterialCommunityIcons
              name="dog"
              size={36}
              color={selectedRobot === 'go2' ? Theme.colors.go2 : Theme.colors.textMuted}
            />
            <Text style={[styles.robotCardText, selectedRobot === 'go2' && { color: Theme.colors.go2, fontWeight: 'bold' }]}>
              Unitree Go2
            </Text>
            <Text style={styles.robotCardSub}>Cuadrúpedo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.robotCard,
              selectedRobot === 'g1' && { borderColor: Theme.colors.g1, backgroundColor: 'rgba(6, 182, 212, 0.1)' },
              isConfigDisabled && selectedRobot !== 'g1' && styles.disabledOption,
            ]}
            onPress={() => !isConfigDisabled && setSelectedRobot('g1')}
            disabled={isConfigDisabled}
          >
            <MaterialCommunityIcons
              name="robot-industrial"
              size={36}
              color={selectedRobot === 'g1' ? Theme.colors.g1 : Theme.colors.textMuted}
            />
            <Text style={[styles.robotCardText, selectedRobot === 'g1' && { color: Theme.colors.g1, fontWeight: 'bold' }]}>
              Unitree G1
            </Text>
            <Text style={styles.robotCardSub}>Humanoide</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Interfaz de Red</Text>
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="lan-connect" size={20} color={Theme.colors.textMuted} style={styles.inputIcon} />
          <TextInput
            style={styles.textInput}
            value={networkInterface}
            onChangeText={setNetworkInterface}
            placeholder="eth0"
            placeholderTextColor={Theme.colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConfigDisabled}
          />
        </View>

        {/* Action Button */}
        {loading ? (
          <ActivityIndicator size="large" color={robotAccent} style={styles.loader} />
        ) : (isConnected || isReconnecting) ? (
          <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
            <Text style={styles.btnText}>DESCONECTAR ROBOT</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.connectBtn, { backgroundColor: robotAccent }]}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.btnText}>CONECTAR ROBOT</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Control Panel Navigation (only if connected) */}
      <View style={styles.navigationSection}>
        <Text style={styles.sectionTitle}>Panel de Operación</Text>

        <View style={styles.gridContainer}>
          <TouchableOpacity
            style={[styles.gridItem, !isConnected && styles.gridItemDisabled]}
            disabled={!isConnected}
            onPress={() => navigation.navigate('Control')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: isConnected ? 'rgba(6, 182, 212, 0.1)' : Theme.colors.card }]}>
              <MaterialCommunityIcons name="controller-classic" size={32} color={isConnected ? Theme.colors.g1 : Theme.colors.textDim} />
            </View>
            <Text style={[styles.gridItemText, !isConnected && styles.gridTextDisabled]}>Control de Movimiento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.gridItem, !isConnected && styles.gridItemDisabled]}
            disabled={!isConnected}
            onPress={() => navigation.navigate('Actions')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: isConnected ? 'rgba(245, 158, 11, 0.1)' : Theme.colors.card }]}>
              <MaterialCommunityIcons name="play-box-multiple" size={32} color={isConnected ? Theme.colors.warning : Theme.colors.textDim} />
            </View>
            <Text style={[styles.gridItemText, !isConnected && styles.gridTextDisabled]}>Acciones Rápidas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('History')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <MaterialCommunityIcons name="history" size={32} color={Theme.colors.success} />
            </View>
            <Text style={styles.gridItemText}>Historial de Comandos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => navigation.navigate('Diagnostics')}
          >
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
              <MaterialCommunityIcons name="text-box-search" size={32} color={Theme.colors.accent} />
            </View>
            <Text style={styles.gridItemText}>Diagnóstico Avanzado</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Diagnostics JSON view */}
      <View style={styles.panelCard}>
        <TouchableOpacity
          style={styles.collapsibleHeader}
          onPress={() => setShowDiagnostics(!showDiagnostics)}
        >
          <Text style={styles.panelTitle}>Estado Raw (Diagnostics JSON)</Text>
          <MaterialCommunityIcons
            name={showDiagnostics ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={Theme.colors.textMuted}
          />
        </TouchableOpacity>
        {showDiagnostics && (
          <View style={styles.jsonContainer}>
            <Text style={styles.jsonText}>{JSON.stringify(status, null, 2)}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  content: {
    padding: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  usernameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
  },
  statusCard: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1.5,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  connectedAtText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    paddingTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: Theme.colors.error,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
    paddingTop: 8,
  },
  panelCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  disabledCard: {
    opacity: 0.9,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  robotSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  robotCard: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    alignItems: 'center',
  },
  disabledOption: {
    opacity: 0.3,
  },
  robotCardText: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    marginTop: 8,
  },
  robotCardSub: {
    fontSize: 10,
    color: Theme.colors.textDim,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    height: 44,
    color: Theme.colors.text,
    fontSize: 16,
  },
  loader: {
    marginVertical: 12,
  },
  connectBtn: {
    height: 48,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  disconnectBtn: {
    height: 48,
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  navigationSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.textMuted,
    paddingLeft: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '48%',
    aspectRatio: 1.1,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
    gap: 10,
  },
  gridItemDisabled: {
    opacity: 0.5,
    backgroundColor: Theme.colors.card,
    borderColor: Theme.colors.card,
  },
  iconWrapper: {
    padding: 12,
    borderRadius: 14,
  },
  gridItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.text,
    textAlign: 'center',
  },
  gridTextDisabled: {
    color: Theme.colors.textDim,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jsonContainer: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.md,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: '#38BDF8', // Cyan neon text
  },
});
