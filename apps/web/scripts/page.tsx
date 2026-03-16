'use client';

export default function UserManagementPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-4">User Management</h1>
      <p className="text-slate-400 mb-8">View, edit, and manage user roles and permissions.</p>
      
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
        <h2 className="text-2xl font-semibold mb-2 text-white">🔨 Coming Soon</h2>
        <p className="text-slate-300">The user management dashboard is currently in development.</p>
        <a href="/dashboard" className="mt-6 inline-block px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          Back to Dashboard
        </a>
      </div>
    </main>
  );
}