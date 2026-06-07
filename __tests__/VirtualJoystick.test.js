import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import VirtualJoystick, {
  JOYSTICK_RADIUS,
  JOYSTICK_SIZE,
  KNOB_SIZE,
} from '../components/VirtualJoystick';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return {
    MaterialCommunityIcons: ({ name }) => <View testID={`icon-${name}`} />,
  };
});

describe('VirtualJoystick', () => {
  it('debe renderizar el joystick de movimiento y responder al toque', () => {
    const onTouchStart = jest.fn();
    const { getByTestId } = render(
      <VirtualJoystick
        testID="move-joystick"
        touchHandlers={{ onTouchStart }}
        knobPosition={{ x: 12, y: -8 }}
        mode="move"
      />
    );

    const joystick = getByTestId('move-joystick');
    const event = { nativeEvent: { locationX: 110, locationY: 110 } };
    fireEvent(joystick, 'touchStart', event);

    expect(onTouchStart).toHaveBeenCalledWith(event);
    expect(getByTestId('icon-arrow-all')).toBeTruthy();
  });

  it('debe renderizar el joystick de direccion', () => {
    const { getByTestId } = render(
      <VirtualJoystick
        testID="yaw-joystick"
        knobPosition={{ x: 35, y: 80 }}
        mode="yaw"
      />
    );

    expect(getByTestId('yaw-joystick')).toBeTruthy();
    expect(getByTestId('icon-rotate-360')).toBeTruthy();
  });

  it('debe mostrar el estado deshabilitado sin perder los eventos tactiles', () => {
    const onTouchEnd = jest.fn();
    const { getByTestId } = render(
      <VirtualJoystick
        testID="disabled-joystick"
        disabled
        touchHandlers={{ onTouchEnd }}
      />
    );

    const joystick = getByTestId('disabled-joystick');
    const event = { nativeEvent: { identifier: 3 } };
    fireEvent(joystick, 'touchEnd', event);

    expect(StyleSheet.flatten(joystick.props.style).opacity).toBe(0.35);
    expect(onTouchEnd).toHaveBeenCalledWith(event);
  });

  it('debe mantener las medidas usadas para calcular el movimiento', () => {
    expect(JOYSTICK_SIZE).toBe(220);
    expect(KNOB_SIZE).toBe(64);
    expect(JOYSTICK_RADIUS).toBe((JOYSTICK_SIZE - KNOB_SIZE) / 2);
  });
});
