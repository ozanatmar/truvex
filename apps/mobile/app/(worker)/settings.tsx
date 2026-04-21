import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { formatPhoneDisplay } from '../../lib/utils';
import TutorialModal from '../../components/TutorialModal';

export default function WorkerSettingsScreen() {
  const { session, profile, activeLocation, setActiveLocation, setMemberType, reset } = useStore();
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session) return;

    const { data } = await supabase.schema('truvex').from('location_members')
      .select('*, location:locations(*)')
      .eq('user_id', session.user.id)
      .eq('member_type', 'worker')
      .eq('status', 'active');

    if (data) setMemberships(data);
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  async function handleToggleMute(membershipId: string, value: boolean) {
    if (!session) return;
    setTogglingId(membershipId);
    const { error } = await supabase.schema('truvex').from('location_members')
      .update({ is_muted: value })
      .eq('id', membershipId);
    if (!error) {
      setMemberships(memberships.map((m: any) => m.id === membershipId ? { ...m, is_muted: value } : m));
    }
    setTogglingId(null);
  }

  function confirmLeave(locationId: string, locationName: string) {
    Alert.alert(
      `Leave ${locationName}?`,
      'You will lose access to all shifts at this location.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Are you sure?',
              'This cannot be undone. The manager will need to re-invite you.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Leave location',
                  style: 'destructive',
                  onPress: () => handleLeave(locationId),
                },
              ]
            ),
        },
      ]
    );
  }

  async function handleLeave(locationId: string) {
    if (!session) return;
    await supabase.schema('truvex').from('location_members')
      .delete()
      .eq('user_id', session.user.id)
      .eq('location_id', locationId);
    await supabase.schema('truvex').from('worker_roles')
      .delete()
      .eq('user_id', session.user.id)
      .eq('location_id', locationId);

    const remaining = memberships.filter((m: any) => m.location_id !== locationId);
    setMemberships(remaining);

    if (activeLocation?.id === locationId) {
      if (remaining.length > 0) {
        setActiveLocation(remaining[0].location);
      } else {
        setActiveLocation(null);
        setMemberType(null);
      }
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    reset();
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Account */}
        {profile && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Phone</Text>
                <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="tail">{formatPhoneDisplay((profile as any).phone)}</Text>
              </View>
              {(profile as any).name && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <Text style={styles.rowLabel}>Name</Text>
                    <Text style={styles.rowValue} numberOfLines={1} ellipsizeMode="tail">{(profile as any).name}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        )}

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            {loading ? (
              <View style={styles.row}>
                <ActivityIndicator color="#0E7C7B" />
              </View>
            ) : memberships.length === 0 ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>No locations</Text>
              </View>
            ) : (
              memberships.map((m: any, i: number) => (
                <View key={m.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.settingRow}>
                    <View style={styles.settingTextWrap}>
                      <Text style={styles.settingTitle} numberOfLines={1} ellipsizeMode="tail">
                        Mute {m.location?.name}
                      </Text>
                      <Text style={styles.settingSubtitle}>
                        Stop push and SMS alerts
                      </Text>
                    </View>
                    {togglingId === m.id ? (
                      <ActivityIndicator color="#0E7C7B" />
                    ) : (
                      <Switch
                        value={m.is_muted}
                        onValueChange={(v) => handleToggleMute(m.id, v)}
                        trackColor={{ false: '#333', true: '#0E7C7B' }}
                        thumbColor="#fff"
                      />
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Locations */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>MY LOCATIONS</Text>
          <View style={styles.card}>
            {memberships.length === 0 ? (
              <View style={styles.row}>
                <Text style={styles.rowLabel}>No locations</Text>
              </View>
            ) : (
              memberships.map((m: any, i: number) => (
                <View key={m.id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.locationRow}>
                    <View style={styles.locationInfo}>
                      <Text style={styles.locationName} numberOfLines={1} ellipsizeMode="tail">{m.location?.name}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmLeave(m.location_id, m.location?.name)}
                    >
                      <Text style={styles.leaveText}>Leave</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Help */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>HELP</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setShowTutorial(true)}>
              <Text style={styles.rowLabel}>Show app tutorial</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      <TutorialModal visible={showTutorial} role="worker" onClose={() => setShowTutorial(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  content: { paddingBottom: 48 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#1a1a2e' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  section: { padding: 20, paddingBottom: 0, gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#555', letterSpacing: 1 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 18, paddingHorizontal: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  divider: { height: 1, backgroundColor: '#2a2a40' },
  rowLabel: { fontSize: 15, color: '#aaa', flexShrink: 0, minWidth: 130 },
  rowValue: { fontSize: 15, color: '#fff', fontWeight: '600', flex: 1, textAlign: 'right', marginLeft: 16 },
  chevron: { fontSize: 20, color: '#555' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 14 },
  settingTextWrap: { flex: 1 },
  settingTitle: { fontSize: 15, color: '#fff', fontWeight: '600' },
  settingSubtitle: { fontSize: 12, color: '#666', marginTop: 4 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, gap: 12 },
  locationInfo: { flex: 1 },
  locationName: { fontSize: 15, color: '#fff', fontWeight: '600' },
  activeLabel: { fontSize: 11, color: '#0E7C7B', fontWeight: '700', marginTop: 2, minWidth: 60 },
  leaveText: { color: '#ef4444', fontSize: 14, fontWeight: '600', minWidth: 60, textAlign: 'right' },
  signOutButton: { margin: 20, alignItems: 'center', paddingVertical: 14 },
  signOutText: { color: '#ef4444', fontSize: 15, fontWeight: '600', minWidth: 80, textAlign: 'center' },
});
