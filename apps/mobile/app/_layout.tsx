import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
} from '../lib/notifications';

function useAuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { session, memberType, isLoading } = useStore();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/');
      return;
    }

    if (memberType === 'manager') {
      if (!inOnboarding && segments[0] !== '(manager)') {
        router.replace('/(manager)/');
      }
    } else if (memberType === 'worker') {
      if (segments[0] !== '(worker)') {
        router.replace('/(worker)/');
      }
    } else {
      // Authenticated but no location — could be new manager or orphaned worker
      if (segments[0] !== 'no-location' && !inOnboarding) {
        router.replace('/no-location');
      }
    }
  }, [session, memberType, isLoading, segments]);
}

export default function RootLayout() {
  const { setSession, setProfile, setActiveLocation, setMemberType, setIsLoading, reset } =
    useStore();

  useEffect(() => {
    // Bootstrap session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        bootstrapUser(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session) {
          setSession(session);
          await bootstrapUser(session.user.id);
        } else {
          reset();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const sub = addNotificationResponseListener((response) => {
      const calloutId = response.notification.request.content.data?.callout_id;
      if (calloutId) {
        // Navigation is handled by the router once screens are mounted
      }
    });
    return () => sub.remove();
  }, []);

  async function bootstrapUser(userId: string) {
    setIsLoading(true);

    // Load profile
    const { data: profile } = await supabase
      .from('truvex.profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      setProfile(profile);

      // Register push token
      const token = await registerForPushNotifications();
      if (token && token !== profile.expo_push_token) {
        await savePushToken(userId, token);
      }
    }

    // Determine role: check if user manages a location
    const { data: managedLocation } = await supabase
      .from('truvex.locations')
      .select('*')
      .eq('manager_id', userId)
      .single();

    if (managedLocation) {
      setActiveLocation(managedLocation);
      setMemberType('manager');
      setIsLoading(false);
      return;
    }

    // Check if worker member
    const { data: membership } = await supabase
      .from('truvex.location_members')
      .select('*, location:truvex.locations(*)')
      .eq('user_id', userId)
      .eq('member_type', 'worker')
      .eq('status', 'active')
      .limit(1)
      .single();

    if (membership) {
      setActiveLocation(membership.location);
      setMemberType('worker');
    }

    setIsLoading(false);
  }

  useAuthGuard();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(manager)" />
      <Stack.Screen name="(worker)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="no-location" />
    </Stack>
  );
}
