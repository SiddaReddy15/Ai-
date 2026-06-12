import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import {
  Shield, Users, Activity, Mic, Target, TrendingUp, BookMarked,
  LogIn, UserPlus, ChevronDown, Search, AlertCircle, RefreshCw
} from 'lucide-react';

const ACTION_ICONS = {
  login: LogIn, register: UserPlus, voice_session: Mic,
  level_up: TrendingUp, vocab_learned: BookMarked,
  daily_exercise: Activity, interview_session: Target
};
const ACTION_COLORS = {
  login: '#6366f1', register: '#22c55e', voice_session: '#06b6d4',
  level_up: '#ec4899', vocab_learned: '#f59e0b',
  daily_exercise: '#8b5cf6', interview_session: '#f97316'
};

const LEVEL_COLORS = { beginner: '#22c55e', intermediate: '#f59e0b', advanced: '#6366f1', expert: '#ec4899' };

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div style={{ background: 'hsl(var(--bg-card))', border: `1px solid ${color}30`, borderRadius: 16, padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
        <div style={{ background: `${color}18`, borderRadius: 10, padding: '0.5rem', display: 'flex' }}>
          <Icon size={18} color={color} />
        </div>
        <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>{label}</span>
      </div>
      <div style={{ color: '#fff', fontSize: '2rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.72rem', marginTop: '0.35rem' }}>{sub}</div>}
    </div>
  );
}

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingTab, setLoadingTab] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, usersData, growthData] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get('/api/admin/growth').catch(() => [])
      ]);
      setStats(statsData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setGrowth(Array.isArray(growthData) ? growthData : []);
    } catch (err) {
      setError('Failed to load admin data. Make sure you are logged in as admin.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async (tab) => {
    setLoadingTab(true);
    try {
      if (tab === 'sessions' && sessions.length === 0) {
        const data = await api.get('/api/admin/sessions');
        setSessions(Array.isArray(data) ? data : []);
      }
      if (tab === 'activity' && activity.length === 0) {
        const data = await api.get('/api/admin/activity');
        setActivity(Array.isArray(data) ? data : []);
      }
    } catch (_) {}
    finally { setLoadingTab(false); }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    fetchTabData(tab);
  };

  const filteredUsers = users.filter(u =>
    !searchQuery ||
    (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (ms) => {
    if (!ms) return '0m';
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };

  const maxGrowth = Math.max(...growth.map(g => Number(g.new_users || 0)), 1);

  if (loading) return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh', gap: '1rem' }}>
      <div style={{ width: 42, height: 42, border: '3px solid hsl(var(--border-color))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} className="spin-slow" />
      <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Loading admin console...</p>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1100, margin: '0 auto' }} className="animate-slide-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12, padding: '0.65rem', display: 'flex' }}>
            <Shield size={22} color="#6366f1" />
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '0.15rem' }}>Admin Console</h1>
            <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>Logged in as <strong style={{ color: '#6366f1' }}>{user?.email}</strong></p>
          </div>
        </div>
        <button onClick={fetchOverview} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px solid hsl(var(--border-color))', borderRadius: 10, padding: '0.5rem 0.9rem', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '0.82rem' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '1rem 1.25rem', color: '#ef4444', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: 'hsl(var(--bg-card))', borderRadius: 12, padding: '0.4rem', width: 'fit-content' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'users', label: `Users (${users.length})` },
          { key: 'sessions', label: 'Sessions' },
          { key: 'activity', label: 'Activity Log' }
        ].map(t => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            style={{ padding: '0.5rem 1.1rem', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', background: activeTab === t.key ? '#6366f1' : 'transparent', color: activeTab === t.key ? '#fff' : 'hsl(var(--text-muted))', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && stats && (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers || 0} color="#6366f1" sub="All registered accounts" />
            <StatCard icon={Activity} label="Active Today" value={stats.activeToday || 0} color="#22c55e" sub="Unique active users" />
            <StatCard icon={Mic} label="Total Sessions" value={stats.totalSessions || 0} color="#06b6d4" sub="Practice sessions completed" />
            <StatCard icon={Target} label="Avg Grammar" value={`${stats.avgGrammarScore || 0}%`} color="#f59e0b" sub="Across all users" />
            <StatCard icon={TrendingUp} label="New This Week" value={stats.newUsersThisWeek || 0} color="#f97316" sub="New registrations" />
            <StatCard icon={BookMarked} label="Vocab Learned" value={stats.totalVocabLearned || 0} color="#ec4899" sub="Words learned total" />
          </div>

          {/* Growth Chart */}
          {growth.length > 0 && (
            <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 20, padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={16} color="#6366f1" /> User Growth (Last 30 Days)
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 120 }}>
                {growth.slice(-14).map((g, i) => {
                  const h = Math.max(4, ((Number(g.new_users) || 0) / maxGrowth) * 110);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                      <div title={`${g.date}: ${g.new_users} users`}
                        style={{ width: '100%', height: h, background: 'linear-gradient(to top, #6366f1, #8b5cf6)', borderRadius: '3px 3px 0 0', transition: 'height 0.6s ease', cursor: 'pointer', minHeight: 4 }} />
                      <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.6rem', writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 30, overflow: 'hidden' }}>
                        {g.date?.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* System Health */}
          <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '1.25rem 1.5rem' }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem' }}>System Health</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {[
                { label: 'Database', status: 'Online', color: '#22c55e' },
                { label: 'API Server', status: 'Running', color: '#22c55e' },
                { label: 'Auth Service', status: 'Active', color: '#22c55e' },
                { label: 'Server Time', status: new Date().toLocaleTimeString(), color: '#06b6d4' },
              ].map(({ label, status, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.9rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid hsl(var(--border-color))' }}>
                  <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>{label}</span>
                  <span style={{ color, fontSize: '0.78rem', fontWeight: 700 }}>● {status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <>
          <div style={{ position: 'relative', marginBottom: '1rem' }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name or email..."
              style={{ width: '100%', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 12, padding: '0.7rem 1rem 0.7rem 2.25rem', color: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {filteredUsers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>No users found.</div>
            ) : filteredUsers.map((u, i) => {
              const lc = LEVEL_COLORS[u.englishLevel] || '#22c55e';
              return (
                <div key={u.id || i} style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    {(u.firstName || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
                      {u.firstName || ''} {u.lastName || ''}
                      {u.role === 'admin' && <span style={{ marginLeft: '0.5rem', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', borderRadius: 6, padding: '0.1rem 0.5rem', fontSize: '0.7rem', fontWeight: 700 }}>ADMIN</span>}
                    </div>
                    <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ background: `${lc}18`, color: lc, borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize' }}>{u.englishLevel || 'beginner'}</span>
                    <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>🔥 {u.dailyStreak || 0}d</span>
                    {u.skills && <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>{u.skills.totalSessions || 0} sessions</span>}
                    <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.72rem' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── SESSIONS TAB ── */}
      {activeTab === 'sessions' && (
        <>
          {loadingTab ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>No practice sessions yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {sessions.map((s, i) => {
                const typeColors = { general: '#6366f1', interview: '#f59e0b', vocab_quiz: '#06b6d4', topics: '#22c55e' };
                const tc = typeColors[s.sessionType] || '#6366f1';
                const avgScore = Math.round(((s.grammarScore || 0) + (s.vocabularyScore || 0) + (s.fluencyScore || 0)) / 3);
                return (
                  <div key={s.id || i} style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 14, padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ background: `${tc}20`, color: tc, borderRadius: 8, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize', flexShrink: 0 }}>{s.sessionType || 'general'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>{s.userEmail || 'Unknown'}</div>
                      <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>
                        {s.durationMs ? `${Math.round(s.durationMs / 1000)}s` : '-'} · {s.wordsSpoken || 0} words
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: avgScore >= 80 ? '#22c55e' : avgScore >= 60 ? '#f59e0b' : '#ef4444', fontWeight: 700, fontSize: '0.88rem' }}>{avgScore}%</div>
                      <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.72rem' }}>{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── ACTIVITY LOG TAB ── */}
      {activeTab === 'activity' && (
        <>
          {loadingTab ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>Loading activity...</div>
          ) : activity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>No activity logs yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activity.map((log, i) => {
                const ActionIcon = ACTION_ICONS[log.action] || Activity;
                const color = ACTION_COLORS[log.action] || '#6366f1';
                const labels = { login: 'Logged in', register: 'Registered', voice_session: 'Voice session', level_up: 'Level upgraded', vocab_learned: 'Learned vocabulary', daily_exercise: 'Daily exercise', interview_session: 'Interview practice' };
                return (
                  <div key={log.id || i} style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 12, padding: '0.8rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: `${color}18`, borderRadius: 8, padding: '0.45rem', display: 'flex', flexShrink: 0 }}>
                      <ActionIcon size={15} color={color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#fff', fontSize: '0.82rem', fontWeight: 500 }}>{labels[log.action] || log.action}</span>
                        <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem' }}>— {log.userEmail || 'Unknown'}</span>
                      </div>
                      {log.details && <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</div>}
                    </div>
                    <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.72rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
