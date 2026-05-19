import React, { useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { RobotContext } from '../context/RobotContext';
import { Theme } from '../config/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DiagnosticsScreen() {
  const { status, fetchStatus } = useContext(RobotContext);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Diagnóstico de Hardware</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchStatus}>
          <MaterialCommunityIcons name="refresh" size={20} color={Theme.colors.text} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>Detalle completo de la telemetría del robot en formato JSON:</Text>
      
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
