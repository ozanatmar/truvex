import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { formatShiftTime, formatShiftDate } from '../lib/utils';
import ShiftCoveredSheet from './ShiftCoveredSheet';

interface Celebration {
  title: string;
  subtitle: string;
}

export default function WorkerShiftListener() {
  const { session } = useStore();
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session) return;
    const userId = session.user.id;

    const channel = supabase
      .channel(`worker-shift-listener:${userId}:${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'truvex', table: 'callouts' },
        async (payload: any) => {
          const prev = payload.old ?? {};
          const next = payload.new ?? {};
          if (next.status !== 'filled' || prev.status === 'filled') return;
          if (seen.current.has(next.id)) return;

          const { data: resp } = await supabase
            .schema('truvex').from('callout_responses')
            .select('response')
            .eq('callout_id', next.id)
            .eq('worker_id', userId)
            .eq('response', 'accepted')
            .maybeSingle();
          if (!resp) return;

          seen.current.add(next.id);

          const { data: c } = await supabase
            .schema('truvex').from('callouts')
            .select('role:roles(name), start_time, end_time, shift_date')
            .eq('id', next.id)
            .maybeSingle();
          const role = (c as any)?.role?.name ?? 'shift';
          const date = (c as any)?.shift_date ? formatShiftDate((c as any).shift_date) : '';
          const start = (c as any)?.start_time ? formatShiftTime((c as any).start_time) : '';
          const end = (c as any)?.end_time ? formatShiftTime((c as any).end_time) : '';

          if (next.assigned_worker_id === userId) {
            setCelebration({
              title: "You're On",
              subtitle: `Get ready — you're covering ${role} on ${date} from ${start} to ${end}.`,
            });
          } else {
            setBanner(`The ${role} shift has been filled by someone else.`);
            if (bannerTimer.current) clearTimeout(bannerTimer.current);
            bannerTimer.current = setTimeout(() => setBanner(null), 6000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [session]);

  return (
    <>
      {celebration && (
        <ShiftCoveredSheet
          visible
          title={celebration.title}
          subtitle={celebration.subtitle}
          onClose={() => setCelebration(null)}
        />
      )}
      {banner && (
        <View style={styles.bannerWrap} pointerEvents="box-none">
          <Pressable style={styles.banner} onPress={() => setBanner(null)}>
            <Text style={styles.bannerText}>{banner}</Text>
            <Text style={styles.bannerHint}>Tap to dismiss</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 999,
  },
  banner: {
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#F5853F',
  },
  bannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  bannerHint: {
    color: '#666',
    fontSize: 11,
    marginTop: 4,
  },
});
