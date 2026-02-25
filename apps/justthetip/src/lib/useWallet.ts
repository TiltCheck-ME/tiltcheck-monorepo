/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { useState, useEffect } from 'react';
import {
  isWalletConnected,
  getConnectedWalletAddress,
  connectWallet,
  disconnectWallet,
  WalletInfo
} from './wallet';

export function useWallet() {
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    address: '',
    connected: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    try {
      const connected = await isWalletConnected();
      const address = connected ? await getConnectedWalletAddress() : null;

      setWalletInfo({
        address: address || '',
        connected: connected && !!address,
      });
    } catch (error) {
      console.error('Error checking wallet connection:', error);
      setWalletInfo({ address: '', connected: false });
    } finally {
      setLoading(false);
    }
  };

  const connect = async (email: string): Promise<boolean> => {
    setLoading(true);
    try {
      const success = await connectWallet(email);
      if (success) {
        await checkWalletConnection();
      }
      return success;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    try {
      await disconnectWallet();
      setWalletInfo({ address: '', connected: false });
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    walletInfo,
    loading,
    connect,
    disconnect,
    refresh: checkWalletConnection,
  };
}
