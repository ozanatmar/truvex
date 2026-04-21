import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { formatShiftTime, formatShiftDate } from '../lib/utils';
import { getDismissed, markDismissed } from '../lib/shiftResultDismissals';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  tone: 'success' | 'neutral';
}

interface Props {
  role: 'manager' | 'worker';
}

const WINDOW_MS = 24 * 60 * 60 * 1000;

export default function ShiftResultBanners({ role }: Props) {
  const { session, activeLocation } = useStore();
  const [banners, setBanners] = useState<Banner[]>([]);
  const dismissedRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!session) return;
    const dismissed = await getDismissed();
    dismissedRef.current = dismissed;
    const filledSince = Date.now() - WINDOW_MS;
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const isRecent = (c: any): boolean => {
      if (c.status === 'filled') {
        return !!c.assigned_at && new Date(c.assigned_at).getTime() >= filledSince;
      }
      if (c.status === 'cancelled') {
        return c.shift_date >= todayStr;
      }
      return false;
    };

    if (role === 'manager') {
      if (!activeLocation) {
        setBanners([]);
        return;
      }
      const { data: callouts } = await supabase
        .schema('truvex').from('callouts')
        .select('id, role:roles(name), shift_date, start_time, end_time, assigned_worker_id, assigned_by, assigned_at, status, worker:profiles!assigned_worker_id(name, phone)')
        .eq('location_id', activeLocation.id)
        .in('status', ['filled', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(20);

      const recent = (callouts ?? []).filter(isRecent);
      if (recent.length === 0) {
        setBanners([]);
        return;
      }

      const assignedIds = recent
        .map((c: any) => c.assigned_worker_id)
        .filter(Boolean) as string[];

      const invitedNameByUserId = new Map<string, string>();
      if (assignedIds.length > 0) {
        const { data: members } = await supabase
          .schema('truvex').from('location_members')
          .select('user_id, invited_name')
          .eq('location_id', activeLocation.id)
          .in('user_id', assignedIds);
        for (const m of members ?? []) {
          if ((m as any).invited_name) invitedNameByUserId.set((m as any).user_id, (m as any).invited_name);
        }
      }

      const next: Banner[] = recent
        .filter((c: any) => !dismissed.has(c.id))
        .map((c: any) => {
          const roleName = c.role?.name ?? 'shift';
          const dateStr = formatShiftDate(c.shift_date);
          const timeStr = `${formatShiftTime(c.start_time)}–${formatShiftTime(c.end_time)}`;
          if (c.status === 'cancelled') {
            return {
              id: c.id,
              title: 'Shift cancelled',
              subtitle: `${roleName} on ${dateStr}, ${timeStr} was cancelled.`,
              tone: 'neutral' as const,
            };
          }
          const name =
            invitedNameByUserId.get(c.assigned_worker_id) ??
            c.worker?.name ??
            c.worker?.phone ??
            'Worker';
          const title = c.assigned_by === 'auto' ? 'Auto-assigned' : 'Shift covered';
          const subtitle = `${name} is covering ${roleName} on ${dateStr}, ${timeStr}.`;
          return { id: c.id, title, subtitle, tone: 'success' as const };
        });
      setBanners(next);
    } else {
      const { data: responses } = await supabase
        .schema('truvex').from('callout_responses')
        .select('callout_id')
        .eq('worker_id', session.user.id)
        .eq('response', 'accepted');

      const calloutIds = (responses ?? []).map((r: any) => r.callout_id);
      if (calloutIds.length === 0) {
        setBanners([]);
        return;
      }

      const { data: callouts } = await supabase
        .schema('truvex').from('callouts')
        .select('id, role:roles(name), shift_date, start_time, end_time, assigned_worker_id, assigned_at, status, location:locations(name)')
        .in('id', calloutIds)
        .in('status', ['filled', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(20);

      const recent = (callouts ?? []).filter(isRecent);

      const next: Banner[] = recent
        .filter((c: any) => !dismissed.has(c.id))
        .map((c: any) => {
          const roleName = c.role?.name ?? 'shift';
          const dateStr = formatShiftDate(c.shift_date);
          const timeStr = `${formatShiftTime(c.start_time)}–${formatShiftTime(c.end_time)}`;
          const locName = c.location?.name ?? '';
          if (c.status === 'cancelled') {
            return {
              id: c.id,
              title: 'Shift cancelled',
              subtitle: `The ${roleName} shift on ${dateStr} was cancelled${locName ? ` at ${locName}` : ''}.`,
              tone: 'neutral' as const,
            };
          }
          if (c.assigned_worker_id === session.user.id) {
            return {
              id: c.id,
              title: "You're on",
              subtitle: `You're covering ${roleName} on ${dateStr}, ${timeStr}${locName ? ` at ${locName}` : ''}.`,
              tone: 'success' as const,
            };
          }
          return {
            id: c.id,
            title: 'Shift filled',
            subtitle: `The ${roleName} shift on ${dateStr} was filled by someone else.`,
            tone: 'neutral' as const,
          };
        });
      setBanners(next);
    }
  }, [session, activeLocation, role]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`shift-result-banners:${role}:${session.user.id}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'truvex', table: 'callouts' },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, role, load]);

  async function handleDismiss(id: string) {
    setBanners((prev) => prev.filter((b) => b.id !== id));
    dismissedRef.current.add(id);
    await markDismissed(id);
  }

  if (banners.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {banners.map((b) => (
        <View
          key={b.id}
          style={[styles.banner, b.tone === 'success' ? styles.bannerSuccess : styles.bannerNeutral]}
        >
          <View style={styles.icon}>
            <Ionicons
              name={b.tone === 'success' ? 'checkmark-circle' : 'information-circle'}
              size={22}
              color={b.tone === 'success' ? '#10b981' : '#7A8899'}
            />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>{b.title}</Text>
            <Text style={styles.subtitle}>{b.subtitle}</Text>
          </View>
          <Pressable onPress={() => handleDismiss(b.id)} hitSlop={12} style={styles.close}>
            <Ionicons name="close" size={18} color="#7A8899" />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
  },
  bannerSuccess: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
  bannerNeutral: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2a2a40',
  },
  icon: { width: 24, alignItems: 'center' },
  textCol: { flex: 1, gap: 2 },
  title: { color: '#fff', fontSize: 14, fontWeight: '700' },
  subtitle: { color: '#aaa', fontSize: 12, lineHeight: 16 },
  close: { padding: 4 },
});
