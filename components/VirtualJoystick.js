import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme } from '../config/theme';

export const JOYSTICK_SIZE = 220;
export const KNOB_SIZE = 64;
export const JOYSTICK_RADIUS = (JOYSTICK_SIZE - KNOB_SIZE) / 2;

export default function VirtualJoystick({
  testID,
  disabled = false,
  touchHandlers = {},
  knobPosition = { x: 0, y: 0 },
  mode = 'move',
}) {
  const isYaw = mode === 'yaw';

  return (
    <View
      testID={testID}
      style={[styles.base, disabled && styles.disabled]}
      {...touchHandlers}
    >
      {!isYaw && <View pointerEvents="none" style={styles.crossVertical} />}
      <View pointerEvents="none" style={styles.crossHorizontal} />
      <View
        pointerEvents="none"
        style={[
          styles.knob,
          isYaw && styles.yawKnob,
          {
            transform: [
              { translateX: knobPosition.x },
              { translateY: isYaw ? 0 : knobPosition.y },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name={isYaw ? 'rotate-360' : 'arrow-all'}
          size={28}
          color={Theme.colors.text}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
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
  disabled: {
    opacity: 0.35,
  },
  crossVertical: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: Theme.colors.border,
  },
  crossHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: Theme.colors.border,
  },
  knob: {
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
  yawKnob: {
    backgroundColor: Theme.colors.info,
    shadowColor: Theme.colors.info,
  },
});
