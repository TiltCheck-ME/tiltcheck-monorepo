'use client';

import Link from 'next/link';

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 text-slate-400">
          <Link href="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">Analytics</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">📈 Analytics Dashboard</h1>
          <p className="text-slate-400">Platform usage, engagement, and growth metrics</p>
          <p className="text-slate-500 text-sm mt-2">(Admin role required)</p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-lg p-12 text-center border border-slate-700 mb-8">
          <div className="text-6xl mb-4">🔨</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Feature in Development</h2>
          <p className="text-slate-300 mb-6">
            The analytics dashboard is being built. This will provide detailed insights into platform usage,
            user engagement, tool adoption rates, and growth metrics.
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>👥</span> User Metrics
            </h3>
            <ul className="text-slate-400 space-y-2 text-sm">
              <li>• Total users</li>
              <li>• Daily active users</li>
              <li>• User growth rate</li>
              <li>• Retention rate</li>
              <li>• Churn rate</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🛠️</span> Tool Usage
            </h3>
            <ul className="text-slate-400 space-y-2 text-sm">
              <li>• Usage by tool</li>
              <li>• Feature adoption</li>
              <li>• Tool engagement</li>
              <li>• Popular features</li>
              <li>• Abandoned features</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>💰</span> Business Metrics
            </h3>
            <ul className="text-slate-400 space-y-2 text-sm">
              <li>• Total transactions</li>
              <li>• Revenue trends</li>
              <li>• Cost per user</li>
              <li>• LTV estimates</li>
              <li>• Unit economics</li>
            </ul>
          </div>
        </div>

        {/* Export Options */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Export & Reports</h3>
          <p className="text-slate-400 mb-4">
            Once available, you'll be able to export data and generate custom reports.
          </p>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-slate-700 text-slate-400 font-semibold rounded-lg cursor-not-allowed opacity-50">
              Export CSV
            </button>
            <button className="px-4 py-2 bg-slate-700 text-slate-400 font-semibold rounded-lg cursor-not-allowed opacity-50">
              Generate Report
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
