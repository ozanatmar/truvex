import { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useFonts, DMSans_700Bold, DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationResponseListener,
  addNotificationReceivedListener,
  getLastNotificationResponse,
} from '../lib/notifications';
import LoadingScreen from '../components/LoadingScreen';

// Keep the native splash visible until our JS loading screen is ready to show
SplashScreen.preventAutoHideAsync();

// Paint the native window so screen-swap animations never reveal white.
SystemUI.setBackgroundColorAsync('#0f0f1a').catch(() => {});

function useAuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const { session, memberType, isLoading } = useStore();

  useEffect(() => {
    // Wait for the root navigator to commit its first layout before navigating.
    // Without this, router.replace can fire against an unmounted root and throw
    // "Attempted to navigate before mounting the Root Layout component".
    if (!navState?.key) return;
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
  }, [session, memberType, isLoading, segments, navState?.key]);
}

export default function RootLayout() {
  useFonts({ DMSans_700Bold, DMSans_800ExtraBold });

  const {
    setSession, setProfile, setActiveLocation, setAllLocations, setMemberType, setIsLoading, reset,
    isLoading, memberType, allLocations,
  } = useStore();
  const router = useRouter();
  const navState = useRootNavigationState();
  const bootstrapping = useRef(false);
  const hasBootstrapped = useRef(false);
  const pendingCalloutId = useRef<string | null>(null);
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
    // Log every push that lands on the device (foreground + background wake-ups)
    // so we can correlate against server-side [push] logs and spot duplicate deliveries.
    const receivedSub = addNotificationReceivedListener((n) => {
      const reqId = n.request.identifier;
      const type = n.request.content.data?.type;
      const cid = n.request.content.data?.callout_id;
      console.log(`[notif received] reqId=${reqId} type=${type} callout=${cid}`);
    });
    // Warm tap — app already running
    const responseSub = addNotificationResponseListener((response) => {
      const reqId = response.notification.request.identifier;
      const cid = response.notification.request.content.data?.callout_id;
      console.log(`[notif tapped] reqId=${reqId} callout=${cid}`);
      if (cid) pendingCalloutId.current = String(cid);
    });
    // Cold start — app launched by tapping a notification
    getLastNotificationResponse().then((resp) => {
      const cid = resp?.notification.request.content.data?.callout_id;
      const reqId = resp?.notification.request.identifier;
      if (reqId) console.log(`[notif cold-start tap] reqId=${reqId} callout=${cid}`);
      if (cid && !pendingCalloutId.current) pendingCalloutId.current = String(cid);
    });
    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  // Consume pending callout tap once navigator + bootstrap are ready.
  // Switches activeLocation to the callout's location so multi-location managers
  // land on the correct callout detail instead of whichever location was last active.
  useEffect(() => {
    if (!navState?.key || isLoading || !memberType) return;
    const calloutId = pendingCalloutId.current;
    if (!calloutId) return;
    pendingCalloutId.current = null;

    (async () => {
      const { data: callout } = await supabase
        .schema('truvex').from('callouts')
        .select('id, location_id')
        .eq('id', calloutId)
        .maybeSingle();
      if (!callout) return;

      if (memberType === 'manager') {
        const loc = allLocations.find((l) => l.id === callout.location_id);
        if (loc) setActiveLocation(loc);
        router.push(`/(manager)/callout/${calloutId}`);
      } else if (memberType === 'worker') {
        router.push('/(worker)/');
      }
    })();
  }, [navState?.key, isLoading, memberType, allLocations, router, setActiveLocation]);

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
          animation: Platform.OS === 'android' ? 'fade' : 'default',
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
