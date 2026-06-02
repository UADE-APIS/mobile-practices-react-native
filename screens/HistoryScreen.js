import React, { useState, useCallback, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RobotContext } from '../context/RobotContext';
import { Theme } from '../config/theme';

export default function HistoryScreen() {
  const { getHistoryList } = useContext(RobotContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHistoryList();
      setHistory(data || []);
      setError(null);
    } catch (err) {
      console.warn('Failed to fetch history:', err.message || err);
      setError('No se pudo cargar el historial de comandos.');
    } finally {
      setLoading(false);
    }
  }, [getHistoryList]);

  useFocusEffect(
    useCallback(() => {
      fetchLogs();
    }, [fetchLogs])
  );

  const formatTimestamp = (isoString) => {
    try {
      const date = new Date(isoString);
      // Formato: DD/MM/AAAA HH:MM:SS
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return isoString;
    }
  };

  const getCommandIcon = (type) => {
    switch (type) {
      case 'CONNECT':
        return 'link';
      case 'DISCONNECT':
        return 'link-off';
      case 'ACTION':
        return 'robot';
      case 'MOVE':
        return 'arrow-all';
      case 'STOP':
        return 'stop-circle';
      case 'STANDUP':
      case 'SITDOWN':
      case 'DAMP':
      case 'HANDSTAND':
      case 'FREEBOUND':
      case 'FREEAVOID':
      case 'WALKUPRIGHT':
      case 'CROSSSTEP':
        return 'robot-transition-side';
      default:
        return 'cog';
    }
  };

  const renderItem = ({ item }) => {
    const iconName = getCommandIcon(item.command_type);
    const statusColor = item.success ? Theme.colors.success : Theme.colors.error;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={iconName} size={24} color={Theme.colors.accent} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.commandText}>{item.command_type}</Text>
            <Text style={styles.timeText}>{formatTimestamp(item.timestamp)}</Text>
          </View>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.success ? 'ÉXITO' : 'FALLO'}
            </Text>
          </View>
        </View>
        {item.details ? (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsText}>{item.details}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading && history.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Theme.colors.accent} />
        </View>
      ) : error && history.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLogs}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="history" size={48} color={Theme.colors.textMuted} />
          <Text style={styles.emptyText}>No hay comandos registrados en esta sesión.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLogs}>
            <Text style={styles.retryText}>Actualizar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item, index) => item.timestamp + index}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshing={loading}
          onRefresh={fetchLogs}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  commandText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  timeText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  detailsText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    color: Theme.colors.textDim,
  },
  emptyText: {
    fontSize: 15,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  errorText: {
    fontSize: 15,
    color: Theme.colors.error,
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.accent,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
