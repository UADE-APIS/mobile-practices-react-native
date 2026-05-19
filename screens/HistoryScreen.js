import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../config/theme';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Historial de Comandos</Text>
      <Text style={styles.sub}>Pronto disponible en la rama feature/historial-persistente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
  },
  sub: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    marginTop: 8,
  },
});
