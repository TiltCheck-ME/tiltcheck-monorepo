import Link from 'next/link';

export default function DashboardHome() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">TiltCheck Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Casino Grading */}
          <DashboardCard
            title="Casino Grading"
            description="Review and grade casinos based on trust metrics"
            href="/casinos"
          />
          
          {/* User Management */}
          <DashboardCard
            title="User Management"
            description="Manage users, roles, and permissions"
            href="/users"
          />
          
          {/* JustTheTip Monitor */}
          <DashboardCard
            title="JustTheTip Monitor"
            description="Monitor tipping activity and bot status"
            href="/justthetip"
          />
          
          {/* System Health */}
          <DashboardCard
            title="System Health"
            description="Real-time system status and metrics"
            href="/health"
          />
          
          {/* Analytics */}
          <DashboardCard
            title="Analytics"
            description="View ecosystem analytics and reports"
            href="/analytics"
          />
          
          {/* Settings */}
          <DashboardCard
            title="Settings"
            description="Configure dashboard and system settings"
            href="/settings"
          />
        </div>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block p-6 border rounded-lg hover:border-blue-500 transition-colors"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </Link>
  );
}
