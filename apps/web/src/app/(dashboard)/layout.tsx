/* © 2024–2026 TiltCheck Ecosystem. All rights reserved. */
import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">
      {/* Sidebar / Topbar could go here in the future */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
