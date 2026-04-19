import { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, DMSans_700Bold, DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
} from '../lib/notifications';
import LoadingScreen from '../components/LoadingScreen';

// Keep the native splash visible until our JS loading screen is ready to show
SplashScreen.preventAutoHideAsync();

function useAuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const { session, memberType, isLoading } = useStore();

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    // upgrade-success is the deep-link landing page after Stripe checkout /
    // portal / cancel. It has its own useEffect that replaces to settings once
    // the location row is refreshed. If the guard intercepts first it bounces
    // the user to the manager home instead of settings.
    const inPostSubscription = segments[0] === 'upgrade-success';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/');
      return;
    }

    if (memberType === 'manager') {
      if (!inOnboarding && !inPostSubscription && segments[0] !== '(manager)') {
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
  useFonts({ DMSans_700Bold, DMSans_800ExtraBold });

  const { setSession, setProfile, setActiveLocation, setAllLocations, setMemberType, setIsLoading, reset, isLoading } =
    useStore();
  const bootstrapping = useRef(false);
  const hasBootstrapped = useRef(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  function report(progress: number) {
    setLoadingProgress(progress);
  }

  function fadeOutLoader() {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }

  useEffect(() => {
    // Bootstrap from persisted session on launch — runs once
    report(5);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        bootstrapUser(session.user.id);
      } else {
        setIsLoading(false);
        fadeOutLoader();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // TOKEN_REFRESHED and INITIAL_SESSION must not re-trigger bootstrap
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          if (session) setSession(session);
          return;
        }

        if (event === 'SIGNED_IN' && session) {
          setSession(session);
          // Only bootstrap if not already running or completed (getSession may have done it)
          if (!bootstrapping.current && !hasBootstrapped.current) {
            await bootstrapUser(session.user.id);
          }
        }

        if (event === 'SIGNED_OUT') {
          hasBootstrapped.current = false;
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
    if (bootstrapping.current) return;
    bootstrapping.current = true;
    setIsLoading(true);

    hasBootstrapped.current = false;
    try {
      report(20);
      const { data: profile } = await supabase
        .schema('truvex').from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        setProfile(profile);
        // Register for push notifications in the background — must not block bootstrap
        // getExpoPushTokenAsync can hang on Android if Play Services are unavailable
        registerForPushNotifications()
          .then((token) => {
            if (token && token !== (profile as any).expo_push_token) {
              savePushToken(userId, token);
            }
          })
          .catch((err) => console.warn('Push registration failed:', err));
      }

      report(50);
      const { data: managedLocations } = await supabase
        .schema('truvex').from('locations')
        .select('*')
        .eq('manager_id', userId)
        .order('created_at', { ascending: false });

      if (managedLocations && managedLocations.length > 0) {
        setAllLocations(managedLocations);
        setActiveLocation(managedLocations[0]);
        setMemberType('manager');
        report(100);
        return;
      }

      report(70);
      // RLS hides rows with user_id IS NULL from workers, so the claim has
      // to run as a SECURITY DEFINER RPC rather than a client-side update.
      if (profile) {
        await supabase.schema('truvex').rpc('claim_pending_invites');
      }

      report(90);
      const { data: membership } = await supabase
        .schema('truvex').from('location_members')
        .select('*, location:locations(*)')
        .eq('user_id', userId)
        .eq('member_type', 'worker')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (membership) {
        setActiveLocation((membership as any).location);
        setMemberType('worker');
      }

      report(100);
    } finally {
      bootstrapping.current = false;
      hasBootstrapped.current = true;
      setIsLoading(false);
      fadeOutLoader();
    }
  }

  useAuthGuard();

  return (
    <View style={styles.root}>
      {/* Stack always rendered so screens are ready when the loader fades out */}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f0f1a' },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(worker)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="no-location" />
      </Stack>

      {/* Loading overlay — stays in the tree but becomes non-interactive after fade */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}
        pointerEvents={isLoading ? 'auto' : 'none'}
      >
        <LoadingScreen
          progress={loadingProgress}
          onReady={() => SplashScreen.hideAsync()}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f1a' },
});
