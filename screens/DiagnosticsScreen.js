import React, { useContext, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RobotContext } from '../context/RobotContext';
import { Theme } from '../config/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getDefaultServerUrl, normalizeServerUrl } from '../config/api';

export default function DiagnosticsScreen() {
  const { status, serverUrl, setServerUrl, fetchStatus } = useContext(RobotContext);
  const [apiUrl, setApiUrl] = useState(serverUrl || getDefaultServerUrl());
  const recommendedUrl = getDefaultServerUrl();

  useEffect(() => {
    setApiUrl(serverUrl || recommendedUrl);
  }, [serverUrl, recommendedUrl]);

  const handleSaveServerUrl = async () => {
    const cleanUrl = normalizeServerUrl(apiUrl);

    if (!cleanUrl) {
      Alert.alert('URL incompleta', 'Ingresá la dirección de la API.');
      return;
    }

    await setServerUrl(cleanUrl);
    Alert.alert('API actualizada', `La app va a usar ${cleanUrl}`);
  };
<<<<<<< HEAD

  const handleUseRecommendedUrl = async () => {
    const cleanUrl = normalizeServerUrl(recommendedUrl);
    setApiUrl(cleanUrl);
    await setServerUrl(cleanUrl);
    Alert.alert('API actualizada', `La app va a usar ${cleanUrl}`);
  };
=======
>>>>>>> main

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
        <Text style={styles.helperText}>Sugerida para Expo Go: {recommendedUrl}</Text>
<<<<<<< HEAD
        <TouchableOpacity testID="use-recommended-api-url" style={styles.recommendedBtn} onPress={handleUseRecommendedUrl}>
          <MaterialCommunityIcons name="cellphone-arrow-down" size={18} color={Theme.colors.text} />
          <Text style={styles.recommendedBtnText}>Usar sugerida</Text>
        </TouchableOpacity>
=======
>>>>>>> main

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://10.2.2.220:8000"
            placeholderTextColor={Theme.colors.textDim}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity testID="save-api-url" style={styles.saveBtn} onPress={handleSaveServerUrl}>
            <MaterialCommunityIcons name="content-save" size={20} color={Theme.colors.text} />
          </TouchableOpacity>
        </View>
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
<<<<<<< HEAD
  recommendedBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
  recommendedBtnText: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
=======
>>>>>>> main
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.sm,
    color: Theme.colors.text,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 12,
  },
  saveBtn: {
    width: 46,
    height: 46,
    backgroundColor: Theme.colors.accent,
    borderRadius: Theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
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
