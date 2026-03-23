'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  zora,
} from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const projectId = 'your_project_id_here'; // TODO: Replace with WalletConnect Project ID

const config = getDefaultConfig({
  appName: 'TiltCheck',
  projectId,
  chains: [mainnet, polygon, optimism, arbitrum, base, zora],
  ssr: true, // Required for Next.js App Router
});

const queryClient = new QueryClient();

const demoAppInfo = {
  appName: 'TiltCheck',
};

export function RootProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider appInfo={demoAppInfo}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
