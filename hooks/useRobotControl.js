import { useCallback, useEffect, useRef } from 'react';

export const JOYSTICK_SEND_INTERVAL_MS = 100;

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

  useEffect(() => {
    commandsEnabledRef.current = commandsEnabled;
    if (!commandsEnabled && intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [commandsEnabled]);

  const sendCombinedCommand = useCallback((label = latestLabel.current) => {
    latestLabel.current = label;
    const command = combineCommands(activeMoveCommand.current, activeYawCommand.current);
    setJoystickCommand(command);

    if (!commandsEnabledRef.current) {
      return;
    }

    const commandId = ++latestCommandId.current;
    sendMoveRequest(command.vx, command.vy, command.vyaw)
      .then(() => {
        if (latestCommandId.current !== commandId) return;
        setCurrentCommand({ label, ...command });
        setFeedback({ type: 'success', message: `Control por ${label.toLowerCase()} activo.` });
      })
      .catch((err) => {
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

    intervalRef.current = setInterval(() => {
      sendCombinedCommand(latestLabel.current);
    }, JOYSTICK_SEND_INTERVAL_MS);
  }, [sendCombinedCommand]);

  const stopContinuousSend = useCallback((shouldStopRobot = false) => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

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
