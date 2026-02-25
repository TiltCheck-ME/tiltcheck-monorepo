/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function JustTheTipHome() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">JustTheTip</h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Send crypto tips to Discord users instantly
          </p>
        </header>

        {!isLoggedIn ? (
          /* Login Section */
          <div className="text-center">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Connect your Discord account to start sending and receiving tips
              </p>
              <a
                href="https://api.tiltcheck.me/auth/discord/login?redirect=https://justthetip.tiltcheck.me"
                className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Connect with Discord
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <FeatureCard
                title="Discord Integration"
                description="Tip any Discord user directly from the bot or web interface"
              />
              <FeatureCard
                title="Solana Powered"
                description="Fast, low-fee transactions on the Solana blockchain"
              />
              <FeatureCard
                title="Wallet Linking"
                description="Link your wallet for seamless tipping with message signing"
              />
            </div>
          </div>
        ) : (
          /* Dashboard Section */
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Link
                href="/tip"
                className="block p-6 border rounded-lg hover:border-indigo-500 transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2">Send a Tip</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Send crypto to a Discord user
                </p>
              </Link>

              <Link
                href="/history"
                className="block p-6 border rounded-lg hover:border-indigo-500 transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2">Tip History</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  View your sent and received tips
                </p>
              </Link>

              <Link
                href="/wallet"
                className="block p-6 border rounded-lg hover:border-indigo-500 transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2">Wallet</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Link or manage your Solana wallet
                </p>
              </Link>

              <Link
                href="/settings"
                className="block p-6 border rounded-lg hover:border-indigo-500 transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2">Settings</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Configure your preferences
                </p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}
