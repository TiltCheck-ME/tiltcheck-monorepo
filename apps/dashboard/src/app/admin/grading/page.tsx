'use client';

import Link from 'next/link';

export default function CasinoGradingPage() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 text-slate-400">
          <Link href="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">Casino Grading</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">🎲 Casino Grading</h1>
          <p className="text-slate-400">Review and grade casinos based on trust metrics</p>
          <p className="text-slate-500 text-sm mt-2">(Admin role required)</p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 rounded-lg p-12 text-center border border-slate-700 mb-8">
          <div className="text-6xl mb-4">🔨</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Feature in Development</h2>
          <p className="text-slate-300 mb-6">
            The casino grading system is being built. This will allow admins to review casino trust metrics,
            user reports, and assign grades based on compliance and player safety.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Back to Dashboard
            </Link>
            <a
              href="https://github.com/jmenichole/tiltcheck-monorepo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition-colors"
            >
              View on GitHub
            </a>
          </div>
        </div>

        {/* Info Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>⏱️</span> Expected Timeline
            </h3>
            <p className="text-slate-400">
              This feature is planned for Q1 2025. Admins will be able to review casino submissions and assign
              trust grades.
            </p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🔑</span> Access Requirements
            </h3>
            <p className="text-slate-400">
              Only users with the "Admin" or "Moderator" role can access this feature. Contact support to request access.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
