import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RobotContext } from '../context/RobotContext';
import { Theme } from '../config/theme';
import { useRobotControl } from '../hooks/useRobotControl';
import VirtualJoystick, { JOYSTICK_RADIUS, JOYSTICK_SIZE } from '../components/VirtualJoystick';

const MAX_LINEAR_SPEED = 0.45;
const MAX_YAW_SPEED = 1.2;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function roundCommand(value) {
  return Number(value.toFixed(2));
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

export function normalizeJoystickVector(x, y) {
  const safeX = safeNumber(x);
  const safeY = safeNumber(y);
  const distance = Math.hypot(safeX, safeY);

  if (distance <= JOYSTICK_RADIUS) {
    return { x: safeX, y: safeY };
  }

  const scale = JOYSTICK_RADIUS / distance;
  return {
    x: safeX * scale,
    y: safeY * scale,
  };
}

export function getVectorFromTouch(event, allowY = true) {
  const locationX = safeNumber(event?.nativeEvent?.locationX);
  const locationY = safeNumber(event?.nativeEvent?.locationY);
  return normalizeJoystickVector(
    locationX - JOYSTICK_SIZE / 2,
    allowY ? locationY - JOYSTICK_SIZE / 2 : 0
  );
}

export function getMoveJoystickCommand(x, y) {
  const normalizedVector = normalizeJoystickVector(x, y);
  const normalizedX = clamp(normalizedVector.x / JOYSTICK_RADIUS, -1, 1);
  const normalizedY = clamp(normalizedVector.y / JOYSTICK_RADIUS, -1, 1);
  const vx = roundCommand(clamp(-normalizedY * MAX_LINEAR_SPEED, -MAX_LINEAR_SPEED, MAX_LINEAR_SPEED));
  const vy = roundCommand(clamp(normalizedX * MAX_LINEAR_SPEED, -MAX_LINEAR_SPEED, MAX_LINEAR_SPEED));
  const vyaw = 0;

  return { vx, vy, vyaw };
}

export function getYawJoystickCommand(x) {
  const normalizedVector = normalizeJoystickVector(x, 0);
  const normalizedX = clamp(normalizedVector.x / JOYSTICK_RADIUS, -1, 1);
  const vyaw = roundCommand(clamp(normalizedX * MAX_YAW_SPEED, -MAX_YAW_SPEED, MAX_YAW_SPEED));

  return { vx: 0, vy: 0, vyaw };
}

export function getJoystickCommand(x, y) {
  return getMoveJoystickCommand(x, y);
}

export function combineJoystickCommands(moveCommand = {}, yawCommand = {}) {
  return {
    vx: roundCommand(clamp(safeNumber(moveCommand.vx), -MAX_LINEAR_SPEED, MAX_LINEAR_SPEED)),
    vy: roundCommand(clamp(safeNumber(moveCommand.vy), -MAX_LINEAR_SPEED, MAX_LINEAR_SPEED)),
    vyaw: roundCommand(clamp(safeNumber(yawCommand.vyaw), -MAX_YAW_SPEED, MAX_YAW_SPEED)),
  };
}

function getTouchIdentifier(nativeEvent) {
  return nativeEvent?.identifier ?? nativeEvent?.target ?? 'touch';
}

function getTouchFromEvent(event, activeTouchId) {
  const nativeEvent = event?.nativeEvent;
  const changedTouches = nativeEvent?.changedTouches || [];

  return changedTouches.find((touch) => getTouchIdentifier(touch) === activeTouchId) || nativeEvent || {};
}

function hasChangedTouch(event, activeTouchId) {
  const nativeEvent = event?.nativeEvent;
  const changedTouches = nativeEvent?.changedTouches || [];

  if (changedTouches.length === 0) {
    return true;
  }

  return changedTouches.some((touch) => getTouchIdentifier(touch) === activeTouchId);
}

function getVectorFromNativeTouch(nativeEvent, allowY = true) {
  const locationX = safeNumber(nativeEvent?.locationX);
  const locationY = safeNumber(nativeEvent?.locationY);
  return normalizeJoystickVector(
    locationX - JOYSTICK_SIZE / 2,
    allowY ? locationY - JOYSTICK_SIZE / 2 : 0
  );
}

function getTouchPoint(nativeEvent) {
  return {
    x: safeNumber(nativeEvent?.pageX ?? nativeEvent?.locationX),
    y: safeNumber(nativeEvent?.pageY ?? nativeEvent?.locationY),
  };
}

function getDragVectorFromNativeTouch(nativeEvent, origin, allowY = true) {
  const point = getTouchPoint(nativeEvent);

  return normalizeJoystickVector(
    point.x - safeNumber(origin?.x),
    allowY ? point.y - safeNumber(origin?.y) : 0
  );
}

function getApiError(err) {
  return err.robotMessage
    || err.response?.data?.detail
    || err.response?.data?.error
    || 'No se pudo completar el comando.';
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

  if (status.connection_state === 'connecting' || status.connection_state === 'reconnecting') {
    return {
      icon: 'robot-happy',
      color: Theme.colors.warning,
      title: status.connection_state === 'reconnecting' ? 'Reconectando robot...' : 'Conectando robot',
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
  const { width, height } = useWindowDimensions();
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
  const [controlMode, setControlMode] = useState('joystick');
  const [verticalJoystickMode, setVerticalJoystickMode] = useState('move');
  const [controlLayout, setControlLayout] = useState('vertical');
  const [knobPosition, setKnobPosition] = useState({ x: 0, y: 0 });
  const [yawKnobPosition, setYawKnobPosition] = useState({ x: 0, y: 0 });
  const [moveDragPosition, setMoveDragPosition] = useState({ x: 0, y: 0 });
  const [yawDragPosition, setYawDragPosition] = useState({ x: 0, y: 0 });
  const [joystickCommand, setJoystickCommand] = useState({ vx: 0, vy: 0, vyaw: 0 });
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const latestCommandId = useRef(0);
  const pendingMoveRequests = useRef(new Set());
  const activeMoveTouchId = useRef(null);
  const activeYawTouchId = useRef(null);
  const activeMoveDragOrigin = useRef({ x: 0, y: 0 });
  const activeYawDragOrigin = useRef({ x: 0, y: 0 });
  const activeMoveCommand = useRef({ vx: 0, vy: 0, vyaw: 0 });
  const activeYawCommand = useRef({ vx: 0, vy: 0, vyaw: 0 });
  const isConnected = status.connection_state === 'connected';
  const commandsEnabled = isConnected && commandLoading === null;
  const robotType = status.robot_type ? status.robot_type.toUpperCase() : 'ROBOT';
  const connectionView = getConnectionView(status, robotType);
  const isDeviceLandscape = width > height;
  const wantsLandscapeLayout = controlLayout === 'horizontal';
  const isLandscapeLayout = wantsLandscapeLayout && isDeviceLandscape;

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
      activeMoveCommand.current = { vx: 0, vy: 0, vyaw: 0 };
      activeYawCommand.current = { vx: 0, vy: 0, vyaw: 0 };
      activeMoveTouchId.current = null;
      activeYawTouchId.current = null;
      if (showFeedback) {
        setFeedback({ type: 'success', message: 'Robot detenido correctamente.' });
      }
    } catch (err) {
      if (latestCommandId.current === commandId) {
        setFeedback({ type: 'error', message: getApiError(err) });
      }
    }
  }, [isConnected, stopAfterPendingMoves]);

  const {
    commandsEnabledRef,
    sendCombinedCommand,
    startContinuousSend,
    stopContinuousSend,
  } = useRobotControl({
    commandsEnabled,
    combineCommands: combineJoystickCommands,
    activeMoveCommand,
    activeYawCommand,
    latestCommandId,
    sendMoveRequest,
    sendStop,
    setCurrentCommand,
    setFeedback,
    setJoystickCommand,
    getErrorMessage: getApiError,
  });

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopContinuousSend(false);
        if (isConnected) {
          const commandId = ++latestCommandId.current;
          stopAfterPendingMoves().catch((err) => {
            if (latestCommandId.current === commandId) {
              console.error('Stop on blur error:', err);
            }
          });
        }
      };
    }, [isConnected, stopAfterPendingMoves, stopContinuousSend])
  );

  const sendMove = async (label, vx, vy, vyaw) => {
    if (!isConnected) {
      Alert.alert('Robot desconectado', 'Conectá un robot antes de enviar comandos de movimiento.');
      return;
    }

    setCommandLoading(label);
    stopContinuousSend(false);
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
    stopContinuousSend(false);
    await sendStop(true);
    setCommandLoading((current) => current === 'stop' ? null : current);
    setKnobPosition({ x: 0, y: 0 });
    setYawKnobPosition({ x: 0, y: 0 });
    setMoveDragPosition({ x: 0, y: 0 });
    setYawDragPosition({ x: 0, y: 0 });
    activeMoveTouchId.current = null;
    activeYawTouchId.current = null;
    activeMoveCommand.current = { vx: 0, vy: 0, vyaw: 0 };
    activeYawCommand.current = { vx: 0, vy: 0, vyaw: 0 };
  };

  const handlePosture = async (type) => {
    if (!isConnected) {
      Alert.alert('Robot desconectado', 'Conectá un robot antes de enviar comandos.');
      return;
    }

    const isStandUp = type === 'standup';
    setCommandLoading(type);
    stopContinuousSend(false);
    const commandId = ++latestCommandId.current;
    
    try {
      const request = isStandUp ? standUpRobot : sitDownRobot;
      
      await stopAfterPendingMoves();
      if (latestCommandId.current !== commandId) return;

      await stopRobot();
      if (latestCommandId.current !== commandId) return;

      await new Promise((resolve) => setTimeout(resolve, 400));
      if (latestCommandId.current !== commandId) return;

      await request();
      if (latestCommandId.current !== commandId) return;

      setCurrentCommand(null);
      setJoystickCommand({ vx: 0, vy: 0, vyaw: 0 });
      activeMoveCommand.current = { vx: 0, vy: 0, vyaw: 0 };
      activeYawCommand.current = { vx: 0, vy: 0, vyaw: 0 };
      activeMoveTouchId.current = null;
      activeYawTouchId.current = null;
      setKnobPosition({ x: 0, y: 0 });
      setYawKnobPosition({ x: 0, y: 0 });
      setMoveDragPosition({ x: 0, y: 0 });
      setYawDragPosition({ x: 0, y: 0 });
      
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

  const hasActiveJoystickTouch = useCallback(() => (
    activeMoveTouchId.current !== null || activeYawTouchId.current !== null
  ), []);

  const lastTouchMoveSentAt = useRef(0);

  const sendCombinedJoystickCommand = useCallback((label) => {
    const IS_TEST = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
    if (!IS_TEST) {
      const now = Date.now();
      if (now - lastTouchMoveSentAt.current < 100) {
        return;
      }
      lastTouchMoveSentAt.current = now;
    }
    sendCombinedCommand(label);
  }, [sendCombinedCommand]);

  const releaseJoystickTouch = useCallback((type, event) => {
    const isMoveTouch = type === 'move';
    const activeTouchId = isMoveTouch ? activeMoveTouchId.current : activeYawTouchId.current;

    if (activeTouchId === null || !hasChangedTouch(event, activeTouchId)) {
      return;
    }

    if (isMoveTouch) {
      activeMoveTouchId.current = null;
      activeMoveCommand.current = { vx: 0, vy: 0, vyaw: 0 };
      setKnobPosition({ x: 0, y: 0 });
    } else {
      activeYawTouchId.current = null;
      activeYawCommand.current = { vx: 0, vy: 0, vyaw: 0 };
      setYawKnobPosition({ x: 0, y: 0 });
    }

    if (hasActiveJoystickTouch()) {
      setScrollEnabled(false);
      startContinuousSend(isMoveTouch ? 'Dirección' : 'Joystick');
      sendCombinedJoystickCommand(isMoveTouch ? 'Dirección' : 'Joystick');
      return;
    }

    setScrollEnabled(true);
    stopContinuousSend(true);
  }, [hasActiveJoystickTouch, sendCombinedJoystickCommand, startContinuousSend, stopContinuousSend]);

  const updateJoystickTouch = useCallback((type, event, shouldAssignTouch = false) => {
    if (!commandsEnabledRef.current) return;

    const isMoveTouch = type === 'move';
    const activeTouchRef = isMoveTouch ? activeMoveTouchId : activeYawTouchId;
    const label = isMoveTouch ? 'Joystick' : 'Dirección';

    if (shouldAssignTouch) {
      activeTouchRef.current = getTouchIdentifier(event?.nativeEvent);
    }

    if (activeTouchRef.current === null) {
      return;
    }

    const touch = getTouchFromEvent(event, activeTouchRef.current);
    const position = getVectorFromNativeTouch(touch, isMoveTouch);
    setScrollEnabled(false);

    if (isMoveTouch) {
      setKnobPosition(position);
      activeMoveCommand.current = getMoveJoystickCommand(position.x, position.y);
    } else {
      setYawKnobPosition(position);
      activeYawCommand.current = getYawJoystickCommand(position.x);
    }

    if (shouldAssignTouch) {
      startContinuousSend(label);
    }
  }, [commandsEnabledRef, sendCombinedJoystickCommand, startContinuousSend]);

  const moveJoystickTouchHandlers = useMemo(() => ({
    onTouchStart: (event) => updateJoystickTouch('move', event, true),
    onTouchMove: (event) => updateJoystickTouch('move', event),
    onTouchEnd: (event) => releaseJoystickTouch('move', event),
    onTouchCancel: (event) => releaseJoystickTouch('move', event),
  }), [releaseJoystickTouch, updateJoystickTouch]);

  const yawJoystickTouchHandlers = useMemo(() => ({
    onTouchStart: (event) => updateJoystickTouch('yaw', event, true),
    onTouchMove: (event) => updateJoystickTouch('yaw', event),
    onTouchEnd: (event) => releaseJoystickTouch('yaw', event),
    onTouchCancel: (event) => releaseJoystickTouch('yaw', event),
  }), [releaseJoystickTouch, updateJoystickTouch]);

  const releaseDragTouch = useCallback((type, event) => {
    const isMoveTouch = type === 'move';
    const activeTouchId = isMoveTouch ? activeMoveTouchId.current : activeYawTouchId.current;

    if (activeTouchId === null || !hasChangedTouch(event, activeTouchId)) {
      return;
    }

    if (isMoveTouch) {
      activeMoveTouchId.current = null;
      activeMoveCommand.current = { vx: 0, vy: 0, vyaw: 0 };
      setMoveDragPosition({ x: 0, y: 0 });
    } else {
      activeYawTouchId.current = null;
      activeYawCommand.current = { vx: 0, vy: 0, vyaw: 0 };
      setYawDragPosition({ x: 0, y: 0 });
    }

    if (hasActiveJoystickTouch()) {
      setScrollEnabled(false);
      startContinuousSend(isMoveTouch ? 'Vista' : 'Arrastre');
      sendCombinedJoystickCommand(isMoveTouch ? 'Vista' : 'Arrastre');
      return;
    }

    setScrollEnabled(true);
    stopContinuousSend(true);
  }, [hasActiveJoystickTouch, sendCombinedJoystickCommand, startContinuousSend, stopContinuousSend]);

  const updateDragTouch = useCallback((type, event, shouldAssignTouch = false) => {
    if (!commandsEnabledRef.current) return;

    const isMoveTouch = type === 'move';
    const activeTouchRef = isMoveTouch ? activeMoveTouchId : activeYawTouchId;
    const activeOriginRef = isMoveTouch ? activeMoveDragOrigin : activeYawDragOrigin;
    const label = isMoveTouch ? 'Arrastre' : 'Vista';

    if (shouldAssignTouch) {
      activeTouchRef.current = getTouchIdentifier(event?.nativeEvent);
      activeOriginRef.current = getTouchPoint(event?.nativeEvent);
      startContinuousSend(label);

      if (isMoveTouch) {
        setMoveDragPosition({ x: 0, y: 0 });
        activeMoveCommand.current = { vx: 0, vy: 0, vyaw: 0 };
      } else {
        setYawDragPosition({ x: 0, y: 0 });
        activeYawCommand.current = { vx: 0, vy: 0, vyaw: 0 };
      }

      setScrollEnabled(false);
      return;
    }

    if (activeTouchRef.current === null) {
      return;
    }

    const touch = getTouchFromEvent(event, activeTouchRef.current);
    const position = getDragVectorFromNativeTouch(touch, activeOriginRef.current, isMoveTouch);
    setScrollEnabled(false);

    if (isMoveTouch) {
      setMoveDragPosition(position);
      activeMoveCommand.current = getMoveJoystickCommand(position.x, position.y);
    } else {
      setYawDragPosition(position);
      activeYawCommand.current = getYawJoystickCommand(position.x);
    }
  }, [commandsEnabledRef, sendCombinedJoystickCommand, startContinuousSend]);

  const moveDragTouchHandlers = useMemo(() => ({
    onTouchStart: (event) => updateDragTouch('move', event, true),
    onTouchMove: (event) => updateDragTouch('move', event),
    onTouchEnd: (event) => releaseDragTouch('move', event),
    onTouchCancel: (event) => releaseDragTouch('move', event),
  }), [releaseDragTouch, updateDragTouch]);

  const yawDragTouchHandlers = useMemo(() => ({
    onTouchStart: (event) => updateDragTouch('yaw', event, true),
    onTouchMove: (event) => updateDragTouch('yaw', event),
    onTouchEnd: (event) => releaseDragTouch('yaw', event),
    onTouchCancel: (event) => releaseDragTouch('yaw', event),
  }), [releaseDragTouch, updateDragTouch]);

  const resetTouchControls = useCallback(() => {
    const hasActiveCommand = currentCommand !== null
      || activeMoveTouchId.current !== null
      || activeYawTouchId.current !== null
      || Object.values(activeMoveCommand.current).some((value) => value !== 0)
      || Object.values(activeYawCommand.current).some((value) => value !== 0);

    stopContinuousSend(hasActiveCommand);
    setKnobPosition({ x: 0, y: 0 });
    setYawKnobPosition({ x: 0, y: 0 });
    setMoveDragPosition({ x: 0, y: 0 });
    setYawDragPosition({ x: 0, y: 0 });
    setJoystickCommand({ vx: 0, vy: 0, vyaw: 0 });
    activeMoveTouchId.current = null;
    activeYawTouchId.current = null;
    activeMoveCommand.current = { vx: 0, vy: 0, vyaw: 0 };
    activeYawCommand.current = { vx: 0, vy: 0, vyaw: 0 };
    setScrollEnabled(true);
  }, [currentCommand, stopContinuousSend]);

  const handleControlModeChange = (mode) => {
    if (mode === controlMode) return;

    resetTouchControls();
    setControlMode(mode);
  };

  const handleVerticalJoystickModeChange = (mode) => {
    if (mode === verticalJoystickMode) return;

    resetTouchControls();
    setVerticalJoystickMode(mode);
  };

  const handleControlLayoutChange = () => {
    resetTouchControls();
    setControlLayout((layout) => layout === 'vertical' ? 'horizontal' : 'vertical');
  };

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, isLandscapeLayout && styles.contentLandscape]}
      scrollEnabled={scrollEnabled}
    >
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
          {(status.connection_state === 'connecting' || status.connection_state === 'reconnecting') && (
            <ActivityIndicator size="small" color={connectionView.color} />
          )}
        </View>
      </View>

      <View style={[styles.controlsLayout, isLandscapeLayout && styles.controlsLayoutLandscape]}>
        <View style={styles.controlsColumn}>
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
        </View>

        <View style={styles.controlsColumn}>
          <View style={styles.panelCard}>
            <View style={styles.joystickHeader}>
              <TouchableOpacity
                testID="orientation-toggle"
                style={[styles.orientationButton, wantsLandscapeLayout && styles.orientationButtonActive]}
                onPress={handleControlLayoutChange}
              >
                <MaterialCommunityIcons
                  name={isLandscapeLayout ? 'phone-rotate-portrait' : 'phone-rotate-landscape'}
                  size={18}
                  color={Theme.colors.text}
                />
                <Text style={styles.orientationButtonText}>
                  {isLandscapeLayout ? 'Vertical' : 'Poner horizontal'}
                </Text>
              </TouchableOpacity>
              <View style={styles.modeSwitch}>
                <TouchableOpacity
                  style={[styles.modeButton, controlMode === 'joystick' && styles.modeButtonActive]}
                  onPress={() => handleControlModeChange('joystick')}
                >
                  <Text style={[styles.modeText, controlMode === 'joystick' && styles.modeTextActive]}>Joystick</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, controlMode === 'drag' && styles.modeButtonActive]}
                  onPress={() => handleControlModeChange('drag')}
                >
                  <Text style={[styles.modeText, controlMode === 'drag' && styles.modeTextActive]}>Arrastre</Text>
                </TouchableOpacity>
              </View>
            </View>

            {wantsLandscapeLayout && !isDeviceLandscape && (
              <View style={styles.orientationHint}>
                <Text style={styles.orientationHintText}>Poné el celular en horizontal para ver los dos controles.</Text>
              </View>
            )}

            {!isLandscapeLayout && controlMode === 'joystick' && (
              <View style={styles.joystickModeSwitch}>
                <TouchableOpacity
                  style={[styles.modeButton, verticalJoystickMode === 'move' && styles.modeButtonActive]}
                  onPress={() => handleVerticalJoystickModeChange('move')}
                >
                  <Text style={[styles.modeText, verticalJoystickMode === 'move' && styles.modeTextActive]}>
                    Movimiento
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, verticalJoystickMode === 'yaw' && styles.modeButtonActive]}
                  onPress={() => handleVerticalJoystickModeChange('yaw')}
                >
                  <Text style={[styles.modeText, verticalJoystickMode === 'yaw' && styles.modeTextActive]}>
                    Vista
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isLandscapeLayout && controlMode === 'joystick' ? (
              <View style={styles.dualJoystickRow}>
                <View style={styles.dualJoystickColumn}>
                  <Text style={styles.joystickLabel}>Movimiento</Text>
                  <VirtualJoystick
                    testID="move-joystick-base"
                    disabled={!isConnected}
                    touchHandlers={moveJoystickTouchHandlers}
                    knobPosition={knobPosition}
                    mode="move"
                  />
                </View>
                <View style={styles.dualJoystickColumn}>
                  <Text style={styles.joystickLabel}>Dirección</Text>
                  <VirtualJoystick
                    testID="yaw-joystick-base"
                    disabled={!isConnected}
                    touchHandlers={yawJoystickTouchHandlers}
                    knobPosition={yawKnobPosition}
                    mode="yaw"
                  />
                </View>
              </View>
            ) : controlMode === 'joystick' ? (
              <View style={styles.joystickContainer}>
                <VirtualJoystick
                  testID="joystick-base"
                  disabled={!isConnected}
                  touchHandlers={verticalJoystickMode === 'move' ? moveJoystickTouchHandlers : yawJoystickTouchHandlers}
                  knobPosition={verticalJoystickMode === 'move' ? knobPosition : yawKnobPosition}
                  mode={verticalJoystickMode === 'move' ? 'move' : 'yaw'}
                />
              </View>
            ) : (
              <View style={[styles.dualDragRow, isLandscapeLayout && styles.dualDragRowLandscape]}>
                <View style={styles.dualDragColumn}>
                  <Text style={styles.joystickLabel}>Movimiento</Text>
                  <View
                    testID="move-drag-area"
                    style={[styles.dragArea, !isConnected && styles.disabledJoystick]}
                    {...moveDragTouchHandlers}
                  >
                    <View pointerEvents="none" style={styles.dragCrossVertical} />
                    <View pointerEvents="none" style={styles.dragCrossHorizontal} />
                    <View
                      pointerEvents="none"
                      style={[
                        styles.dragIndicator,
                        {
                          transform: [
                            { translateX: moveDragPosition.x },
                            { translateY: moveDragPosition.y },
                          ],
                        },
                      ]}
                    />
                    <Text style={styles.dragText}>Arrastrá para mover</Text>
                  </View>
                </View>
                <View style={styles.dualDragColumn}>
                  <Text style={styles.joystickLabel}>Vista</Text>
                  <View
                    testID="yaw-drag-area"
                    style={[styles.dragArea, !isConnected && styles.disabledJoystick]}
                    {...yawDragTouchHandlers}
                  >
                    <View pointerEvents="none" style={styles.dragCrossHorizontal} />
                    <View
                      pointerEvents="none"
                      style={[
                        styles.dragIndicator,
                        styles.yawDragIndicator,
                        {
                          transform: [
                            { translateX: yawDragPosition.x },
                            { translateY: 0 },
                          ],
                        },
                      ]}
                    />
                    <Text style={styles.dragText}>Arrastrá para mirar</Text>
                  </View>
                </View>
              </View>
            )}

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
  contentLandscape: {
    paddingHorizontal: Theme.spacing.lg,
  },
  controlsLayout: {
    gap: Theme.spacing.md,
  },
  controlsLayoutLandscape: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  controlsColumn: {
    flex: 1,
    gap: Theme.spacing.md,
    alignSelf: 'stretch',
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
    alignItems: 'flex-start',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  orientationButton: {
    minWidth: 118,
    height: 36,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.background,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  orientationButtonActive: {
    borderColor: Theme.colors.accent,
  },
  orientationButtonText: {
    color: Theme.colors.text,
    fontSize: 11,
    fontWeight: '700',
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
  joystickModeSwitch: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 3,
    marginBottom: 12,
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
  orientationHint: {
    backgroundColor: Theme.colors.background,
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  orientationHintText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
  },
  joystickContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  dualJoystickRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    gap: Theme.spacing.md,
  },
  dualJoystickColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dualDragRow: {
    gap: Theme.spacing.md,
    marginTop: 8,
  },
  dualDragRowLandscape: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dualDragColumn: {
    flex: 1,
  },
  joystickLabel: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  disabledJoystick: {
    opacity: 0.35,
  },
  dragArea: {
    height: JOYSTICK_SIZE,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.background,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  dragCrossVertical: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: Theme.colors.border,
  },
  dragCrossHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: Theme.colors.border,
  },
  dragIndicator: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.accent,
  },
  yawDragIndicator: {
    backgroundColor: Theme.colors.info,
  },
  dragText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
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
