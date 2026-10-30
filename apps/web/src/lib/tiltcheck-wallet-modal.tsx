// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-30
'use client';

import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletModalContext, useWalletModal } from '@solana/wallet-adapter-react-ui';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { isExodusWalletName, withoutExodusWalletEntries } from './solana-wallet-catalog';

export function TiltcheckWalletModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);

  return (
    <WalletModalContext.Provider value={{ visible, setVisible }}>
      <ExodusDisconnectGuard />
      {children}
      {visible ? <TiltcheckWalletModal /> : null}
    </WalletModalContext.Provider>
  );
}

function ExodusDisconnectGuard() {
  const { wallet, disconnect } = useWallet();

  React.useEffect(() => {
    if (wallet && isExodusWalletName(wallet.adapter.name)) {
      void disconnect();
    }
  }, [wallet, disconnect]);

  return null;
}

function TiltcheckWalletModal() {
  const { wallets, select } = useWallet();
  const { setVisible } = useWalletModal();
  const [fadeIn, setFadeIn] = React.useState(false);
  const [portal, setPortal] = React.useState<Element | null>(null);

  const listed = React.useMemo(
    () =>
      withoutExodusWalletEntries(wallets).filter(
        (wallet) => wallet.readyState === WalletReadyState.Installed,
      ),
    [wallets],
  );

  const hideModal = React.useCallback(() => {
    setFadeIn(false);
    window.setTimeout(() => setVisible(false), 150);
  }, [setVisible]);

  const handleWalletClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, walletName: WalletName) => {
      event.preventDefault();
      select(walletName);
      hideModal();
    },
    [select, hideModal],
  );

  React.useLayoutEffect(() => {
    setPortal(document.querySelector('body'));
    const timeout = window.setTimeout(() => setFadeIn(true), 0);
    const { overflow } = window.getComputedStyle(document.body);
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hideModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timeout);
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [hideModal]);

  if (!portal) return null;

  return createPortal(
    <div
      aria-labelledby="wallet-adapter-modal-title"
      aria-modal="true"
      className={`wallet-adapter-modal ${fadeIn ? 'wallet-adapter-modal-fade-in' : ''}`}
      role="dialog"
    >
      <div className="wallet-adapter-modal-container">
        <div className="wallet-adapter-modal-wrapper">
          <button
            type="button"
            onClick={hideModal}
            className="wallet-adapter-modal-button-close"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                fill="currentColor"
                d="M14 12.461 8.3 6.772l5.234-5.233L12.006 0 6.772 5.234 1.54 0 0 1.539l5.234 5.233L0 12.006l1.539 1.528L6.772 8.3l5.69 5.7L14 12.461z"
              />
            </svg>
          </button>
          {listed.length ? (
            <>
              <h1 className="wallet-adapter-modal-title" id="wallet-adapter-modal-title">
                Connect a wallet on Solana to continue
              </h1>
              <ul className="wallet-adapter-modal-list">
                {listed.map((wallet) => (
                  <li key={wallet.adapter.name}>
                    <button
                      type="button"
                      className="wallet-adapter-button"
                      onClick={(event) => handleWalletClick(event, wallet.adapter.name)}
                    >
                      <i className="wallet-adapter-button-start-icon">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={wallet.adapter.icon} alt="" width={28} height={28} />
                      </i>
                      {wallet.adapter.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h1 className="wallet-adapter-modal-title" id="wallet-adapter-modal-title">
                Install a Solana wallet
              </h1>
              <p className="wallet-adapter-modal-middle">
                Any Wallet Standard signer works. Not a deposit. Not Exodus.
              </p>
            </>
          )}
        </div>
      </div>
      <div className="wallet-adapter-modal-overlay" onMouseDown={hideModal} />
    </div>,
    portal,
  );
}
