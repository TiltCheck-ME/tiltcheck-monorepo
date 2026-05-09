// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09

import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview';
import { initTiltCheckInjectedRuntime } from '@tiltcheck/injected-runtime';

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
    return 'unknown';
  }
}

type RuntimeStatus = {
  version: string;
  host: string;
  enabledModules: string[];
};

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [targetUrl, setTargetUrl] = useState<StakeTarget['url']>(STAKE_TARGETS[0].url);
  const [activeUrl, setActiveUrl] = useState<string>(targetUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);
  const [injectionEnabled, setInjectionEnabled] = useState(true);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [lastLog, setLastLog] = useState<string>('Idle');

  const injectedJs = useMemo(() => {
    if (!injectionEnabled) {
      return `true;`;
    }

    const config = {
      allowHosts: Array.from(ALLOWED_STAKE_HOSTS),
      modules: {
        autovaultStake: false,
      },
    };

    // NOTE: This uses the runtime as a pure string payload for WebView injection.
    // Expo/RN does not support passing functions; this is the expected model.
    const runtimeBootstrap = `
      (function() {
        try {
          const post = (msg) => {
            try {
              if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
                window.ReactNativeWebView.postMessage(JSON.stringify(msg));
              }
            } catch {}
          };
          const bridge = { post };
          (${initTiltCheckInjectedRuntime.toString()})({ config: ${JSON.stringify(config)}, bridge });
        } catch (error) {
          try {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tc.log', level: 'error', message: 'Runtime init failed', data: String(error) }));
          } catch {}
        }
      })();
      true;
    `;

    return runtimeBootstrap;
  }, [injectionEnabled]);

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

  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const parsed = JSON.parse(event.nativeEvent.data) as any;
      if (parsed?.type === 'tc.log') {
        setLastLog(String(parsed.message ?? 'log'));
        return;
      }
      if (parsed?.type === 'tc.status' && parsed.status) {
        setRuntimeStatus({
          version: String(parsed.status.version ?? ''),
          host: String(parsed.status.host ?? ''),
          enabledModules: Array.isArray(parsed.status.enabledModules) ? parsed.status.enabledModules.map(String) : [],
        });
      }
    } catch {
      setLastLog('Bad bridge message');
    }
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
          injectedJavaScript={injectedJs}
          onMessage={onMessage}
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
              <Text style={styles.kicker}>TiltCheck</Text>
              <Text style={styles.title}>Mobile v1 wrapper</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, isLoading ? styles.statusDotLoading : styles.statusDotReady]} />
              <Text style={styles.statusText}>{isLoading ? 'Loading' : 'Live'}</Text>
            </View>
          </View>

          <View style={styles.toggleRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: injectionEnabled }}
              onPress={() => setInjectionEnabled((v) => !v)}
              style={[styles.toggleButton, injectionEnabled && styles.toggleButtonActive]}
            >
              <Text style={[styles.toggleButtonText, injectionEnabled && styles.toggleButtonTextActive]}>
                {injectionEnabled ? 'Injection: ON' : 'Injection: OFF'}
              </Text>
            </Pressable>
          </View>

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

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Runtime</Text>
            <Text style={styles.metaValue}>{runtimeStatus ? runtimeStatus.version : 'not reported'}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Last log</Text>
            <Text style={styles.metaValue}>{lastLog}</Text>
          </View>

          {blockedUrl ? (
            <Text style={styles.warningText}>Blocked off-scope navigation to {formatHost(blockedUrl)}. Stake only for v1.</Text>
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
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    backgroundColor: '#050509',
    gap: 10,
    justifyContent: 'center',
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
  toggleRow: {
    marginTop: 12,
  },
  toggleButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  toggleButtonActive: {
    backgroundColor: '#d8ff3e',
    borderColor: '#d8ff3e',
  },
  toggleButtonText: {
    color: '#f7f7fb',
    fontSize: 13,
    fontWeight: '900',
  },
  toggleButtonTextActive: {
    color: '#050509',
  },
  targetRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
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
    marginTop: 12,
    paddingTop: 10,
  },
  metaLabel: {
    color: '#8e90a3',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    maxWidth: '62%',
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

