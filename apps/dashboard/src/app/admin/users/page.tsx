'use client';

import Link from 'next/link';

export default function UserManagementPage() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6 text-slate-400">
          <Link href="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">User Management</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">👥 User Management</h1>
          <p className="text-slate-400">Manage user accounts, roles, and permissions</p>
          <p className="text-slate-500 text-sm mt-2">(Admin role required)</p>
        </div>

        {/* Coming Soon Card */}
        <div className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 rounded-lg p-12 text-center border border-slate-700 mb-8">
          <div className="text-6xl mb-4">🔨</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Feature in Development</h2>
          <p className="text-slate-300 mb-6">
            The user management system is being built. This will allow admins to view user accounts, manage roles,
            ban users, and monitor user activity across the platform.
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
              <span>⚙️</span> Features Planned
            </h3>
            <ul className="text-slate-400 space-y-2">
              <li>• View all user accounts</li>
              <li>• Manage user roles</li>
              <li>• Suspend/ban users</li>
              <li>• Reset user passwords</li>
              <li>• Audit user activity</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🔐</span> Security Notes
            </h3>
            <p className="text-slate-400 mb-3">
              User management operations are logged and require admin authentication. Only authorized admins can:
            </p>
            <ul className="text-slate-400 space-y-2 text-sm">
              <li>• View sensitive user data</li>
              <li>• Modify user permissions</li>
              <li>• Enforce account restrictions</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
