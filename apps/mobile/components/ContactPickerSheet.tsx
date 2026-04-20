import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Contacts from 'expo-contacts';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (args: { name: string; digits: string }) => void;
}

interface Row {
  id: string;
  name: string;
  formattedPhone: string;
  digits: string;
}

// Truvex is US-only. Accept 10-digit numbers or 11-digit numbers starting
// with 1; reject anything else so workers can't be added with a number the
// rest of the system (Twilio, E.164 storage) can't use.
function toUSDigits(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return d;
  if (d.length === 11 && d.startsWith('1')) return d.slice(1);
  return null;
}

function formatUSPhone(digits: string): string {
  if (digits.length !== 10) return digits;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function ContactPickerSheet({ visible, onClose, onSelect }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setLoading(true);
    setError(null);
    (async () => {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Contacts access is blocked. Enable it for Truvex in your phone Settings.');
        setLoading(false);
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.FirstName,
          Contacts.Fields.LastName,
          Contacts.Fields.PhoneNumbers,
        ],
        sort: Contacts.SortTypes.FirstName,
      });

      // Flatten contacts into one row per US-valid phone — a single contact
      // with both a cell and a work number should appear twice so the
      // manager picks the right line.
      const flat: Row[] = [];
      for (const c of data) {
        if (!c.phoneNumbers?.length) continue;
        const composed = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
        const displayName = (c.name?.trim() || composed).trim();
        if (!displayName) continue;

        const seen = new Set<string>();
        for (const pn of c.phoneNumbers) {
          const raw = pn.number ?? (pn as any).digits ?? '';
          const digits = toUSDigits(raw);
          if (!digits || seen.has(digits)) continue;
          seen.add(digits);
          flat.push({
            id: `${c.id}-${digits}`,
            name: displayName,
            digits,
            formattedPhone: formatUSPhone(digits),
          });
        }
      }
      setRows(flat);
      setLoading(false);
    })();
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    const qDigits = q.replace(/\D/g, '');
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || (qDigits && r.digits.includes(qDigits)),
    );
  }, [rows, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Import from Contacts</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or number"
          placeholderTextColor="#555"
          autoCorrect={false}
          autoCapitalize="words"
        />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#0E7C7B" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {rows.length === 0
                ? 'No contacts with a US phone number.'
                : 'No matches.'}
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {filtered.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.row}
                onPress={() => {
                  onSelect({ name: r.name, digits: r.digits });
                  onClose();
                }}
              >
                <Text style={styles.rowName}>{r.name}</Text>
                <Text style={styles.rowPhone}>{r.formattedPhone}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a40',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#fff' },
  closeText: { color: '#0E7C7B', fontSize: 16, fontWeight: '700' },
  search: {
    backgroundColor: '#2a2a40',
    borderRadius: 12,
    height: 44,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 15,
  },
  list: { flex: 1, marginTop: 12 },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
    gap: 2,
  },
  rowName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rowPhone: { color: '#7A8899', fontSize: 13 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyText: { color: '#7A8899', fontSize: 14, textAlign: 'center' },
});
