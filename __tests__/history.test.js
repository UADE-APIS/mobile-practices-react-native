import * as SecureStore from 'expo-secure-store';
import { addLogEntry } from '../utils/history';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('history utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debe compactar el historial antes de guardarlo en SecureStore', async () => {
    const existingHistory = Array.from({ length: 50 }, (_, index) => ({
      timestamp: `2026-06-03T19:${String(index).padStart(2, '0')}:00.000Z`,
      command_type: 'MOVE',
      details: 'vx=0.45, vy=0.45, vyaw=1.2, error=Network Error '.repeat(5),
      success: false,
    }));

    SecureStore.getItemAsync
      .mockResolvedValueOnce('operator')
      .mockResolvedValueOnce(JSON.stringify(existingHistory));

    await addLogEntry('STOP', 'error=Network Error '.repeat(20), false);

    const [, savedValue] = SecureStore.setItemAsync.mock.calls[0];
    const savedHistory = JSON.parse(savedValue);

    expect(savedValue.length).toBeLessThanOrEqual(1900);
    expect(savedHistory.length).toBeLessThanOrEqual(20);
    expect(savedHistory[0].details.length).toBeLessThanOrEqual(120);
  });
});
