/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */

import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'TiltCheck Mobile Wrapper',
  slug: 'tiltcheck-mobile-wrapper',
  scheme: 'tiltcheck',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  platforms: ['ios', 'android'],
  platform: {
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#050509',
      },
    },
  } as any,
};

export default config;

