/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import React, { useState } from 'react';
import { useWallet } from '../lib/useWallet';

export function WalletConnect() {
  const { walletInfo, loading, connect, disconnect } = useWallet();
  const [email, setEmail] = useState('');
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!email) return;

    setConnecting(true);
    const success = await connect(email);
    setConnecting(false);

    if (success) {
      setEmail('');
    } else {
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
  };

  if (loading) {
    return <div className="wallet-connect">Loading...</div>;
  }

  return (
    <div className="wallet-connect">
      {walletInfo.connected ? (
        <div className="wallet-info">
          <p>Connected: {walletInfo.address.slice(0, 8)}...{walletInfo.address.slice(-8)}</p>
          <button onClick={handleDisconnect}>Disconnect</button>
        </div>
      ) : (
        <div className="wallet-connect-form">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={connecting}
          />
          <button onClick={handleConnect} disabled={connecting || !email}>
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      )}
    </div>
  );
}
