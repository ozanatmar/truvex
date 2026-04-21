import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'truvex:shiftResultDismissals:v1';

export async function getDismissed(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export async function markDismissed(id: string): Promise<void> {
  try {
    const cur = await getDismissed();
    cur.add(id);
    await AsyncStorage.setItem(KEY, JSON.stringify([...cur]));
  } catch {
    // swallow — dismissal is best-effort
  }
}
