// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08

import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'TiltCheck Mobile',
  slug: 'tiltcheck-mobile',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'tiltcheck',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'me.tiltcheck.mobile',
  },
  android: {
    package: 'me.tiltcheck.mobile',
    adaptiveIcon: {
      backgroundColor: '#050509',
    },
  },
  extra: {
    copyright: '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08',
  },
};

export default config;
