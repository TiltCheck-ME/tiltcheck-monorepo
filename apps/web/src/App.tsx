/**
 * TiltCheck Auto-Claimer Web App
 * 
 * Simple React app for users to submit their Stake API keys
 * and view claim results
 */

import { useState, useEffect } from 'react';
import {
  submitApiKey,
  getClaimStatus,
  getClaimHistory,
  deleteUserData,
} from './api';
import type { ClaimStatus, ClaimHistoryItem } from './types';
import './App.css';

const USER_ID_KEY = 'tiltcheck_auto_claimer_user_id';

function App() {
  const [userId, setUserId] = useState<string | null>(
    localStorage.getItem(USER_ID_KEY)
  );
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ClaimStatus | null>(null);
  const [history, setHistory] = useState<ClaimHistoryItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Load data when userId changes
  useEffect(() => {
    if (userId) {
      loadClaimStatus();
      loadClaimHistory();

      // Poll status every 5 seconds
      const interval = setInterval(loadClaimStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const loadClaimStatus = async () => {
    if (!userId) return;
    try {
      const data = await getClaimStatus(userId);
      setStatus(data);
    } catch (err) {
      console.error('Failed to load status:', err);
    }
  };

  const loadClaimHistory = async () => {
    if (!userId) return;
    try {
      const data = await getClaimHistory(
        userId,
        50,
        statusFilter === 'all' ? undefined : statusFilter
      );
      setHistory(data.claims);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await submitApiKey(apiKey);
      setUserId(response.userId);
      localStorage.setItem(USER_ID_KEY, response.userId);
      setApiKey(''); // Clear API key from input
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit API key');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!userId) return;
    
    if (confirm('Are you sure you want to delete your data? This cannot be undone.')) {
      try {
        await deleteUserData(userId);
        localStorage.removeItem(USER_ID_KEY);
        setUserId(null);
        setStatus(null);
        setHistory([]);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete data');
      }
    }
  };

  return (
    <div className="app">
      <header>
        <h1>TiltCheck Auto-Claimer</h1>
        <p>Automatically claim Stake promo codes from Telegram channels</p>
      </header>

      {!userId ? (
        <div className="api-key-form">
          <h2>Get Started</h2>
          <p>Enter your Stake API key to start claiming codes automatically.</p>
          <p className="warning">
            ⚠️ Your API key is encrypted and stored securely server-side.
            It is never exposed to your browser after submission.
          </p>
          
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Stake API key"
              required
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Start Auto-Claiming'}
            </button>
          </form>

          {error && <div className="error">{error}</div>}

          <div className="info">
            <h3>How it works:</h3>
            <ol>
              <li>We monitor public Telegram channels for Stake promo codes</li>
              <li>Your API key is used server-side to check eligibility</li>
              <li>Eligible codes are automatically claimed for you</li>
              <li>You can view your claim history anytime</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="dashboard">
          <div className="status-section">
            <h2>Claim Status</h2>
            {status ? (
              <div className="status-cards">
                <div className="card total">
                  <div className="card-value">{status.total}</div>
                  <div className="card-label">Total Attempts</div>
                </div>
                <div className="card claimed">
                  <div className="card-value">{status.claimed}</div>
                  <div className="card-label">Successfully Claimed</div>
                </div>
                <div className="card skipped">
                  <div className="card-value">{status.skipped}</div>
                  <div className="card-label">Skipped (Ineligible)</div>
                </div>
                <div className="card failed">
                  <div className="card-value">{status.failed}</div>
                  <div className="card-label">Failed</div>
                </div>
                <div className="card processing">
                  <div className="card-value">{status.processing}</div>
                  <div className="card-label">Processing</div>
                </div>
              </div>
            ) : (
              <p>Loading status...</p>
            )}
          </div>

          <div className="history-section">
            <h2>Claim History</h2>
            <div className="filter-bar">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  loadClaimHistory();
                }}
              >
                <option value="all">All</option>
                <option value="claimed">Claimed</option>
                <option value="skipped">Skipped</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {history.length > 0 ? (
              <div className="history-list">
                {history.map((item) => (
                  <div key={item.id} className={`history-item ${item.status}`}>
                    <div className="history-code">{item.code}</div>
                    <div className="history-status">{item.status}</div>
                    {item.reason && (
                      <div className="history-reason">{item.reason}</div>
                    )}
                    {item.reward && (
                      <div className="history-reward">
                        {item.reward.type}: {item.reward.amount}{' '}
                        {item.reward.currency}
                      </div>
                    )}
                    <div className="history-time">
                      {new Date(item.attemptedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No claim history yet. Codes are being processed...</p>
            )}
          </div>

          <div className="actions">
            <button onClick={handleReset} className="danger">
              Delete My Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
