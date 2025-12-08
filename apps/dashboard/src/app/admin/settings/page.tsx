'use client';

import Link from 'next/link';

export default function AdminSettingsPage() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 text-slate-400">
          <Link href="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">Admin Settings</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">⚙️ Admin Settings</h1>
          <p className="text-slate-400">Configure platform settings and preferences</p>
          <p className="text-slate-500 text-sm mt-2">(Admin role required)</p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-gradient-to-br from-red-900/40 to-rose-900/40 rounded-lg p-12 text-center border border-slate-700 mb-8">
          <div className="text-6xl mb-4">🔨</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Feature in Development</h2>
          <p className="text-slate-300 mb-6">
            The admin settings page is being built. This will allow admins to configure platform settings,
            manage integrations, and control feature flags.
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

        {/* Settings Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🔌</span> Integrations
            </h3>
            <ul className="text-slate-400 space-y-2 text-sm">
              <li>• Discord bot configuration</li>
              <li>• Supabase settings</li>
              <li>• External API keys</li>
              <li>• Webhook endpoints</li>
              <li>• OAuth providers</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🚩</span> Feature Flags
            </h3>
            <ul className="text-slate-400 space-y-2 text-sm">
              <li>• Enable/disable features</li>
              <li>• Beta testing controls</li>
              <li>• A/B testing setup</li>
              <li>• Feature rollout schedule</li>
              <li>• Maintenance mode</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>📝</span> Content
            </h3>
            <ul className="text-slate-400 space-y-2 text-sm">
              <li>• Site announcements</li>
              <li>• Banner messages</li>
              <li>• Help documentation</li>
              <li>• FAQ management</li>
              <li>• Terms and policies</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🔒</span> Security
            </h3>
            <ul className="text-slate-400 space-y-2 text-sm">
              <li>• Rate limiting rules</li>
              <li>• IP whitelisting</li>
              <li>• Two-factor auth</li>
              <li>• Session management</li>
              <li>• Audit logging</li>
            </ul>
          </div>
        </div>

        {/* Current Configuration */}
        <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Current Configuration</h3>
          <div className="space-y-3 text-sm text-slate-400">
            <p>• Feature flags interface: Coming soon</p>
            <p>• Integration dashboard: Coming soon</p>
            <p>• Settings export/import: Coming soon</p>
            <p>• Configuration history: Coming soon</p>
          </div>
        </div>
      </div>
    </main>
  );
}
