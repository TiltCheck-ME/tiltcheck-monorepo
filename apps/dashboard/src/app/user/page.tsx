/**
 * User Dashboard Page for Apps
 * 
 * Displays user's tilt history, stats, and trust information
 * Accessible via /apps or when users click the dashboard link
 */

import { Suspense } from 'react';
import UserDashboardContent from './content';

export default function UserDashboard() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UserDashboardContent />
    </Suspense>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
