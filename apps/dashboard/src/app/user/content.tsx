/**
 * User Dashboard Content Component
 * 
 * Client-side component that fetches and displays tilt data
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface TiltStats {
  userId: string;
  totalEvents: number;
  averageTiltScore: number;
  maxTiltScore: number;
  lastEventAt: string | null;
  eventsLast24h: number;
  eventsLast7d: number;
}

interface TiltEvent {
  id: string;
  timestamp: string;
  tilt_score: number;
  signals: string | any[];
  context: string;
}

export default function UserDashboardContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || 'demo';

  const [stats, setStats] = useState<TiltStats | null>(null);
  const [events, setEvents] = useState<TiltEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

        // Fetch stats and history in parallel
        const [statsRes, historyRes] = await Promise.all([
          fetch(`${backendUrl}/api/tilt/stats/${userId}`),
          fetch(`${backendUrl}/api/tilt/history/${userId}?limit=20&days=30`),
        ]);

        if (!statsRes.ok || !historyRes.ok) {
          setError('Failed to fetch data. Please try again.');
          return;
        }

        const statsData = await statsRes.json();
        const historyData = await historyRes.json();

        setStats(statsData);
        setEvents(historyData.events || []);
      } catch (err) {
        console.error('[Dashboard] Error fetching data:', err);
        setError('An error occurred while loading your dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
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

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold text-red-400 mb-2">Unable to Load Dashboard</h2>
            <p className="text-slate-300">{error || 'No data available'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine tilt level color
  const tiltLevel = stats.averageTiltScore;
  let bgColor = 'from-green-900 to-green-800';
  let statusEmoji = '😊';
  if (tiltLevel > 5) {
    bgColor = 'from-yellow-900 to-yellow-800';
    statusEmoji = '😐';
  }
  if (tiltLevel > 7) {
    bgColor = 'from-orange-900 to-orange-800';
    statusEmoji = '😠';
  }
  if (tiltLevel > 9) {
    bgColor = 'from-red-900 to-red-800';
    statusEmoji = '😡';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Your Tilt Dashboard</h1>
          <p className="text-slate-400">Track your emotional gaming patterns and stay in control</p>
        </div>

        {/* Main Stats Card */}
        <div className={`bg-gradient-to-br ${bgColor} rounded-lg p-8 mb-8 border border-slate-700`}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-300 mb-2">CURRENT TILT LEVEL</h2>
              <div className="text-5xl font-bold text-white">
                {tiltLevel.toFixed(1)}
                <span className="text-3xl text-slate-300 ml-2">/10</span>
              </div>
            </div>
            <div className="text-6xl">{statusEmoji}</div>
          </div>
          <p className="text-slate-200">
            {tiltLevel < 3 && '✨ You\'re in a great mindset!'}
            {tiltLevel >= 3 && tiltLevel < 6 && '⚠️ Consider taking a break soon'}
            {tiltLevel >= 6 && tiltLevel < 8 && '🚨 High tilt detected - time for a break'}
            {tiltLevel >= 8 && '🛑 Critical tilt level - stop playing now'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Total Events"
            value={stats.totalEvents}
            icon="📊"
          />
          <StatCard
            label="Max Score (7d)"
            value={stats.maxTiltScore.toFixed(1)}
            icon="📈"
            unit="/10"
          />
          <StatCard
            label="Events (24h)"
            value={stats.eventsLast24h}
            icon="⏰"
          />
          <StatCard
            label="Events (7d)"
            value={stats.eventsLast7d}
            icon="📅"
          />
          <StatCard
            label="Last Event"
            value={
              stats.lastEventAt
                ? new Date(stats.lastEventAt).toLocaleDateString()
                : 'Never'
            }
            icon="🕐"
          />
          <StatCard
            label="Status"
            value={tiltLevel > 7 ? 'High Tilt' : 'Normal'}
            icon={tiltLevel > 7 ? '⚠️' : '✅'}
          />
        </div>

        {/* Recent Events */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h3 className="text-xl font-bold text-white mb-4">Recent Tilt Events</h3>
          {events.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No events detected yet</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const signals = typeof event.signals === 'string'
                  ? JSON.parse(event.signals)
                  : event.signals;
                const signalStr = signals && Array.isArray(signals)
                  ? signals.map((s: any) => s.type).join(', ')
                  : 'unknown';

                return (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                  >
                    <div>
                      <div className="font-semibold text-white">
                        Score: {event.tilt_score}/10
                      </div>
                      <div className="text-sm text-slate-300">{signalStr}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl">
                        {event.tilt_score > 7 ? '😡' : event.tilt_score > 5 ? '😠' : '😐'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-300 mb-3">💡 Tips to Manage Tilt</h3>
          <ul className="space-y-2 text-slate-300">
            <li>✓ Take a 10-minute break when tilt reaches 6+</li>
            <li>✓ Set a daily loss limit before playing</li>
            <li>✓ Track your emotions in the TiltCheck app</li>
            <li>✓ Use the 5-minute rule: wait 5 mins before re-entering</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  unit?: string;
}

function StatCard({ label, value, icon, unit }: StatCardProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-sm font-semibold text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">
        {value}
        {unit && <span className="text-sm text-slate-400 ml-1">{unit}</span>}
      </div>
    </div>
  );
}
