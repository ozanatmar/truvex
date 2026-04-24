import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  console.log(`[push register] start platform=${Platform.OS} isDevice=${Device.isDevice} appOwnership=${Constants.appOwnership}`);

  if (!Device.isDevice) {
    console.warn('[push register] abort — not a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  console.log(`[push register] permission existing=${existingStatus}`);

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    console.log(`[push register] permission requested → ${status}`);
  }

  if (finalStatus !== 'granted') {
    console.warn(`[push register] abort — permission=${finalStatus}`);
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1a1a2e',
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    console.warn('[push register] abort — no EAS project ID in Constants.expoConfig.extra.eas.projectId or Constants.easConfig.projectId');
    return null;
  }
  console.log(`[push register] projectId=${projectId}`);

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const tail = tokenData.data.slice(-10);
    console.log(`[push register] got token …${tail}`);
    return tokenData.data;
  } catch (err) {
    console.error('[push register] getExpoPushTokenAsync threw:', err);
    return null;
  }
}

export async function savePushToken(userId: string, token: string) {
  // A push token represents a single device. If the same device was previously
  // signed in as another user, that profile still holds this token and would
  // receive duplicate pushes whenever both users are eligible recipients.
  // Clear it from any other profile before claiming it for the current user.
  const tail = token.slice(-10);
  console.log(`[push save] user=${userId} token=…${tail} — clearing stale holders`);
  const { error: clearError } = await supabase
    .schema('truvex').from('profiles')
    .update({ expo_push_token: null })
    .eq('expo_push_token', token)
    .neq('id', userId);
  if (clearError) console.error('[push save] failed to clear stale push tokens:', clearError.message);

  const { error } = await supabase
    .schema('truvex').from('profiles')
    .update({ expo_push_token: token })
    .eq('id', userId);

  if (error) {
    console.error('[push save] failed to save push token:', error.message);
  } else {
    console.log(`[push save] ok user=${userId} token=…${tail}`);
  }
}

export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

export function getLastNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}

export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(handler);
}
