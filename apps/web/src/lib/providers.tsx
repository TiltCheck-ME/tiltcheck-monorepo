// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
"use client";

import * as React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { clusterApiUrl } from '@solana/web3.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NO_EXTRA_WALLET_ADAPTERS } from './solana-wallet-catalog';
import { TiltcheckWalletModalProvider } from './tiltcheck-wallet-modal';

import '@solana/wallet-adapter-react-ui/styles.css';

export function RootProvider({ children }: { children: React.ReactNode }) {
  const endpoint = React.useMemo(() => clusterApiUrl('mainnet-beta'), []);
  const queryClient = new QueryClient();

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={NO_EXTRA_WALLET_ADAPTERS} autoConnect>
        <TiltcheckWalletModalProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </TiltcheckWalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
