// Truvex design tokens — kept in sync with landing page CSS variables
export const C = {
  // Brand (matches landing --color-primary / --color-secondary / --color-cta)
  primary:   '#0E7C7B',  // teal
  coral:     '#E8634A',  // coral — use for primary CTAs (Accept, Post Callout)
  cta:       '#F5853F',  // orange

  // Backgrounds
  bgDark:    '#0f0f1a',
  bgCard:    '#1a1a2e',
  bgInput:   '#2a2a40',
  border:    '#2a2a40',

  // Text
  textSub:   '#7A8899',  // neutral gray (was purple-tinted #8888aa)
  textMuted: '#666666',
  textDim:   '#555555',

  // Semantic (unchanged)
  success:   '#10b981',
  warning:   '#f59e0b',
  error:     '#ef4444',
  neutral:   '#6b7280',
} as const;

// Font families — loaded in app/_layout.tsx via @expo-google-fonts/dm-sans
export const F = {
  bold:      'DMSans_700Bold',
  extraBold: 'DMSans_800ExtraBold',
} as const;
