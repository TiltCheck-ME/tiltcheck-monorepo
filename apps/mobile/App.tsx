// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-08

import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';

type StakeTarget = {
  label: string;
  url: `https://${string}/`;
};

const STAKE_TARGETS: StakeTarget[] = [
  { label: 'Stake US', url: 'https://stake.us/' },
  { label: 'Stake COM', url: 'https://stake.com/' },
];

const ALLOWED_STAKE_HOSTS = new Set(['stake.us', 'www.stake.us', 'stake.com', 'www.stake.com']);

function isAllowedStakeUrl(url: string): boolean {
  try {
    const candidate = new URL(url);
    return candidate.protocol === 'https:' && ALLOWED_STAKE_HOSTS.has(candidate.hostname);
  } catch {
    return false;
  }
}

function formatHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'stake target';
  }
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [targetUrl, setTargetUrl] = useState<StakeTarget['url']>(STAKE_TARGETS[0].url);
  const [activeUrl, setActiveUrl] = useState<string>(targetUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);

  const navigateTo = useCallback((url: StakeTarget['url']) => {
    setBlockedUrl(null);
    setTargetUrl(url);
  }, []);

  const handleShouldStartLoad = useCallback((request: { url: string }) => {
    const allowed = isAllowedStakeUrl(request.url);

    if (!allowed) {
      setBlockedUrl(request.url);
    }

    return allowed;
  }, []);

  const handleNavigationStateChange = useCallback((navigationState: WebViewNavigation) => {
    setActiveUrl(navigationState.url);
    setIsLoading(navigationState.loading);
  }, []);

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="light" />
      <View style={styles.browserFrame}>
        <WebView
          ref={webViewRef}
          source={{ uri: targetUrl }}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          setSupportMultipleWindows={false}
          pullToRefreshEnabled
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onNavigationStateChange={handleNavigationStateChange}
          renderLoading={() => (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#d8ff3e" />
              <Text style={styles.loadingText}>Loading Stake wrapper...</Text>
            </View>
          )}
        />
      </View>

      <View pointerEvents="box-none" style={styles.hudWrap}>
        <View style={styles.hud}>
          <View style={styles.hudHeader}>
            <View>
              <Text style={styles.kicker}>TiltCheck Native HUD</Text>
              <Text style={styles.title}>Stake v1 wrapper</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, isLoading ? styles.statusDotLoading : styles.statusDotReady]} />
              <Text style={styles.statusText}>{isLoading ? 'Loading' : 'Live'}</Text>
            </View>
          </View>

          <Text style={styles.body}>
            Placeholder guardrail shell for session risk, cash-out nudges, and accountability controls.
          </Text>

          <View style={styles.targetRow}>
            {STAKE_TARGETS.map((target) => {
              const isActive = target.url === targetUrl;

              return (
                <Pressable
                  key={target.url}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => navigateTo(target.url)}
                  style={[styles.targetButton, isActive && styles.targetButtonActive]}
                >
                  <Text style={[styles.targetButtonText, isActive && styles.targetButtonTextActive]}>
                    {target.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Active host</Text>
            <Text style={styles.metaValue}>{formatHost(activeUrl)}</Text>
          </View>

          {blockedUrl ? (
            <Text style={styles.warningText}>
              Blocked off-scope navigation to {formatHost(blockedUrl)}. Stake only for v1, no cap.
            </Text>
          ) : null}

          <Text style={styles.footer}>Made for Degens. By Degens.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#050509',
  },
  browserFrame: {
    flex: 1,
    backgroundColor: '#050509',
  },
  loadingState: {
    alignItems: 'center',
    backgroundColor: '#050509',
    bottom: 0,
    gap: 10,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingText: {
    color: '#f7f7fb',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  hudWrap: {
    bottom: 18,
    left: 14,
    position: 'absolute',
    right: 14,
  },
  hud: {
    backgroundColor: 'rgba(5, 5, 9, 0.92)',
    borderColor: 'rgba(216, 255, 62, 0.32)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.36,
    shadowRadius: 24,
  },
  hudHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  kicker: {
    color: '#d8ff3e',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 4,
  },
  statusPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  statusDotLoading: {
    backgroundColor: '#f7c948',
  },
  statusDotReady: {
    backgroundColor: '#d8ff3e',
  },
  statusText: {
    color: '#f7f7fb',
    fontSize: 12,
    fontWeight: '800',
  },
  body: {
    color: '#c9cad6',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  targetButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  targetButtonActive: {
    backgroundColor: '#d8ff3e',
    borderColor: '#d8ff3e',
  },
  targetButtonText: {
    color: '#f7f7fb',
    fontSize: 13,
    fontWeight: '900',
  },
  targetButtonTextActive: {
    color: '#050509',
  },
  metaRow: {
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
  },
  metaLabel: {
    color: '#8e90a3',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  warningText: {
    color: '#ffb454',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  footer: {
    color: '#8e90a3',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
});
