import React from 'react';
import Logo from './Logo';
import { 
  LayoutDashboard, 
  Mic, 
  BookOpen, 
  Briefcase, 
  BookMarked, 
  AlertTriangle, 
  Settings, 
  LogOut,
  Flame,
  User,
  Shield
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage, user, onLogout }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Voice Coach', icon: Mic },
    { id: 'topics', label: 'Daily Practice', icon: BookOpen },
    { id: 'interview', label: 'Interview Prep', icon: Briefcase },
    { id: 'vocab', label: 'Vocabulary Builder', icon: BookMarked },
    { id: 'errors', label: 'Error Tracker', icon: AlertTriangle },
    { id: 'settings', label: 'Coach Settings', icon: Settings },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ id: 'admin', label: 'Admin Console', icon: Shield });
  }

  return (
    <aside style={{
      width: '260px',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      background: 'hsl(var(--bg-card))',
      borderRight: '1px solid hsl(var(--border-color))',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '1.5rem',
      zIndex: 100
    }}>
      {/* Upper Logo / User details */}
      <div>
        <div className="mb-8" style={{ padding: '0 0.5rem' }}>
          <Logo size={20} showText={true} />
        </div>

        {/* Streak & Level Widgets */}
        {user && (() => {
          const thresholds = [
            { level: 'beginner', minXp: 0, maxXp: 500, label: 'Beginner' },
            { level: 'intermediate', minXp: 501, maxXp: 1500, label: 'Intermediate' },
            { level: 'advanced', minXp: 1501, maxXp: 3000, label: 'Advanced' },
            { level: 'expert', minXp: 3001, maxXp: 6000, label: 'Expert' },
            { level: 'master', minXp: 6001, maxXp: Infinity, label: 'Master' }
          ];
          const getLvl = (xp) => {
            for (const t of thresholds) {
              if (xp >= t.minXp && xp <= t.maxXp) return t;
            }
            return thresholds[0];
          };
          const lvlInfo = getLvl(user.xp || 0);
          return (
            <div className="flex flex-col gap-2 mb-6" style={{
              background: 'hsl(var(--bg-main))',
              padding: '0.875rem',
              borderRadius: '0.85rem',
              border: '1px solid hsl(var(--border-color))'
            }}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1" style={{ fontSize: '0.8rem', color: 'hsl(var(--text-secondary))', fontWeight: 500 }}>
                  <User size={14} /> Profile
                </span>
                <span className={`badge badge-${lvlInfo.level}`} style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                  {lvlInfo.label}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-primary))', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={user.firstName ? `${user.firstName} ${user.lastName}` : user.username}>
                  {user.firstName ? `${user.firstName} ${user.lastName}` : user.username}
                </span>
                <span className="flex items-center gap-1" style={{ 
                  color: 'hsl(var(--accent-yellow))',
                  fontSize: '0.85rem', 
                  fontWeight: 700,
                  background: 'hsla(var(--accent-yellow), 0.12)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px'
                }}>
                  <Flame size={14} fill="currentColor" /> {user.dailyStreak || 1}d
                </span>
              </div>
            </div>
          );
        })()}

        {/* Nav Links */}
        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className="btn"
                style={{
                  justifyContent: 'flex-start',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem',
                  borderRadius: '0.75rem',
                  background: isActive ? 'linear-gradient(90deg, hsla(var(--primary), 0.15) 0%, transparent 100%)' : 'transparent',
                  borderLeft: isActive ? '3px solid hsl(var(--primary))' : '3px solid transparent',
                  color: isActive ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))',
                  fontWeight: isActive ? 600 : 500,
                  width: '100%',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'hsl(var(--primary))' : 'inherit' }} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout button */}
      <button 
        onClick={onLogout}
        className="btn btn-secondary" 
        style={{
          width: '100%',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem',
          border: '1px solid hsl(var(--border-color))'
        }}
      >
        <LogOut size={16} />
        Log Out
      </button>
    </aside>
  );
}
