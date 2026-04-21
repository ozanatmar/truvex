import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { Callout, Role, Location } from '../../types/database';
import { formatShiftTime, formatShiftDate } from '../../lib/utils';
import ShiftResultBanners from '../../components/ShiftResultBanners';

interface CalloutCard extends Callout {
  role: Role;
  location: Location;
  myResponse?: 'accepted' | 'declined';
}

export default function WorkerHomeScreen() {
  const { session, activeLocation } = useStore();
  const [callouts, setCallouts] = useState<CalloutCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchCallouts = useCallback(async () => {
    if (!session) return;

    // Get all active memberships for this user
    const { data: memberships } = await supabase
      .schema('truvex').from('location_members')
      .select('location_id')
      .eq('user_id', session.user.id)
      .eq('member_type', 'worker')
      .eq('status', 'active');

    if (!memberships || memberships.length === 0) {
      setCallouts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const locationIds = memberships.map((m: any) => m.location_id);

    // Get worker's roles across all locations
    const { data: workerRoles } = await supabase
      .schema('truvex').from('worker_roles')
      .select('role_id, location_id')
      .eq('user_id', session.user.id);

    const eligibleRoleIds = workerRoles?.map((wr: any) => wr.role_id) ?? [];

    // Get open callouts for eligible roles
    const { data: rawCallouts } = await supabase
      .schema('truvex').from('callouts')
      .select('*, role:roles(*), location:locations(*)')
      .in('location_id', locationIds)
      .in('status', ['open', 'pending_selection'])
      .or(`role_id.in.(${eligibleRoleIds.join(',')}),open_to_all_roles.eq.true`)
      .order('created_at', { ascending: false });

    if (!rawCallouts) {
      setCallouts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // Get my responses
    const calloutIds = rawCallouts.map((c: any) => c.id);
    const { data: myResponses } = await supabase
      .schema('truvex').from('callout_responses')
      .select('callout_id, response')
      .eq('worker_id', session.user.id)
      .in('callout_id', calloutIds);

    const responseMap = new Map(
      (myResponses ?? []).map((r: any) => [r.callout_id, r.response])
    );

    setCallouts(
      rawCallouts.map((c: any) => ({
        ...c,
        myResponse: responseMap.get(c.id),
      }))
    );
    setLoading(false);
    setRefreshing(false);
  }, [session]);

  useEffect(() => {
    fetchCallouts();

    if (!session) return;

    const channel = supabase
      .channel(`worker-callouts:${session.user.id}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'truvex', table: 'callouts' },
        () => fetchCallouts()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, fetchCallouts]);

  async function handleResponse(calloutId: string, response: 'accepted' | 'declined') {
    if (!session) return;
    setResponding(calloutId);

    const { error } = await supabase.schema('truvex').from('callout_responses').upsert({
      callout_id: calloutId,
      worker_id: session.user.id,
      response,
      responded_at: new Date().toISOString(),
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // If this is an acceptance, check if first acceptor and update callout
      if (response === 'accepted') {
        const callout = callouts.find((c) => c.id === calloutId);
        if (callout && !callout.first_accepted_at) {
          await supabase
            .schema('truvex').from('callouts')
            .update({
              first_accepted_at: new Date().toISOString(),
              auto_assign_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              status: 'pending_selection',
            })
            .eq('id', calloutId)
            .is('first_accepted_at', null);
        }
      }
      await fetchCallouts();
    }

    setResponding(null);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0E7C7B" />
      </View>
    );
  }

  const visibleCallouts = callouts.filter((c) => c.myResponse !== 'declined');

  const groups = (() => {
    const byLoc = new Map<string, { name: string; items: CalloutCard[] }>();
    for (const c of visibleCallouts) {
      const key = c.location.id;
      const existing = byLoc.get(key);
      if (existing) existing.items.push(c);
      else byLoc.set(key, { name: c.location.name, items: [c] });
    }
    return Array.from(byLoc.entries()).map(([id, g]) => ({ id, ...g }));
  })();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Open Shifts</Text>
      </View>

      <ShiftResultBanners role="worker" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchCallouts(); }}
            tintColor="#0E7C7B"
          />
        }
      >
        {visibleCallouts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No open shifts</Text>
            <Text style={styles.emptySubtitle}>
              You'll be notified when a shift matching your role is posted.
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupHeader}>{group.name}</Text>
              {group.items.map((callout) => (
                <View key={callout.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.roleName}>{callout.role.name}</Text>
                  </View>

                  <Text style={styles.date}>{formatShiftDate(callout.shift_date)}</Text>
                  <Text style={styles.time}>
                    {formatShiftTime(callout.start_time)} – {formatShiftTime(callout.end_time)}
                  </Text>

                  {callout.notes ? (
                    <Text style={styles.notes}>{callout.notes}</Text>
                  ) : null}

                  {callout.myResponse === 'accepted' ? (
                    <View style={styles.acceptedBanner}>
                      <Text style={styles.acceptedText}>
                        You accepted — waiting for manager to confirm
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={[styles.acceptButton, responding === callout.id && styles.actionDisabled]}
                        onPress={() => handleResponse(callout.id, 'accepted')}
                        disabled={responding !== null}
                      >
                        {responding === callout.id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.acceptText}>Accept</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.declineButton, responding === callout.id && styles.actionDisabled]}
                        onPress={() => handleResponse(callout.id, 'declined')}
                        disabled={responding !== null}
                      >
                        <Text style={styles.declineText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f0f1a' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 20 },
  group: { gap: 10 },
  groupHeader: { color: '#7ECACA', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#fff', minWidth: 180, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20, alignSelf: 'stretch' },
  card: { backgroundColor: '#1a1a2e', borderRadius: 18, padding: 16, gap: 6 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  roleName: { fontSize: 18, fontWeight: '800', color: '#fff', flexShrink: 0, minWidth: 120 },
  locationName: { fontSize: 12, color: '#666', textAlign: 'right', flex: 1, marginLeft: 8 },
  date: { fontSize: 14, color: '#aaa' },
  time: { fontSize: 15, color: '#ccc', fontWeight: '600' },
  notes: { fontSize: 13, color: '#666', fontStyle: 'italic' },
  acceptedBanner: {
    backgroundColor: '#10b98122',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  acceptedText: { color: '#10b981', fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  acceptButton: {
    flex: 1,
    backgroundColor: '#F5853F',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#2a2a40',
    borderRadius: 10,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionDisabled: { opacity: 0.5 },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 15, minWidth: 80, textAlign: 'center' },
  declineText: { color: '#aaa', fontWeight: '600', fontSize: 15, minWidth: 80, textAlign: 'center' },
});
