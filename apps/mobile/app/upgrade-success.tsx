import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

export default function UpgradeSuccess() {
  const router = useRouter();
  const { session, setActiveLocation, activeLocation } = useStore();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (session && activeLocation) {
        const { data } = await supabase
          .schema('truvex').from('locations')
          .select('*')
          .eq('id', activeLocation.id)
          .single();
        if (!cancelled && data) setActiveLocation(data);
      }
      if (!cancelled) router.replace('/(manager)/settings');
    })();
    return () => { cancelled = true; };
  }, [session, activeLocation, setActiveLocation, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#0E7C7B" />
      <Text style={styles.text}>Finalizing upgrade…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f1a', gap: 12 },
  text: { color: '#7A8899', fontSize: 14 },
});
