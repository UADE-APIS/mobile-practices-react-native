import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Theme } from '../config/theme';
import { api, getApiErrorMessage } from '../config/api';
import { addLogEntry } from '../utils/history';

export default function ActionsScreen() {
  const [acciones, setAcciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [historialLocal, setHistorialLocal] = useState([]);

  useEffect(() => {
    fetchAcciones();
  }, []);

  const fetchAcciones = async () => {
    try {
      const response = await api.get('/actions');
      // El endpoint devuelve { robot_type: "...", actions: ["stand", "sit", ...] }
      setAcciones(response.data.actions);
    } catch (error) {
      Alert.alert('Error de red', getApiErrorMessage(error));
    } finally {
      setCargando(false);
    }
  };

  const ejecutarAccion = async (nombreAccion) => {
    try {
      const response = await api.post(`/action/${nombreAccion}`);
      const exito = response.data.success;
      
      // Feedback visual
      if (exito) {
        Alert.alert('Éxito', `La acción "${nombreAccion}" se ejecutó correctamente.`);
      } else {
        Alert.alert('Aviso', `La acción "${nombreAccion}" no se pudo completar.`);
      }

      await addLogEntry('ACTION', `action=${nombreAccion}`, exito);
      agregarAlHistorial(nombreAccion, exito);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error));
      await addLogEntry('ACTION', `action=${nombreAccion}, error=${error.message || 'unknown'}`, false);
      agregarAlHistorial(nombreAccion, false);
    }
  };

  const agregarAlHistorial = (accion, exito) => {
    const nuevoRegistro = {
      id: Date.now().toString(),
      accion: accion,
      exito: exito,
      timestamp: new Date().toLocaleTimeString(),
    };
    // Guardamos inyectando al principio del arreglo
    setHistorialLocal(prev => [nuevoRegistro, ...prev]);
  };

  // Pantalla de carga mientras resuelve el GET inicial
  if (cargando) {
    return (
      <View style={styles.containerCentro}>
        <ActivityIndicator size="large" color={Theme.colors.accent || '#fff'} />
        <Text style={styles.sub}>Cargando acciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Acciones Disponibles</Text>
      
      {/* Grilla de botones */}
      <View style={styles.grilla}>
        {acciones.map(accion => (
          <TouchableOpacity 
            key={accion} 
            style={styles.botonAccion}
            onPress={() => ejecutarAccion(accion)}
          >
            <Text style={styles.botonTexto}>{accion}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Historial de la sesión actual */}
      <View style={styles.historialContainer}>
        <Text style={styles.historialTitulo}>Historial de comandos (sesión)</Text>
        <FlatList
          data={historialLocal}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.historialItem}>
              <Text style={styles.historialTexto}>
                [{item.timestamp}] {item.accion} {item.exito ? '✅' : '❌'}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.sub}>No enviaste comandos todavía.</Text>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    padding: 16,
  },
  containerCentro: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 16,
    textAlign: 'center'
  },
  sub: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    marginTop: 8,
  },
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  botonAccion: {
    backgroundColor: Theme.colors.card,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.accent || '#444',
    minWidth: '40%',
    alignItems: 'center',
  },
  botonTexto: {
    color: Theme.colors.text,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  historialContainer: {
    flex: 1,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
  },
  historialTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.text,
    marginBottom: 12,
  },
  historialItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  historialTexto: {
    color: Theme.colors.text,
    fontSize: 14,
  }
});