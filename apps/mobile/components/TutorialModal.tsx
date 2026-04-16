import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Role = 'manager' | 'worker';

interface Slide {
  title: string;
  body: string;
  icon: string;
}

const MANAGER_SLIDES: Slide[] = [
  {
    icon: '📋',
    title: 'Post a callout in seconds',
    body: 'When a worker calls in sick, tap "+ Post Callout" on the home screen. Pick the role, date, and shift time — that\'s it.',
  },
  {
    icon: '🔔',
    title: 'Workers get notified instantly',
    body: 'On paid plans, eligible workers receive a push notification and an SMS fallback 2 minutes later if they haven\'t opened it.',
  },
  {
    icon: '✅',
    title: 'Pick who covers',
    body: 'Workers can accept from their phone. You\'ll see everyone who accepted — tap a name to confirm who covers the shift.',
  },
  {
    icon: '⏱️',
    title: 'Auto-assign if you\'re busy',
    body: 'If you don\'t select anyone within 30 minutes, the first worker who accepted is automatically assigned. You\'ll be notified.',
  },
  {
    icon: '👥',
    title: 'Manage your team',
    body: 'Add workers from the Team tab. Enter their phone number and role — they\'ll be linked to your location when they first log in.',
  },
  {
    icon: '⚙️',
    title: 'Upgrade when you\'re ready',
    body: 'You have a 14-day free trial with full notifications. After that, upgrade in Settings to keep push & SMS alerts running.',
  },
];

const WORKER_SLIDES: Slide[] = [
  {
    icon: '📱',
    title: 'Open shifts come to you',
    body: 'When your manager posts a callout for your role, you\'ll get a push notification (and an SMS if you don\'t open it quickly).',
  },
  {
    icon: '✅',
    title: 'Accept with one tap',
    body: 'See an open shift on your home screen? Tap "Accept" to let your manager know you\'re available. You can also decline.',
  },
  {
    icon: '⏳',
    title: 'Wait for confirmation',
    body: 'After you accept, your manager reviews everyone who responded and picks who covers. You\'ll get a notification when confirmed.',
  },
  {
    icon: '📍',
    title: 'Multiple locations',
    body: 'You can be part of more than one restaurant. All your open shifts appear on the home screen, grouped by location.',
  },
  {
    icon: '🔕',
    title: 'Mute notifications',
    body: 'Going on vacation? Head to Settings and mute notifications for a specific location. You won\'t be notified for new callouts there.',
  },
];

interface Props {
  visible: boolean;
  role: Role;
  onClose: () => void;
}

export default function TutorialModal({ visible, role, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const slides = role === 'manager' ? MANAGER_SLIDES : WORKER_SLIDES;
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  function handleNext() {
    if (isLast) {
      setIndex(0);
      onClose();
    } else {
      setIndex(index + 1);
    }
  }

  function handleBack() {
    if (index > 0) setIndex(index - 1);
  }

  function handleClose() {
    setIndex(0);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Slide content */}
        <View style={styles.body}>
          <Text style={styles.icon}>{slide.icon}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.bodyText}>{slide.body}</Text>
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {/* Navigation */}
        <View style={styles.nav}>
          {index > 0 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextText}>{isLast ? 'Done' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  header: {
    paddingTop: 20,
    alignItems: 'flex-end',
  },
  closeText: {
    color: '#666',
    fontSize: 15,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  icon: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 30,
  },
  bodyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
  },
  dotActive: {
    backgroundColor: '#0E7C7B',
    width: 24,
  },
  nav: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  backText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E7C7B',
    borderRadius: 12,
  },
  nextText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
