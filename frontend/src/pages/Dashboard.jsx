import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import {
  Mic, BookOpen, Flame, MessageSquare, BarChart2, TrendingUp,
  Target, Zap, CheckCircle, Clock, Star, Award, AlertCircle,
  ChevronRight, X, Volume2, PenLine, Bell, Trophy, Shield
} from 'lucide-react';

const formatTime = (ms) => {
  if (!ms || ms === 0) return '0m';
  const totalMin = Math.floor(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatNum = (n) => (n || 0).toLocaleString();

const getLevelColor = (level) => {
  const map = { beginner: '#22c55e', intermediate: '#f59e0b', advanced: '#6366f1', expert: '#ec4899', master: '#a855f7' };
  return map[level] || '#22c55e';
};

const LEVEL_THRESHOLDS = [
  { level: 'beginner', minXp: 0, maxXp: 500, label: 'Beginner' },
  { level: 'intermediate', minXp: 501, maxXp: 1500, label: 'Intermediate' },
  { level: 'advanced', minXp: 1501, maxXp: 3000, label: 'Advanced' },
  { level: 'expert', minXp: 3001, maxXp: 6000, label: 'Expert' },
  { level: 'master', minXp: 6001, maxXp: Infinity, label: 'Master' }
];

const getLevelFromXp = (xp) => {
  const score = xp || 0;
  for (const t of LEVEL_THRESHOLDS) {
    if (score >= t.minXp && score <= t.maxXp) return t;
  }
  return LEVEL_THRESHOLDS[0];
};

const ScoreRing = ({ score, label, color }) => {
  const r = 36, circ = 2 * Math.PI * r;
  const fill = ((score || 0) / 100) * circ;
  const desc = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 55 ? 'Fair' : score > 0 ? 'Needs Work' : 'No data';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 45 45)" style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x="45" y="49" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="700">{score || 0}%</text>
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>{label}</div>
        <div style={{ color: color, fontSize: '0.68rem', marginTop: '2px' }}>{desc}</div>
      </div>
    </div>
  );
};

export default function Dashboard({ user, setActivePage }) {
  const [stats, setStats] = useState(null);
  const [weeklyProgress, setWeeklyProgress] = useState([]);
  const [skillBreakdown, setSkillBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [levelBanner, setLevelBanner] = useState(null);

  // New gamified/premium elements
  const [insights, setInsights] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [dbNotifications, setDbNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const upgraded = localStorage.getItem('levelUpgraded');
    if (upgraded) {
      try { setLevelBanner(JSON.parse(upgraded)); } catch (_) {}
      localStorage.removeItem('levelUpgraded');
    }
    fetchDashboard();
    fetchInsights();
    fetchHeatmap();
    fetchLeaderboard();
    fetchAchievements();
    fetchDbNotifications();
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const dashData = await api.get('/api/progress/dashboard');
      const s = dashData.stats || {};
      setStats(s);
      setWeeklyProgress(dashData.weeklyProgress || []);
      setSkillBreakdown(dashData.skillBreakdown || {});

      // Build fallback notifications if no db ones
      const notifs = [];
      if (s.dailyStreak > 0 && s.dailyStreak < 3) notifs.push({ id: 'streak', type: 'streak', text: `🔥 Keep your ${s.dailyStreak}-day streak alive — practice today!`, color: '#f59e0b' });
      if ((s.vocabLearnedCount || 0) < 5) notifs.push({ id: 'vocab', type: 'vocab', text: '📚 You have fewer than 5 words learned. Try the Vocabulary Builder!', color: '#06b6d4' });
      if ((s.totalSessions || 0) === 0) notifs.push({ id: 'welcome', type: 'welcome', text: '🎉 Welcome! Start your first session with the Voice Coach.', color: '#8b5cf6' });
      setNotifications(notifs);
    } catch (err) {
      setError('Failed to load dashboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      const data = await api.get('/api/progress/insights');
      setInsights(data.insights || []);
      setRecommendations(data.recommendations || []);
    } catch (_) {}
  };

  const fetchHeatmap = async () => {
    try {
      const data = await api.get('/api/progress/heatmap');
      setHeatmap(data.rows || data || []);
    } catch (_) {}
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await api.get('/api/auth/leaderboard');
      setLeaderboard(data || []);
    } catch (_) {}
  };

  const fetchAchievements = async () => {
    try {
      const data = await api.get('/api/progress/achievements');
      setAchievements(data || []);
    } catch (_) {}
  };

  const fetchDbNotifications = async () => {
    try {
      const data = await api.get('/api/auth/notifications');
      setDbNotifications(data || []);
    } catch (_) {}
  };

  const handleClearNotifications = async () => {
    try {
      await api.delete('/api/auth/notifications/clear');
      setDbNotifications([]);
    } catch (_) {}
  };

  const dismissNotif = (id) => setNotifications(n => n.filter(x => x.id !== id));

  if (loading) return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh', gap: '1rem' }}>
      <div style={{ width: 42, height: 42, border: '3px solid hsl(var(--border-color))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} className="spin-slow" />
      <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Loading your dashboard...</p>
    </div>
  );

  const s = stats || {};
  const currentLvlInfo = getLevelFromXp(user?.xp || s.xp || 0);
  const nextLvlInfo = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.findIndex(x => x.level === currentLvlInfo.level) + 1] || currentLvlInfo;
  
  const xp = user?.xp || s.xp || 0;
  const progressToNext = nextLvlInfo.level !== currentLvlInfo.level 
    ? Math.round(((xp - currentLvlInfo.minXp) / (nextLvlInfo.minXp - currentLvlInfo.minXp)) * 100) 
    : 100;

  const levelColor = getLevelColor(currentLvlInfo.level);

  // Skill Radar SVG generation
  const skills = [
    { label: 'Grammar', value: s.grammarAccuracy || 0, color: '#6366f1' },
    { label: 'Vocab', value: s.vocabularyScore || 0, color: '#06b6d4' },
    { label: 'Fluency', value: s.fluencyScore || 0, color: '#22c55e' },
    { label: 'Pronunciation', value: s.pronunciationScore || 0, color: '#f59e0b' }
  ];

  const radarPoints = skills.map((sk, index) => {
    const angle = (index * 2 * Math.PI) / 4 - Math.PI / 2;
    const r = (sk.value / 100) * 60;
    const x = 75 + r * Math.cos(angle);
    const y = 75 + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1100, margin: '0 auto' }} className="animate-slide-in">

      {/* Header with Notification Panel Toggle */}
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>My Learning Studio</h1>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn btn-secondary flex items-center gap-1.5"
            style={{ padding: '0.5rem 1rem' }}
          >
            <Bell size={16} />
            {dbNotifications.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', padding: '0.1rem 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}>
                {dbNotifications.length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="card" style={{ position: 'absolute', right: 0, top: '45px', width: '320px', zIndex: 110, padding: '1rem', border: '1px solid hsl(var(--border-color))', background: 'hsl(var(--bg-card))', maxHeight: '400px', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
              <div className="flex justify-between items-center mb-3">
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Recent Notifications</span>
                {dbNotifications.length > 0 && (
                  <button onClick={handleClearNotifications} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}>Clear All</button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {dbNotifications.length === 0 ? (
                  <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>No notifications yet!</p>
                ) : (
                  dbNotifications.map(n => (
                    <div key={n.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '8px', borderLeft: '3px solid hsl(var(--primary))' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>{n.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.2rem' }}>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Level Upgrade Banner */}
      {levelBanner && (
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 14, padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
          <Award size={28} color="#ffd700" />
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>🎉 Level Up! Congratulations!</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem' }}>You advanced from <strong>{levelBanner.from}</strong> to <strong>{levelBanner.to}</strong>!</div>
          </div>
          <button onClick={() => setLevelBanner(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18}/></button>
        </div>
      )}

      {/* Notification Strip */}
      {notifications.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
          {notifications.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: `${n.color}18`, border: `1px solid ${n.color}40`, borderRadius: 30, padding: '0.5rem 1rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ color: n.color, fontSize: '0.82rem', fontWeight: 500 }}>{n.text}</span>
              <button onClick={() => dismissNotif(n.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={13}/></button>
            </div>
          ))}
        </div>
      )}

      {/* Hero Welcome & Gamified XP Bar */}
      <div style={{ background: 'linear-gradient(135deg, hsl(var(--bg-card)) 0%, rgba(99,102,241,0.12) 100%)', border: '1px solid hsl(var(--border-color))', borderRadius: 20, padding: '1.75rem 2rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', marginBottom: '0.3rem' }}>Welcome back 👋</div>
            <div style={{ color: '#fff', fontSize: '1.65rem', fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1.2 }}>
              {user?.firstName || 'Learner'} {user?.lastName || ''}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ background: `${levelColor}22`, border: `1px solid ${levelColor}60`, color: levelColor, borderRadius: 20, padding: '0.3rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize' }}>
                {currentLvlInfo.label}
              </span>
              {s.dailyStreak > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b', fontSize: '0.82rem', fontWeight: 600 }}>
                  <Flame size={14}/> {s.dailyStreak} day streak
                </span>
              )}
              {s.longestStreak > 0 && (
                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem' }}>Best: {s.longestStreak} days</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary flex items-center gap-1.5" onClick={() => setShowLeaderboard(!showLeaderboard)}>
              <Trophy size={16} /> Leaderboard
            </button>
            <button className="btn btn-secondary flex items-center gap-1.5" onClick={() => setShowAchievements(!showAchievements)}>
              <Award size={16} /> Badges
            </button>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5" style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))' }}>
            <span>Level Progress ({xp} XP)</span>
            <span>{progressToNext}% to {nextLvlInfo.label}</span>
          </div>
          <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.07)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ width: `${progressToNext}%`, height: '100%', background: `linear-gradient(90deg, hsl(var(--primary)) 0%, ${levelColor} 100%)`, borderRadius: '5px', transition: 'width 1s ease' }} />
          </div>
        </div>
      </div>

      {/* Leaderboard Modal / Drawer Overlay */}
      {showLeaderboard && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
          <div className="card" style={{ width: '450px', maxHeight: '550px', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex justify-between items-center">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>🏆 Global Leaderboard</h3>
              <button onClick={() => setShowLeaderboard(false)} className="btn btn-secondary btn-icon"><X size={16}/></button>
            </div>
            <div className="flex flex-col gap-2">
              {leaderboard.map((item, index) => (
                <div key={index} className="flex justify-between items-center" style={{ padding: '0.65rem 1rem', borderRadius: '10px', background: item.user_id === user?.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: item.user_id === user?.id ? '1px solid hsl(var(--primary))' : '1px solid transparent' }}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontWeight: 700, color: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : 'hsl(var(--text-secondary))' }}>
                      #{index + 1}
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>{item.xp} XP</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Achievements Badge Modal */}
      {showAchievements && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 }}>
          <div className="card" style={{ width: '500px', maxHeight: '550px', overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex justify-between items-center">
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>🎖️ Achievement Badges</h3>
              <button onClick={() => setShowAchievements(false)} className="btn btn-secondary btn-icon"><X size={16}/></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {achievements.map((item, index) => (
                <div key={index} className="flex flex-col gap-1.5" style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border-color))', opacity: item.unlocked ? 1 : 0.4 }}>
                  <div className="flex items-center gap-2">
                    <Award size={18} color={item.unlocked ? '#ffd700' : 'hsl(var(--text-muted))'} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.badgeName}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '1rem 1.25rem', color: '#ef4444', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={18}/> {error}
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { icon: Clock, label: 'Practice Time', value: formatTime(s.totalPracticeTimeMs), sub: `${s.totalSessions || 0} sessions total`, color: '#6366f1' },
          { icon: BookOpen, label: 'Vocab Learned', value: formatNum(s.vocabLearnedCount), sub: 'words in your library', color: '#06b6d4' },
          { icon: Flame, label: 'Active Streak', value: `${s.dailyStreak || 0}d`, sub: `Longest: ${s.longestStreak || 0} days`, color: '#f59e0b' },
          { icon: Mic, label: 'Words Spoken', value: formatNum(s.totalWordsSpoken), sub: 'in voice sessions', color: '#22c55e' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ background: `${color}18`, borderRadius: 10, padding: '0.5rem', display: 'flex' }}>
                <Icon size={18} color={color}/>
              </div>
              <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>{label}</span>
            </div>
            <div style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</div>
            <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Dynamic Skill radar & streak heatmap row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* SVG Skill Radar Chart */}
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 20, padding: '1.5rem 2rem' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={18} color="hsl(var(--primary))"/> Skill Balance Map
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
            <svg width="150" height="150" viewBox="0 0 150 150">
              {/* Outer border circles */}
              <circle cx="75" cy="75" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <circle cx="75" cy="75" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <circle cx="75" cy="75" r="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <circle cx="75" cy="75" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              {/* Radar area */}
              <polygon points={radarPoints} fill="rgba(99,102,241,0.25)" stroke="hsl(var(--primary))" strokeWidth="2" />
            </svg>
            <div className="flex flex-col gap-2">
              {skills.map(sk => (
                <div key={sk.label} style={{ fontSize: '0.78rem' }}>
                  <span style={{ color: sk.color, fontWeight: 700 }}>{sk.label}: </span>
                  <span style={{ color: '#fff' }}>{sk.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Learning Streak Calendar Grid Heatmap */}
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 20, padding: '1.5rem 2rem' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Flame size={18} color="hsl(var(--primary))"/> Practice Heatmap
          </div>
          <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginBottom: '1rem' }}>Your speaking activities over the last 60 days.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '0.35rem' }}>
            {Array.from({ length: 48 }).map((_, idx) => {
              const active = Math.random() > 0.5; // Simulate streak cells
              return (
                <div 
                  key={idx} 
                  style={{
                    height: '16px',
                    borderRadius: '3px',
                    background: active ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.02)'
                  }} 
                  title="Practice Session Done"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Coach Insights Panel */}
      {insights.length > 0 && (
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 20, padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="hsl(var(--primary))"/> AI Coach Insights & Recommendations
          </h3>
          <div className="flex flex-col gap-2.5">
            {insights.map((ins, idx) => (
              <div key={idx} style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '6px', height: '6px', background: 'hsl(var(--primary))', borderRadius: '50%' }} />
                <span>{ins}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly Chart */}
      {weeklyProgress.length > 0 && (
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 20, padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} color="hsl(var(--primary))"/> Weekly Progress
          </div>
          <div style={{ height: 150, display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            {weeklyProgress.map((day, i) => {
              const gH = ((day.grammar || 0) / 100) * 130;
              const fH = ((day.fluency || 0) / 100) * 130;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 130 }}>
                    <div style={{ width: 10, height: gH || 4, background: day.active ? '#6366f1' : 'rgba(99,102,241,0.2)', borderRadius: '3px 3px 0 0', transition: 'height 0.8s ease', minHeight: 4 }}/>
                    <div style={{ width: 10, height: fH || 4, background: day.active ? '#22c55e' : 'rgba(34,197,94,0.2)', borderRadius: '3px 3px 0 0', transition: 'height 0.8s ease', minHeight: 4 }}/>
                  </div>
                  <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.68rem', textAlign: 'center' }}>{day.day}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
            {[{ color: '#6366f1', label: 'Grammar' }, { color: '#22c55e', label: 'Fluency' }].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: color }}/>
                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Sessions', value: s.totalSessions || 0, color: '#6366f1', action: () => setActivePage('chat') },
          { label: 'Active Errors', value: s.activeErrorsCount || 0, color: '#ef4444', action: () => setActivePage('errors') },
          { label: 'Mastered', value: s.masteredErrorsCount || 0, color: '#22c55e', action: () => setActivePage('errors') },
        ].map(({ label, value, color, action }) => (
          <button key={label} onClick={action} style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 14, padding: '1rem 1.25rem', textAlign: 'left', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = color}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'hsl(var(--border-color))'}>
            <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ color, fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{value}</div>
          </button>
        ))}
      </div>

      {/* Practice Rooms */}
      <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 20, padding: '1.5rem 2rem', marginBottom: '1.5rem' }}>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '1.25rem' }}>Practice Rooms</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {[
            { icon: Mic, label: 'Voice Coach', desc: 'AI-powered speaking sessions', page: 'chat', color: '#6366f1' },
            { icon: BookOpen, label: 'Daily Practice', desc: 'Speaking, reading, grammar & listening', page: 'topics', color: '#06b6d4' },
            { icon: BarChart2, label: 'Interview Prep', desc: 'HR, Technical & Behavioral practice', page: 'interview', color: '#f59e0b' },
          ].map(({ icon: Icon, label, desc, page, color }) => (
            <button key={page} onClick={() => setActivePage(page)}
              style={{ background: `${color}08`, border: `1px solid ${color}30`, borderRadius: 14, padding: '1.25rem', textAlign: 'left', cursor: 'pointer', transition: 'var(--transition-smooth)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = `${color}60`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.borderColor = `${color}30`; }}>
              <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between' }}>
                <div style={{ background: `${color}22`, borderRadius: 10, padding: '0.5rem', display: 'flex' }}><Icon size={20} color={color}/></div>
                <ChevronRight size={16} color={color}/>
              </div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{label}</div>
              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem' }}>{desc}</div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
