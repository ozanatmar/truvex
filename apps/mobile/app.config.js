// Migrated from app.json so we can resolve GOOGLE_SERVICES_JSON from EAS file
// env vars at build time. The file itself is gitignored — EAS stages it on the
// builder and sets the env var to the on-disk path; locally it falls back to
// ./google-services.json for prebuild/dev-client runs.

module.exports = {
  expo: {
    name: 'Truvex',
    slug: 'truvex',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'truvex',
    userInterfaceStyle: 'light',
    backgroundColor: '#0f0f1a',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'cover',
      backgroundColor: '#3B58E8',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'app.truvex.mobile',
      backgroundColor: '#0f0f1a',
      infoPlist: {
        NSContactsUsageDescription:
          'Truvex uses your contacts to quickly add workers to your team.',
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#1a1a2e',
      },
      package: 'truvex.app',
      backgroundColor: '#0f0f1a',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      permissions: [
        'READ_CONTACTS',
        'android.permission.READ_CONTACTS',
        'android.permission.WRITE_CONTACTS',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#1a1a2e',
        },
      ],
      [
        'expo-contacts',
        {
          contactsPermission:
            'Allow Truvex to access your contacts to add workers.',
        },
      ],
      'expo-font',
      '@react-native-community/datetimepicker',
      'expo-web-browser',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: '749c41de-d277-43f1-8c61-8be5e5ddcfcf',
      },
    },
    owner: 'ozanatmar',
  },
};
