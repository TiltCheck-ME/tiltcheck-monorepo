'use client';

import Link from 'next/link';

export default function SystemHealthPage() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 text-slate-400">
          <Link href="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">System Health</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">❤️ System Health</h1>
          <p className="text-slate-400">Monitor service status and system performance</p>
          <p className="text-slate-500 text-sm mt-2">(Admin role required)</p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-lg p-12 text-center border border-slate-700 mb-8">
          <div className="text-6xl mb-4">🔨</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Feature in Development</h2>
          <p className="text-slate-300 mb-6">
            The system health dashboard is being built. This will show real-time monitoring of all TiltCheck services,
            API uptime, database status, and performance metrics.
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
              <span>📊</span> Monitored Services
            </h3>
            <ul className="text-slate-400 space-y-2">
              <li>• Frontend (Vercel CDN)</li>
              <li>• Backend API (Railway)</li>
              <li>• Database (Supabase)</li>
              <li>• Discord Bot (Railway)</li>
              <li>• Cache layer (Redis)</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>📈</span> Metrics Tracked
            </h3>
            <ul className="text-slate-400 space-y-2">
              <li>• API response times</li>
              <li>• Error rates</li>
              <li>• Database connections</li>
              <li>• Memory usage</li>
              <li>• Uptime percentage</li>
            </ul>
          </div>
        </div>

        {/* Current Status (Placeholder) */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Live Status</h3>
          <p className="text-slate-400 text-sm mb-4">Status dashboard will appear here once the feature is deployed.</p>
          <a
            href="/admin/status"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            View Current Public Status →
          </a>
        </div>
      </div>
    </main>
  );
}
