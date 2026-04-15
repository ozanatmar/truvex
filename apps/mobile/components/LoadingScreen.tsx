import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  progress: number; // 0–100
  onReady?: () => void;
}

export default function LoadingScreen({ progress, onReady }: Props) {
  const insets = useSafeAreaInsets();
  const barWidth = useRef(new Animated.Value(0)).current;

  // Tell the caller we're mounted — used to hide the native splash screen
  useEffect(() => {
    onReady?.();
  }, []);

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <ImageBackground
      source={require('../assets/loading-bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      {/* Dark navy overlay */}
      <View style={styles.overlay} />

      {/* Icon + wordmark — centered in upper third */}
      <View style={styles.logoWrap}>
        <Image
          source={require('../assets/icon.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <Text style={styles.wordmark}>Truvex</Text>
      </View>

      {/* Progress bar — pinned to bottom with safe area */}
      <View style={[styles.barWrap, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                width: barWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, SCREEN_WIDTH],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#0a1226',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 18, 38, 0.4)',
  },
  logoWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: '25%',
    gap: 16,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 18,
  },
  wordmark: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  barWrap: {
    paddingHorizontal: 0,
  },
  track: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  fill: {
    height: 2,
    backgroundColor: '#fff',
  },
});
