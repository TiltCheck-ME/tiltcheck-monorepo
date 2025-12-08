import Link from 'next/link';

export default function DashboardHome() {
  return (
    <main className="min-h-screen p-8 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-white">TiltCheck Control Center</h1>
        <p className="text-slate-400 mb-8">Manage your gaming and trust ecosystem</p>
        
        {/* User Tools Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span role="img" aria-label="User tools">🎮</span> Your Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Dashboard */}
            <div className="md:col-span-2 bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-4 md:p-8 border border-slate-700">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">📊 Your Dashboard</h3>
                  <p className="text-green-100 mb-4">View your tilt stats, recent events, and gaming patterns</p>
                </div>
                <div className="text-5xl" role="img" aria-label="Dashboard icon">📱</div>
              </div>
              <Link
                href="/dashboard/user"
                className="inline-block mt-4 px-6 py-3 bg-white text-green-900 font-semibold rounded-lg hover:bg-green-50 transition-colors"
              >
                Go to Your Dashboard →
              </Link>
            </div>

            {/* Extension & Analyzer */}
            <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-bold text-white">🔌 TiltGuard Extension</h3>
                <div className="text-4xl" role="img" aria-label="Extension icon">🛡️</div>
              </div>
              <p className="text-purple-100 mb-4">Auto-track gameplay, detect tilt, analyze sessions</p>
              <a
                href="https://tiltcheck.me/extension"
                className="inline-block px-4 py-2 bg-white text-purple-900 font-semibold rounded-lg hover:bg-purple-50 transition-colors text-sm"
              >
                Install Extension
              </a>
            </div>

            {/* PWA Quick Access */}
            <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 border border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-bold text-white">📱 Mobile PWA</h3>
                <div className="text-4xl" role="img" aria-label="Mobile icon">⚡</div>
              </div>
              <p className="text-blue-100 mb-4">Add to home screen for offline tracking</p>
              <button
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    alert('To install: Tap Share > Add to Home Screen (iOS) or Menu > Add to Home Screen (Android)');
                  }
                }}
                className="inline-block px-4 py-2 bg-white text-blue-900 font-semibold rounded-lg hover:bg-blue-50 transition-colors text-sm"
              >
                Install PWA
              </button>
            </div>
          </div>
        </section>

        {/* Admin Panel Section */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
            <span role="img" aria-label="Admin panel">🔧</span> Admin Panel
          </h2>
          <p className="text-slate-500 text-sm mb-4">(Requires Admin Role)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardCard
              title="Casino Grading"
              description="Review and grade casinos based on trust metrics"
              href="/casinos"
              icon="🏛️"
            />
            
            <DashboardCard
              title="User Management"
              description="Manage users, roles, and permissions"
              href="/users"
              icon="👥"
            />
            
            <DashboardCard
              title="JustTheTip Monitor"
              description="Monitor tipping activity and bot status"
              href="/justthetip"
              icon="💰"
            />
            
            <DashboardCard
              title="System Health"
              description="Real-time system status and metrics"
              href="/health"
              icon="⚙️"
            />
            
            <DashboardCard
              title="Analytics"
              description="View ecosystem analytics and reports"
              href="/analytics"
              icon="📈"
            />
            
            <DashboardCard
              title="Settings"
              description="Configure dashboard and system settings"
              href="/settings"
              icon="⚡"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  href,
  icon = '📋',
}: {
  title: string;
  description: string;
  href: string;
  icon?: string;
}) {
  return (
    <Link
      href={href}
      className="block p-6 border border-slate-700 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors group"
    >
      <div className="text-3xl mb-3" role="img" aria-label={`${title} icon`}>{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-white group-hover:text-blue-400 transition-colors">
        {title}
      </h3>
      <p className="text-slate-400">{description}</p>
    </Link>
  );
}
