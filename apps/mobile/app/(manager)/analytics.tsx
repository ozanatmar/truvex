import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://truvex-web.vercel.app';

interface WorkerStat {
  name: string;
  accepted: number;
  declined: number;
}

interface RoleStat {
  name: string;
  count: number;
}

interface Stats {
  totalCallouts: number;
  filledCallouts: number;
  avgResponseMin: number | null;
  workerStats: WorkerStat[];
  roleStats: RoleStat[];
  dayOfWeekCounts: number[];
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsScreen() {
  const { activeLocation, profile } = useStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const tier = (activeLocation as any)?.subscription_tier ?? 'free';
  const isGated = tier !== 'business';

  const fetchStats = useCallback(async () => {
    if (!activeLocation || isGated) {
      setLoading(false);
      return;
    }

    // Fetch all callouts for this location (last 90 days)
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: callouts } = await supabase
      .schema('truvex').from('callouts')
      .select('id, status, shift_date, role_id, first_accepted_at, created_at, role:roles(name)')
      .eq('location_id', activeLocation.id)
      .gte('created_at', since);

    if (!callouts) { setLoading(false); return; }

    const total = callouts.length;
    const filled = callouts.filter((c: any) => c.status === 'filled').length;

    // Avg minutes to first response
    const responseTimes = callouts
      .filter((c: any) => c.first_accepted_at)
      .map((c: any) => (new Date(c.first_accepted_at).getTime() - new Date(c.created_at).getTime()) / 60000);
    const avgResponse = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : null;

    // Day-of-week distribution
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    callouts.forEach((c: any) => {
      const dow = new Date(c.shift_date).getDay();
      dowCounts[dow]++;
    });

    // Role breakdown
    const roleMap: Record<string, { name: string; count: number }> = {};
    callouts.forEach((c: any) => {
      const name = (c as any).role?.name ?? 'Unknown';
      if (!roleMap[c.role_id]) roleMap[c.role_id] = { name, count: 0 };
      roleMap[c.role_id].count++;
    });
    const roleStats = Object.values(roleMap).sort((a, b) => b.count - a.count);

    // Worker response stats
    const calloutIds = callouts.map((c: any) => c.id);
    let workerStats: WorkerStat[] = [];
    if (calloutIds.length > 0) {
      const { data: responses } = await supabase
        .schema('truvex').from('callout_responses')
        .select('worker_id, response, worker:profiles(name, phone)')
        .in('callout_id', calloutIds);

      if (responses) {
        const wMap: Record<string, WorkerStat> = {};
        responses.forEach((r: any) => {
          const label = r.worker?.name ?? r.worker?.phone ?? r.worker_id;
          if (!wMap[r.worker_id]) wMap[r.worker_id] = { name: label, accepted: 0, declined: 0 };
          if (r.response === 'accepted') wMap[r.worker_id].accepted++;
          else wMap[r.worker_id].declined++;
        });
        workerStats = Object.values(wMap).sort((a, b) => b.accepted - a.accepted);
      }
    }

    setStats({
      totalCallouts: total,
      filledCallouts: filled,
      avgResponseMin: avgResponse,
      workerStats,
      roleStats,
      dayOfWeekCounts: dowCounts,
    });
    setLoading(false);
  }, [activeLocation, isGated]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    fetchStats();
  }, [fetchStats]));

  if (isGated) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </View>
        <View style={styles.gateContainer}>
          <Text style={styles.gateIcon}>📊</Text>
          <Text style={styles.gateTitle}>Business plan feature</Text>
          <Text style={styles.gateBody}>
            Analytics are available on the Business plan. Upgrade to see callout trends, worker response rates, and more.
          </Text>
          <View style={styles.gateBadge}>
            <Text style={styles.gateBadgeText}>Business · $99/mo</Text>
          </View>
          <TouchableOpacity
            style={styles.gateButton}
            onPress={async () => {
              const phone = profile?.phone ?? '';
              const url = `${WEB_URL}/upgrade?location_id=${activeLocation?.id}&tier=business&phone=${encodeURIComponent(phone)}`;
              await WebBrowser.openBrowserAsync(url, {
                toolbarColor: '#0f0f1a',
                controlsColor: '#F5853F',
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
              });
            }}
          >
            <Text style={styles.gateButtonText}>Upgrade to Business →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color="#0E7C7B" />
      </View>
    );
  }

  if (!stats) return null;

  const fillRate = stats.totalCallouts > 0
    ? Math.round((stats.filledCallouts / stats.totalCallouts) * 100)
    : 0;

  const maxDow = Math.max(...stats.dayOfWeekCounts, 1);
  const maxRole = Math.max(...stats.roleStats.map(r => r.count), 1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>Last 90 days</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{stats.totalCallouts}</Text>
            <Text style={styles.summaryLabel}>Callouts</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{fillRate}%</Text>
            <Text style={styles.summaryLabel}>Fill rate</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {stats.avgResponseMin !== null ? `${stats.avgResponseMin}m` : '—'}
            </Text>
            <Text style={styles.summaryLabel}>Avg response</Text>
          </View>
        </View>

        {/* Day of week chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Callouts by day</Text>
          <View style={styles.barChart}>
            {DAYS.map((day, i) => (
              <View key={day} style={styles.barColumn}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      { height: `${Math.round((stats.dayOfWeekCounts[i] / maxDow) * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Role breakdown */}
        {stats.roleStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By role</Text>
            {stats.roleStats.map((r) => (
              <View key={r.name} style={styles.roleRow}>
                <Text style={styles.roleName}>{r.name}</Text>
                <View style={styles.roleTrack}>
                  <View
                    style={[styles.roleBar, { width: `${Math.round((r.count / maxRole) * 100)}%` }]}
                  />
                </View>
                <Text style={styles.roleCount}>{r.count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Worker response table */}
        {stats.workerStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Worker responses</Text>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.tableCell, styles.tableCellName, styles.tableHeaderText]}>Worker</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Accepted</Text>
                <Text style={[styles.tableCell, styles.tableHeaderText]}>Declined</Text>
              </View>
              {stats.workerStats.map((w) => (
                <View key={w.name} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableCellName]} numberOfLines={1}>{w.name}</Text>
                  <Text style={[styles.tableCell, styles.acceptedText]}>{w.accepted}</Text>
                  <Text style={[styles.tableCell, styles.declinedText]}>{w.declined}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#1a1a2e',
  },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: '#7A8899', marginTop: 2 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  // Gate
  gateContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  gateIcon: { fontSize: 52 },
  gateTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center' },
  gateBody: { fontSize: 15, color: '#7A8899', textAlign: 'center', lineHeight: 22 },
  gateBadge: {
    backgroundColor: '#10b98122', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6,
  },
  gateBadgeText: { color: '#10b981', fontWeight: '700', fontSize: 13 },
  gateButton: {
    backgroundColor: '#F5853F',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
    alignItems: 'center',
  },
  gateButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Summary
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 4,
  },
  summaryValue: { fontSize: 26, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 11, color: '#7A8899', fontWeight: '600', textTransform: 'uppercase' },

  // Section
  section: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#7A8899', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Day-of-week bar chart
  barChart: { flexDirection: 'row', height: 80, alignItems: 'flex-end', gap: 8 },
  barColumn: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', backgroundColor: '#0E7C7B', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: '#7A8899', fontWeight: '600' },

  // Role bars
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleName: { width: 72, fontSize: 13, color: '#aaa', fontWeight: '600' },
  roleTrack: { flex: 1, height: 8, backgroundColor: '#2a2a40', borderRadius: 4, overflow: 'hidden' },
  roleBar: { height: '100%', backgroundColor: '#0E7C7B', borderRadius: 4 },
  roleCount: { width: 24, fontSize: 13, color: '#7A8899', textAlign: 'right' },

  // Worker table
  table: { gap: 0 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a40' },
  tableHeader: { borderBottomWidth: 1, borderBottomColor: '#2a2a40' },
  tableHeaderText: { color: '#7A8899', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  tableCell: { flex: 1, fontSize: 13, color: '#ccc', textAlign: 'center' },
  tableCellName: { flex: 2, textAlign: 'left', color: '#fff', fontWeight: '600' },
  acceptedText: { color: '#10b981', fontWeight: '700' },
  declinedText: { color: '#ef4444', fontWeight: '700' },
});
