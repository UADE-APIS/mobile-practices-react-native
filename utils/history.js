import * as SecureStore from 'expo-secure-store';

const MAX_HISTORY_ITEMS = 20;
const MAX_HISTORY_BYTES = 1900;
const MAX_DETAIL_LENGTH = 120;

function trimDetails(details) {
  const value = details || '';
  if (value.length <= MAX_DETAIL_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_DETAIL_LENGTH - 3)}...`;
}

function compactHistory(list) {
  let compacted = list.slice(0, MAX_HISTORY_ITEMS);
  while (JSON.stringify(compacted).length > MAX_HISTORY_BYTES && compacted.length > 1) {
    compacted = compacted.slice(0, -1);
  }
  return compacted;
}

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
      details: trimDetails(details),
      success: success,
    };

    list.unshift(newEntry);
    list = compactHistory(list);
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
