import * as SecureStore from 'expo-secure-store';

export async function addLogEntry(commandType, details, success) {
  try {
    const username = await SecureStore.getItemAsync('identifier');
    if (!username) return;
    const key = `history_${username}`;
    const saved = await SecureStore.getItemAsync(key);
    let list = saved ? JSON.parse(saved) : [];

    const newEntry = {
      timestamp: new Date().toISOString(),
      command_type: commandType,
      details: details || '',
      success: success,
    };

    list.unshift(newEntry);
    if (list.length > 50) {
      list = list.slice(0, 50);
    }
    await SecureStore.setItemAsync(key, JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to add log entry:', e);
  }
}

export async function getHistoryList() {
  try {
    const username = await SecureStore.getItemAsync('identifier');
    if (!username) return [];
    const key = `history_${username}`;
    const saved = await SecureStore.getItemAsync(key);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.warn('Failed to get history list:', e);
    return [];
  }
}
