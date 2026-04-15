import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { formatPhoneDisplay } from '../../lib/utils';

export default function WorkerSettingsScreen() {
  const { session, profile, activeLocation, reset } = useStore();
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!session || !activeLocation) return;

    supabase
      .from('truvex.location_members')
      .select('is_muted')
      .eq('user_id', session.user.id)
      .eq('location_id', activeLocation.id)
      .single()
      .then(({ data }) => {
        if (data) setIsMuted(data.is_muted);
        setLoading(false);
      });
  }, [session, activeLocation]);

  async function handleToggleMute(value: boolean) {
    if (!session || !activeLocation) return;
    setToggling(true);

    const { error } = await supabase
      .from('truvex.location_members')
      .update({ is_muted: value })
      .eq('user_id', session.user.id)
      .eq('location_id', activeLocation.id);

    if (!error) setIsMuted(value);
    setToggling(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    reset();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.content}>
        {profile && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Phone</Text>
              <Text style={styles.rowValue}>{formatPhoneDisplay(profile.phone)}</Text>
            </View>
            {profile.name && (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Name</Text>
                <Text style={styles.rowValue}>{profile.name}</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>Notifications</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingTitle}>Mute notifications</Text>
              <Text style={styles.settingSubtitle}>
                Stop receiving push and SMS alerts for {activeLocation?.name}
              </Text>
            </View>
            {loading || toggling ? (
              <ActivityIndicator color="#4f46e5" />
            ) : (
              <Switch
                value={isMuted}
                onValueChange={handleToggleMute}
                trackColor={{ false: '#333', true: '#4f46e5' }}
                thumbColor="#fff"
              />
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  content: { padding: 20, gap: 16 },
  profileSection: { gap: 10, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2a2a40' },
  rowLabel: { fontSize: 15, color: '#aaa' },
  rowValue: { fontSize: 15, color: '#fff', fontWeight: '600' },
  settingCard: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  settingTitle: { fontSize: 15, color: '#fff', fontWeight: '600' },
  settingSubtitle: { fontSize: 12, color: '#666', marginTop: 4, flex: 1 },
  signOutButton: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 14,
  },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
