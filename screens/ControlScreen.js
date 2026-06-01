import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RobotContext } from '../context/RobotContext';
import { Theme } from '../config/theme';

const MAX_LINEAR_SPEED = 0.45;
const MAX_YAW_SPEED = 1.2;
const JOYSTICK_SIZE = 220;
const KNOB_SIZE = 64;
const JOYSTICK_RADIUS = (JOYSTICK_SIZE - KNOB_SIZE) / 2;
const MOVE_THROTTLE_MS = 150;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundCommand(value) {
  return Number(value.toFixed(2));
}

export function getJoystickCommand(x, y, joystickMode) {
  const normalizedX = x / JOYSTICK_RADIUS;
  const normalizedY = y / JOYSTICK_RADIUS;
  const vx = roundCommand(-normalizedY * MAX_LINEAR_SPEED);
  const vy = joystickMode === 'lateral' ? roundCommand(normalizedX * MAX_LINEAR_SPEED) : 0;
  const vyaw = joystickMode === 'giro' ? roundCommand(normalizedX * MAX_YAW_SPEED) : 0;

  return { vx, vy, vyaw };
}

function getApiError(err) {
  return err.response?.data?.detail || err.response?.data?.error || 'No se pudo completar el comando.';
}

function getConnectionView(status, robotType) {
  if (status.connection_state === 'connected') {
    return {
      icon: 'robot',
      color: Theme.colors.success,
      title: `Control activo - ${robotType}`,
      subtitle: 'Los comandos se envían directamente al backend.',
    };
  }

  if (status.connection_state === 'connecting') {
    return {
      icon: 'robot-happy',
      color: Theme.colors.warning,
      title: 'Conectando robot',
      subtitle: 'Esperando confirmación del backend antes de habilitar comandos.',
    };
  }

  if (status.connection_state === 'error') {
    return {
      icon: 'robot-dead',
      color: Theme.colors.error,
      title: 'Error de conexión',
      subtitle: status.last_error || 'No se pudo determinar el estado actual del robot.',
    };
  }

  return {
    icon: 'robot-off',
    color: Theme.colors.textMuted,
    title: 'Robot desconectado',
    subtitle: 'La pantalla se habilita al conectar un robot.',
  };
}

export default function ControlScreen() {
  const {
    status,
    moveRobot,
    stopRobot,
    standUpRobot,
    sitDownRobot,
  } = useContext(RobotContext);

  const [commandLoading, setCommandLoading] = useState(null);
  const [currentCommand, setCurrentCommand] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [joystickMode, setJoystickMode] = useState('lateral');
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const [joystickCommand, setJoystickCommand] = useState({ vx: 0, vy: 0, vyaw: 0 });

  const lastMoveSentAt = useRef(0);
  const latestCommandId = useRef(0);
  const pendingMoveRequests = useRef(new Set());
  const isConnected = status.connection_state === 'connected';
  const commandsEnabled = isConnected && commandLoading === null;
  const robotType = status.robot_type ? status.robot_type.toUpperCase() : 'ROBOT';
  const connectionView = getConnectionView(status, robotType);

  const sendMoveRequest = useCallback((vx, vy, vyaw) => {
    const request = moveRobot(vx, vy, vyaw);
    pendingMoveRequests.current.add(request);
    request.finally(() => pendingMoveRequests.current.delete(request)).catch(() => {});
    return request;
  }, [moveRobot]);

  const stopAfterPendingMoves = useCallback(async () => {
    const pendingRequests = [...pendingMoveRequests.current];
    await stopRobot();

    if (pendingRequests.length > 0) {
      await Promise.allSettled(pendingRequests);
      await stopRobot();
    }
  }, [stopRobot]);

  const sendStop = useCallback(async (showFeedback = false) => {
    if (!isConnected) return;

    const commandId = ++latestCommandId.current;
    try {
      await stopAfterPendingMoves();
      if (latestCommandId.current !== commandId) return;

      setCurrentCommand(null);
      setJoystickCommand({ vx: 0, vy: 0, vyaw: 0 });
      if (showFeedback) {
        setFeedback({ type: 'success', message: 'Robot detenido correctamente.' });
      }
    } catch (err) {
      if (latestCommandId.current === commandId) {
        setFeedback({ type: 'error', message: getApiError(err) });
      }
    }
  }, [isConnected, stopAfterPendingMoves]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (isConnected) {
          const commandId = ++latestCommandId.current;
          stopAfterPendingMoves().catch((err) => {
            if (latestCommandId.current === commandId) {
              console.error('Stop on blur error:', err);
            }
          });
        }
      };
    }, [isConnected, stopAfterPendingMoves])
  );

  const sendMove = async (label, vx, vy, vyaw) => {
    if (!isConnected) {
      Alert.alert('Robot desconectado', 'Conectá un robot antes de enviar comandos de movimiento.');
      return;
    }

    setCommandLoading(label);
    const commandId = ++latestCommandId.current;
    try {
      await sendMoveRequest(vx, vy, vyaw);
      if (latestCommandId.current !== commandId) return;

      setCurrentCommand({ label, vx, vy, vyaw });
      setFeedback({ type: 'success', message: `${label} enviado correctamente.` });
    } catch (err) {
      if (latestCommandId.current === commandId) {
        setFeedback({ type: 'error', message: getApiError(err) });
      }
    } finally {
      setCommandLoading((current) => current === label ? null : current);
    }
  };

  const handleStop = async () => {
    setCommandLoading('stop');
    await sendStop(true);
    setCommandLoading((current) => current === 'stop' ? null : current);
    setKnobPosition({ x: 0, y: 0 });
  };

  const handlePosture = async (type) => {
    if (!isConnected) {
      Alert.alert('Robot desconectado', 'Conectá un robot antes de enviar comandos.');
      return;
    }

    const isStandUp = type === 'standup';
    setCommandLoading(type);
    const commandId = ++latestCommandId.current;
    try {
      const request = isStandUp ? standUpRobot : sitDownRobot;
      await stopAfterPendingMoves();
      if (latestCommandId.current !== commandId) return;

      await request();
      if (latestCommandId.current !== commandId) return;

      setCurrentCommand(null);
      setJoystickCommand({ vx: 0, vy: 0, vyaw: 0 });
      setKnobPosition({ x: 0, y: 0 });
      setFeedback({
        type: 'success',
        message: isStandUp ? 'Comando Pararse enviado correctamente.' : 'Comando Sentarse enviado correctamente.',
      });
    } catch (err) {
      if (latestCommandId.current === commandId) {
        setFeedback({ type: 'error', message: getApiError(err) });
      }
    } finally {
      setCommandLoading((current) => current === type ? null : current);
    }
  };

  const buildJoystickCommand = useCallback((x, y) => {
    return getJoystickCommand(x, y, joystickMode);
  }, [joystickMode]);

  const sendJoystickMove = useCallback((x, y) => {
    const now = Date.now();
    const command = buildJoystickCommand(x, y);
    setJoystickCommand(command);

    if (!commandsEnabled || now - lastMoveSentAt.current < MOVE_THROTTLE_MS) {
      return;
    }

    lastMoveSentAt.current = now;
    const commandId = ++latestCommandId.current;
    sendMoveRequest(command.vx, command.vy, command.vyaw)
      .then(() => {
        if (latestCommandId.current !== commandId) return;

        setCurrentCommand({ label: 'Joystick', ...command });
        setFeedback({ type: 'success', message: 'Control por joystick activo.' });
      })
      .catch((err) => {
        if (latestCommandId.current === commandId) {
          setFeedback({ type: 'error', message: getApiError(err) });
        }
      });
  }, [buildJoystickCommand, commandsEnabled, sendMoveRequest]);

  const joystickResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => commandsEnabled,
    onMoveShouldSetPanResponder: () => commandsEnabled,
    onPanResponderMove: (_, gestureState) => {
      const x = clamp(gestureState.dx, -JOYSTICK_RADIUS, JOYSTICK_RADIUS);
      const y = clamp(gestureState.dy, -JOYSTICK_RADIUS, JOYSTICK_RADIUS);
      setKnobPosition({ x, y });
      sendJoystickMove(x, y);
    },
    onPanResponderRelease: () => {
      setKnobPosition({ x: 0, y: 0 });
      sendStop(false);
    },
    onPanResponderTerminate: () => {
      setKnobPosition({ x: 0, y: 0 });
      sendStop(false);
    },
  }), [commandsEnabled, sendJoystickMove, sendStop]);

  const renderCommandButton = (label, icon, vx, vy, vyaw, style) => (
    <TouchableOpacity
      style={[styles.directionButton, style, !isConnected && styles.disabledButton]}
      disabled={!commandsEnabled}
      onPress={() => sendMove(label, vx, vy, vyaw)}
    >
      {commandLoading === label ? (
        <ActivityIndicator size="small" color={Theme.colors.text} />
      ) : (
        <MaterialCommunityIcons name={icon} size={28} color={Theme.colors.text} />
      )}
      <Text style={styles.directionText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.statusCard, { borderColor: connectionView.color }]}>
        <View style={styles.statusHeader}>
          <MaterialCommunityIcons
            name={connectionView.icon}
            size={32}
            color={connectionView.color}
          />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusTitle, { color: connectionView.color }]}>
              {connectionView.title}
            </Text>
            <Text style={styles.statusSubtitle}>{connectionView.subtitle}</Text>
          </View>
          {status.connection_state === 'connecting' && (
            <ActivityIndicator size="small" color={connectionView.color} />
          )}
        </View>
      </View>

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Controles Direccionales</Text>
        <Text style={styles.panelSubtitle}>Cada dirección mantiene el movimiento hasta presionar Detener.</Text>

        <View style={styles.dPad}>
          <View style={styles.dPadRow}>
            <View style={styles.emptySpace} />
            {renderCommandButton('Adelante', 'arrow-up-bold', MAX_LINEAR_SPEED, 0, 0)}
            <View style={styles.emptySpace} />
          </View>
          <View style={styles.dPadRow}>
            {renderCommandButton('Izquierda', 'arrow-left-bold', 0, MAX_LINEAR_SPEED, 0)}
            <TouchableOpacity
              style={[styles.stopButton, !isConnected && styles.disabledButton]}
              disabled={!isConnected}
              onPress={handleStop}
            >
              {commandLoading === 'stop' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="stop" size={32} color="#FFFFFF" />
              )}
              <Text style={styles.stopText}>Detener</Text>
            </TouchableOpacity>
            {renderCommandButton('Derecha', 'arrow-right-bold', 0, -MAX_LINEAR_SPEED, 0)}
          </View>
          <View style={styles.dPadRow}>
            <View style={styles.emptySpace} />
            {renderCommandButton('Atrás', 'arrow-down-bold', -MAX_LINEAR_SPEED, 0, 0)}
            <View style={styles.emptySpace} />
          </View>
        </View>
      </View>

      <View style={styles.panelCard}>
        <Text style={styles.panelTitle}>Postura</Text>
        <View style={styles.postureRow}>
          <TouchableOpacity
            style={[styles.postureButton, !isConnected && styles.disabledButton]}
            disabled={!isConnected || commandLoading !== null}
            onPress={() => handlePosture('standup')}
          >
            {commandLoading === 'standup' ? (
              <ActivityIndicator size="small" color={Theme.colors.text} />
            ) : (
              <MaterialCommunityIcons name="arrow-up-bold-box" size={28} color={Theme.colors.success} />
            )}
            <Text style={styles.postureText}>Pararse</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.postureButton, !isConnected && styles.disabledButton]}
            disabled={!isConnected || commandLoading !== null}
            onPress={() => handlePosture('sitdown')}
          >
            {commandLoading === 'sitdown' ? (
              <ActivityIndicator size="small" color={Theme.colors.text} />
            ) : (
              <MaterialCommunityIcons name="arrow-down-bold-box" size={28} color={Theme.colors.warning} />
            )}
            <Text style={styles.postureText}>Sentarse</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.panelCard}>
        <View style={styles.joystickHeader}>
          <View>
            <Text style={styles.panelTitle}>Joystick Virtual</Text>
            <Text style={styles.panelSubtitle}>Soltar el joystick envía Detener.</Text>
          </View>
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              style={[styles.modeButton, joystickMode === 'lateral' && styles.modeButtonActive]}
              onPress={() => setJoystickMode('lateral')}
            >
              <Text style={[styles.modeText, joystickMode === 'lateral' && styles.modeTextActive]}>Lateral</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, joystickMode === 'giro' && styles.modeButtonActive]}
              onPress={() => setJoystickMode('giro')}
            >
              <Text style={[styles.modeText, joystickMode === 'giro' && styles.modeTextActive]}>Giro</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.joystickContainer}>
          <View
            testID="joystick-base"
            style={[styles.joystickBase, !isConnected && styles.disabledJoystick]}
            {...joystickResponder.panHandlers}
          >
            <View style={styles.joystickCrossVertical} />
            <View style={styles.joystickCrossHorizontal} />
            <View
              style={[
                styles.joystickKnob,
                {
                  transform: [
                    { translateX: knobPosition.x },
                    { translateY: knobPosition.y },
                  ],
                },
              ]}
            >
              <MaterialCommunityIcons name="gamepad-circle" size={28} color={Theme.colors.text} />
            </View>
          </View>
        </View>

        <View style={styles.valuesRow}>
          <View style={styles.valuePill}>
            <Text style={styles.valueLabel}>vx</Text>
            <Text style={styles.valueText}>{joystickCommand.vx}</Text>
          </View>
          <View style={styles.valuePill}>
            <Text style={styles.valueLabel}>vy</Text>
            <Text style={styles.valueText}>{joystickCommand.vy}</Text>
          </View>
          <View style={styles.valuePill}>
            <Text style={styles.valueLabel}>vyaw</Text>
            <Text style={styles.valueText}>{joystickCommand.vyaw}</Text>
          </View>
        </View>
      </View>

      {currentCommand && (
        <View style={styles.commandCard}>
          <Text style={styles.commandTitle}>Último comando</Text>
          <Text style={styles.commandText}>{currentCommand.label}</Text>
          <Text style={styles.commandValues}>
            vx: {currentCommand.vx} · vy: {currentCommand.vy} · vyaw: {currentCommand.vyaw}
          </Text>
        </View>
      )}

      {feedback && (
        <View style={[
          styles.feedbackCard,
          { borderColor: feedback.type === 'success' ? Theme.colors.success : Theme.colors.error },
        ]}>
          <MaterialCommunityIcons
            name={feedback.type === 'success' ? 'check-circle' : 'alert-circle'}
            size={22}
            color={feedback.type === 'success' ? Theme.colors.success : Theme.colors.error}
          />
          <Text style={styles.feedbackText}>{feedback.message}</Text>
        </View>
      )}
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
  statusCard: {
    backgroundColor: Theme.colors.card,
    borderWidth: 1.5,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    color: Theme.colors.text,
    fontSize: 17,
    fontWeight: 'bold',
  },
  statusSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  panelCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
  },
  panelTitle: {
    color: Theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  panelSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  dPad: {
    gap: 10,
  },
  dPadRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  emptySpace: {
    width: 96,
    height: 76,
  },
  directionButton: {
    width: 96,
    height: 76,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  directionText: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  stopButton: {
    width: 96,
    height: 76,
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  stopText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.4,
  },
  postureRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  postureButton: {
    flex: 1,
    height: 72,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  postureText: {
    color: Theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  joystickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modeSwitch: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 3,
  },
  modeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: Theme.colors.accent,
  },
  modeText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  joystickContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  joystickBase: {
    width: JOYSTICK_SIZE,
    height: JOYSTICK_SIZE,
    borderRadius: JOYSTICK_SIZE / 2,
    backgroundColor: Theme.colors.background,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  disabledJoystick: {
    opacity: 0.35,
  },
  joystickCrossVertical: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: Theme.colors.border,
  },
  joystickCrossHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: Theme.colors.border,
  },
  joystickKnob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: Theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  valuesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  valuePill: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingVertical: 8,
    alignItems: 'center',
  },
  valueLabel: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  valueText: {
    color: Theme.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
  },
  commandCard: {
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
  },
  commandTitle: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  commandText: {
    color: Theme.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  commandValues: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Theme.colors.card,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    padding: Theme.spacing.md,
  },
  feedbackText: {
    color: Theme.colors.text,
    flex: 1,
    fontSize: 13,
  },
});
