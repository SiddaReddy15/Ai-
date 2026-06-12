import React, { useState, useEffect } from 'react';
import { api } from './utils/api';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VoiceChat from './pages/VoiceChat';
import PracticeTopics from './pages/PracticeTopics';
import InterviewPrep from './pages/InterviewPrep';
import VocabBuilder from './pages/VocabBuilder';
import ErrorTracker from './pages/ErrorTracker';
import SettingsPage from './pages/Settings';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [topicContext, setTopicContext] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      try {
        const userData = await api.get('/api/auth/me');
        setUser(userData);
        setIsAuthenticated(true);
        // If admin, default to dashboard (not admin) unless explicitly set
        if (userData.role === 'admin') {
          const savedPage = sessionStorage.getItem('activePage');
          if (savedPage) setActivePage(savedPage);
        }
      } catch (err) {
        console.error('Session check failed:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    // Store level upgrade info if present
    if (userData.levelUpgraded) {
      localStorage.setItem('levelUpgraded', JSON.stringify(userData.levelUpgraded));
    }
    setActivePage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('levelUpgraded');
    sessionStorage.removeItem('activePage');
    setIsAuthenticated(false);
    setUser(null);
    setActivePage('dashboard');
  };

  const handleSelectTopic = (topicObj) => {
    setTopicContext(topicObj);
    setActivePage('chat');
  };

  const handleProfileUpdate = (updatedUserData) => {
    setUser(prev => ({ ...prev, ...updatedUserData }));
  };

  const handlePageChange = (pageName) => {
    if (pageName !== 'chat') setTopicContext(null);
    setActivePage(pageName);
    sessionStorage.setItem('activePage', pageName);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh', gap: '1rem' }}>
        <div style={{
          width: 45, height: 45,
          border: '3px solid hsl(var(--border-color))',
          borderTopColor: 'hsl(var(--primary))',
          borderRadius: '50%'
        }} className="spin-slow" />
        <p style={{ color: 'hsl(var(--text-muted))', fontFamily: 'var(--font-sans)', fontSize: '0.9rem' }}>
          Connecting to English Coach AI...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-container">
      <Navbar
        activePage={activePage}
        setActivePage={handlePageChange}
        user={user}
        onLogout={handleLogout}
      />
      <main className="main-content">
        {activePage === 'dashboard' && <Dashboard user={user} setActivePage={handlePageChange} />}
        {activePage === 'chat' && <VoiceChat user={user} topicContext={topicContext} />}
        {activePage === 'topics' && <PracticeTopics user={user} onSelectTopic={handleSelectTopic} />}
        {activePage === 'interview' && <InterviewPrep user={user} />}
        {activePage === 'vocab' && <VocabBuilder user={user} />}
        {activePage === 'errors' && <ErrorTracker user={user} />}
        {activePage === 'settings' && <SettingsPage user={user} onProfileUpdate={handleProfileUpdate} />}
        {activePage === 'admin' && user?.role === 'admin' && <AdminDashboard user={user} />}
        {activePage === 'admin' && user?.role !== 'admin' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#ef4444', fontSize: '1rem' }}>
            Access denied. Admin privileges required.
          </div>
        )}
      </main>
    </div>
  );
}
