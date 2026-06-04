import React, { useContext } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RobotContext } from '../context/RobotContext';
import { Theme } from '../config/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import useRecommendedServerUrl from '../hooks/useRecommendedServerUrl';

export default function DiagnosticsScreen() {
  const { status, serverUrl, fetchStatus } = useContext(RobotContext);
  const { recommendedUrl, networkState } = useRecommendedServerUrl();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Diagnóstico de Hardware</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchStatus}>
          <MaterialCommunityIcons name="refresh" size={20} color={Theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>Detalle completo de la telemetría del robot en formato JSON:</Text>

      <View style={styles.panelCard}>
        <Text style={styles.sectionTitle}>API del backend</Text>
        <Text style={styles.helperText}>URL actual: {serverUrl}</Text>
        <Text style={styles.helperText}>Recomendada: {recommendedUrl}</Text>
        <Text style={styles.helperText}>Red: {networkState.type || 'UNKNOWN'}</Text>
        <Text style={styles.helperText}>
          La URL de API solo se cambia antes de iniciar sesión.
        </Text>
      </View>
      
      <View style={styles.jsonContainer}>
        <Text style={styles.jsonText}>{JSON.stringify(status, null, 2)}</Text>
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    marginBottom: 16,
  },
  panelCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  helperText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  jsonContainer: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  jsonText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13,
    color: '#38BDF8', // Neon Cyan
    lineHeight: 18,
  },
});
