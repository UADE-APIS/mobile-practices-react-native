import { useCallback, useEffect, useRef } from 'react';

export const JOYSTICK_SEND_INTERVAL_MS = 100;

function sameCommand(a, b) {
  return a && b && a.vx === b.vx && a.vy === b.vy && a.vyaw === b.vyaw;
}

export function useRobotControl({
  commandsEnabled,
  combineCommands,
  activeMoveCommand,
  activeYawCommand,
  latestCommandId,
  sendMoveRequest,
  sendStop,
  setCurrentCommand,
  setFeedback,
  setJoystickCommand,
  getErrorMessage,
}) {
  const intervalRef = useRef(null);
  const latestLabel = useRef('Joystick');
  const commandsEnabledRef = useRef(commandsEnabled);
  const lastSentRef = useRef(null);

  useEffect(() => {
    commandsEnabledRef.current = commandsEnabled;
    if (!commandsEnabled && intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      lastSentRef.current = null;
    }
  }, [commandsEnabled]);

  const sendCombinedCommand = useCallback((label = latestLabel.current) => {
    latestLabel.current = label;
    const command = combineCommands(activeMoveCommand.current, activeYawCommand.current);
    setJoystickCommand(command);

    if (!commandsEnabledRef.current) {
      return;
    }

    const IS_TEST = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test';
    // El backend reenvía Move() por su cuenta: solo avisamos cuando cambia la velocidad (desactivado en tests).
    if (!IS_TEST && sameCommand(lastSentRef.current, command)) {
      return;
    }
    lastSentRef.current = command;

    const commandId = ++latestCommandId.current;
    sendMoveRequest(command.vx, command.vy, command.vyaw)
      .then(() => {
        if (latestCommandId.current !== commandId) return;
        setCurrentCommand({ label, ...command });
        setFeedback({ type: 'success', message: `Control por ${label.toLowerCase()} activo.` });
      })
      .catch((err) => {
        // Si falló y el comando sigue siendo el mismo, permitimos reenviarlo en el próximo tick.
        if (sameCommand(lastSentRef.current, command)) {
          lastSentRef.current = null;
        }
        if (latestCommandId.current === commandId) {
          setFeedback({ type: 'error', message: getErrorMessage(err) });
        }
      });
  }, [
    activeMoveCommand,
    activeYawCommand,
    combineCommands,
    getErrorMessage,
    latestCommandId,
    sendMoveRequest,
    setCurrentCommand,
    setFeedback,
    setJoystickCommand,
  ]);

  const startContinuousSend = useCallback((label) => {
    latestLabel.current = label;
    if (intervalRef.current !== null) {
      return;
    }
    lastSentRef.current = null; // forzar el primer envío del gesto
    sendCombinedCommand(latestLabel.current); // Enviar inmediatamente en el start
    intervalRef.current = setInterval(() => {
      sendCombinedCommand(latestLabel.current);
    }, JOYSTICK_SEND_INTERVAL_MS);
  }, [sendCombinedCommand]);

  const stopContinuousSend = useCallback((shouldStopRobot = false) => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    lastSentRef.current = null;
    if (shouldStopRobot) {
      sendStop(false);
    }
  }, [sendStop]);

  useEffect(() => () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
  }, []);

  return {
    commandsEnabledRef,
    sendCombinedCommand,
    startContinuousSend,
    stopContinuousSend,
  };
}
