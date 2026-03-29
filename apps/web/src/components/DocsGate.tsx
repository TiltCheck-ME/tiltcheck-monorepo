/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface DocsGateProps {
  children: React.ReactNode;
  isSensitive?: boolean;
}

/**
 * DocsGate
 * Enforces wallet-based gating for sensitive documentation.
 * Allows public access if isSensitive is false.
 */
export default function DocsGate({ children, isSensitive = false }: DocsGateProps) {
  const { isConnected } = useAccount();

  // If not sensitive, always show. 
  // If sensitive, only show if connected.
  if (!isSensitive || isConnected) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-[#283347] bg-black/40 animate-in fade-in duration-500">
      <div className="mb-6 flex flex-col items-center">
        <div className="w-16 h-16 border-2 border-[#d946ef] rounded-full flex items-center justify-center mb-4 relative">
            <span className="absolute inset-0 bg-[#d946ef]/20 rounded-full animate-ping"></span>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d946ef" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter text-white">RESTRICTED PROTOCOL</h2>
        <p className="text-[#d946ef] text-sm font-bold uppercase tracking-widest mt-1">Clearance Level 1 Required // Wallet Auth</p>
      </div>

      <div className="max-w-md">
        <p className="text-gray-400 mb-8 italic">
          Technical specifications, architecture blueprints, and production runbooks are restricted to verified TiltCheck ecosystem participants. 
          Connect your Degen wallet to authenticate your clearance.
        </p>
      </div>

      <div className="scale-110">
        <ConnectButton label="AUTHENTICATE CLEARANCE" />
      </div>

      <div className="mt-12 opacity-30 pointer-events-none">
        <pre className="text-[8px] text-gray-700 font-mono text-left leading-tight">
          {`[SYSTEM_LOG] ACCESS_REQUEST_DENIED
[SYSTEM_LOG] PROTOCOL: 0x77-TILTCHECK-SECURE
[SYSTEM_LOG] ERROR_CODE: AUTH_MISSING_CERTIFICATE
[SYSTEM_LOG] MONITORING_STATUS: ACTIVE
[SYSTEM_LOG] ... waiting for clearance signature ...`}
        </pre>
      </div>
    </div>
  );
}
