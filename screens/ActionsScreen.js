import React, { useContext, useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { Theme } from '../config/theme';
import { getApiErrorMessage } from '../config/api';
import { RobotContext } from '../context/RobotContext';
import { executeRobotAction, getRobotActions } from '../services/robotApi';
import { addLogEntry } from '../utils/history';

export default function ActionsScreen() {
  const { status } = useContext(RobotContext);
  const [acciones, setAcciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [historialLocal, setHistorialLocal] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const isConnected = status.connection_state === 'connected';

  useEffect(() => {
    let isActive = true;

    if (!isConnected) {
      setAcciones([]);
      setFeedback({ type: 'info', message: 'Conectá un robot para cargar acciones disponibles.' });
      setCargando(false);
      return () => {
        isActive = false;
      };
    }

    fetchAcciones(() => isActive);

    return () => {
      isActive = false;
    };
  }, [isConnected]);

  const fetchAcciones = async (shouldApplyResult = () => true) => {
    if (!isConnected) {
      setCargando(false);
      return;
    }

    setCargando(true);
    try {
      const response = await getRobotActions();
      if (!shouldApplyResult()) return;
      setAcciones(response.data.actions || []);
      setFeedback(null);
    } catch (error) {
      if (!shouldApplyResult()) return;
      setFeedback({ type: 'error', message: getApiErrorMessage(error) });
    } finally {
      if (shouldApplyResult()) {
        setCargando(false);
      }
    }
  };

  const ejecutarAccion = async (nombreAccion) => {
    if (!isConnected) {
      setFeedback({ type: 'info', message: 'Conectá un robot antes de ejecutar acciones.' });
      return;
    }

    try {
      const response = await executeRobotAction(nombreAccion);
      const exito = response.data.success;
      
      setFeedback({
        type: exito ? 'success' : 'error',
        message: exito
          ? `La acción "${nombreAccion}" se ejecutó correctamente.`
          : `La acción "${nombreAccion}" no se pudo completar.`,
      });

      await addLogEntry('ACTION', `action=${nombreAccion}`, exito);
      agregarAlHistorial(nombreAccion, exito);
    } catch (error) {
      setFeedback({ type: 'error', message: getApiErrorMessage(error) });
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
    setHistorialLocal(prev => [nuevoRegistro, ...prev]);
  };

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

      {feedback && (
        <View style={[
          styles.feedback,
          feedback.type === 'success' && styles.feedbackSuccess,
          feedback.type === 'error' && styles.feedbackError,
        ]}>
          <Text style={styles.feedbackText}>{feedback.message}</Text>
        </View>
      )}
      
      <View style={styles.grilla}>
        {acciones.map(accion => (
          <TouchableOpacity 
            key={accion} 
            style={[styles.botonAccion, !isConnected && styles.botonAccionDisabled]}
            onPress={() => ejecutarAccion(accion)}
            disabled={!isConnected}
          >
            <Text style={[styles.botonTexto, !isConnected && styles.botonTextoDisabled]}>{accion}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
  feedback: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1,
    borderColor: Theme.colors.info,
    borderRadius: Theme.borderRadius.sm,
    padding: 12,
    marginBottom: 16,
  },
  feedbackSuccess: {
    borderColor: Theme.colors.success,
  },
  feedbackError: {
    borderColor: Theme.colors.error,
  },
  feedbackText: {
    color: Theme.colors.text,
    fontSize: 14,
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
  botonAccionDisabled: {
    opacity: 0.5,
    borderColor: Theme.colors.border,
  },
  botonTexto: {
    color: Theme.colors.text,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  botonTextoDisabled: {
    color: Theme.colors.textDim,
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
