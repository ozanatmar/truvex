import { useEffect, useMemo, useRef } from 'react';
import { Modal, View, Text, Pressable, FlatList, StyleSheet } from 'react-native';

interface Props {
  visible: boolean;
  title: string;
  value: string;
  afterTime?: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}

const INTERVAL_MINUTES = 15;
const ITEM_HEIGHT = 48;

const BASE_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += INTERVAL_MINUTES) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return out;
})();

function formatLabel(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

interface Slot {
  key: string;
  value: string;
  label: string;
  nextDay: boolean;
}

function buildSlots(afterTime?: string): Slot[] {
  if (!afterTime) {
    return BASE_SLOTS.map((v) => ({ key: v, value: v, label: formatLabel(v), nextDay: false }));
  }
  const afterIdx = BASE_SLOTS.indexOf(afterTime);
  if (afterIdx < 0) {
    return BASE_SLOTS.map((v) => ({ key: v, value: v, label: formatLabel(v), nextDay: false }));
  }
  const startPos = afterIdx + 1;
  const out: Slot[] = [];
  for (let i = 0; i < BASE_SLOTS.length; i++) {
    const pos = startPos + i;
    const idx = pos % BASE_SLOTS.length;
    const v = BASE_SLOTS[idx];
    const nextDay = pos >= BASE_SLOTS.length;
    out.push({
      key: `${v}-${nextDay ? 'nd' : 'td'}`,
      value: v,
      label: formatLabel(v),
      nextDay,
    });
  }
  return out;
}

export default function TimePickerSheet({ visible, title, value, afterTime, onSelect, onClose }: Props) {
  const listRef = useRef<FlatList>(null);
  const slots = useMemo(() => buildSlots(afterTime), [afterTime]);

  useEffect(() => {
    if (!visible) return;
    let idx = slots.findIndex((s) => s.value === value);
    if (idx < 0) {
      if (afterTime) {
        idx = 0;
      } else {
        const now = new Date();
        const h = now.getHours();
        const m = Math.floor(now.getMinutes() / INTERVAL_MINUTES) * INTERVAL_MINUTES;
        const target = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        idx = Math.max(0, slots.findIndex((s) => s.value === target));
      }
    }
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: Math.max(0, idx - 2), animated: false });
    }, 60);
    return () => clearTimeout(timer);
  }, [visible, value, afterTime, slots]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <FlatList
            ref={listRef}
            data={slots}
            keyExtractor={(s) => s.key}
            getItemLayout={(_, i) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * i, index: i })}
            initialNumToRender={24}
            windowSize={10}
            renderItem={({ item }) => {
              const selected = item.value === value;
              return (
                <Pressable
                  style={[styles.row, selected && styles.rowSelected]}
                  onPress={() => { onSelect(item.value); onClose(); }}
                >
                  <Text style={[styles.rowText, selected && styles.rowTextSelected]}>
                    {item.label}
                  </Text>
                  {item.nextDay && (
                    <Text style={styles.nextDayBadge}>Next day</Text>
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1a1a2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a40',
  },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  close: { color: '#7A8899', fontSize: 15, fontWeight: '600', minWidth: 50, textAlign: 'right' },
  row: {
    height: ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  rowSelected: { backgroundColor: 'rgba(14,124,123,0.15)' },
  rowText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  rowTextSelected: { color: '#7ECACA', fontWeight: '800' },
  nextDayBadge: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#f59e0b22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    minWidth: 70,
    textAlign: 'center',
  },
});
