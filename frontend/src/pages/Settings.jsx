import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { speechHandler } from '../utils/speech';
import { Settings, Save, CheckCircle, Key, User, Shield, Volume2, UserCheck, Award, FileText } from 'lucide-react';

export default function SettingsPage({ user, onProfileUpdate }) {
  const [level, setLevel] = useState(user?.englishLevel || 'beginner');
  const [apiKey, setApiKey] = useState(user?.geminiApiKey || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  
  // Custom premium coach properties
  const [coachPersonality, setCoachPersonality] = useState('friendly');
  const [speechSpeed, setSpeechSpeed] = useState('1.0');
  const [accent, setAccent] = useState('us');
  const [targetLevel, setTargetLevel] = useState('intermediate');
  const [dailyPracticeGoal, setDailyPracticeGoal] = useState('20');
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(true);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [exportingReport, setExportingReport] = useState(false);

  useEffect(() => {
    // Load custom values from backend goals / localstorage
    const loadGoalsAndSettings = async () => {
      try {
        const uGoals = await api.get('/api/auth/goals');
        if (uGoals) {
          setDailyPracticeGoal(uGoals.dailyMinutes?.toString() || '20');
          setTargetLevel(uGoals.targetLevel || 'intermediate');
        }
        
        const savedAccent = localStorage.getItem(`accent_${user.id}`) || 'us';
        const savedSpeed = localStorage.getItem(`speed_${user.id}`) || '1.0';
        const savedPersonality = localStorage.getItem(`personality_${user.id}`) || 'friendly';
        setAccent(savedAccent);
        setSpeechSpeed(savedSpeed);
        setCoachPersonality(savedPersonality);

        const lbOptIn = user.leaderboardOptIn !== false;
        setLeaderboardOptIn(lbOptIn);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) {
      loadGoalsAndSettings();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setError('');

    try {
      // 1. Save general profile
      const response = await api.put('/api/auth/profile', {
        englishLevel: level,
        geminiApiKey: apiKey,
        firstName,
        lastName,
        email,
        phone
      });

      // 2. Save goals
      await api.put('/api/auth/goals', {
        dailyMinutes: Number(dailyPracticeGoal),
        weeklyMinutes: Number(dailyPracticeGoal) * 5,
        targetLevel,
        learningFocus: 'speaking'
      });

      // 3. Save leaderboard preference
      await api.put('/api/auth/leaderboard/opt-in', {
        optIn: leaderboardOptIn
      });

      // 4. Save custom speech settings to speechHandler and localstorage
      localStorage.setItem(`accent_${user.id}`, accent);
      localStorage.setItem(`speed_${user.id}`, speechSpeed);
      localStorage.setItem(`personality_${user.id}`, coachPersonality);
      speechHandler.setCustomVoiceSettings(accent, Number(speechSpeed));
      
      // Update local storage representation
      const mergedUser = {
        ...response.user,
        leaderboardOptIn
      };
      localStorage.setItem('user', JSON.stringify(mergedUser));
      if (response.token) {
        localStorage.setItem('token', response.token);
      }
      
      onProfileUpdate(mergedUser);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    setExportingReport(true);
    try {
      const data = await api.get('/api/progress/reports/export');
      // Generate clean printable text/HTML style summary report
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `English_Coach_Learning_Report_${user?.firstName || 'User'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export learning report.');
    } finally {
      setExportingReport(false);
    }
  };

  return (
    <div className="card animate-slide-in" style={{ maxWidth: '750px', margin: '0 auto', padding: '2rem' }}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-6" style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
        <div className="flex items-center gap-2">
          <Settings size={22} style={{ color: 'hsl(var(--primary))' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Coach Settings & Customizations</h2>
        </div>
        <button 
          onClick={handleExportReport} 
          disabled={exportingReport}
          className="btn btn-secondary flex items-center gap-1.5"
          style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
        >
          <FileText size={14} />
          {exportingReport ? 'Exporting...' : 'Export Progress Report'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {success && (
          <div className="flex items-center gap-2" style={{
            background: 'hsla(var(--accent-green), 0.15)',
            border: '1px solid hsla(var(--accent-green), 0.3)',
            color: 'hsl(var(--accent-green))',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            <CheckCircle size={16} />
            Settings saved successfully!
          </div>
        )}

        {error && (
          <div style={{
            background: 'hsla(var(--accent-red), 0.15)',
            border: '1px solid hsla(var(--accent-red), 0.3)',
            color: 'hsl(var(--accent-red))',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {/* Personal Information */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <User size={14} /> First Name
            </label>
            <input
              type="text"
              className="form-input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              placeholder="Enter first name"
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <User size={14} /> Last Name
            </label>
            <input
              type="text"
              className="form-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">
              Email Address (Username)
            </label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@example.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
            />
          </div>
        </div>

        {/* AI Voice & Personality Settings */}
        <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--primary))' }}>
            <Volume2 size={16} /> AI Coach Personality & Voice
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Accent / Dialect</label>
              <select className="form-input" value={accent} onChange={(e) => setAccent(e.target.value)} style={{ background: 'hsl(var(--bg-main))' }}>
                <option value="us">American English (US)</option>
                <option value="gb">British English (UK)</option>
                <option value="au">Australian English (AU)</option>
                <option value="ca">Canadian English (CA)</option>
                <option value="in">Indian English (IN)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Coach Personality</label>
              <select className="form-input" value={coachPersonality} onChange={(e) => setCoachPersonality(e.target.value)} style={{ background: 'hsl(var(--bg-main))' }}>
                <option value="friendly">Friendly & Encouraging</option>
                <option value="mentor">Professional Mentor</option>
                <option value="strict">Strict & Precise</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Speech Speed Rate</label>
              <select className="form-input" value={speechSpeed} onChange={(e) => setSpeechSpeed(e.target.value)} style={{ background: 'hsl(var(--bg-main))' }}>
                <option value="0.7">Slow (0.7x)</option>
                <option value="0.85">Moderate (0.85x)</option>
                <option value="1.0">Normal (1.0x)</option>
                <option value="1.15">Natural Fast (1.15x)</option>
                <option value="1.3">Advanced Fast (1.3x)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Profile Learning Goals */}
        <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--primary))' }}>
            <UserCheck size={16} /> Profile Goals & Privacy
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Target Level Goal</label>
              <select className="form-input" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} style={{ background: 'hsl(var(--bg-main))' }}>
                <option value="intermediate">Intermediate Level</option>
                <option value="advanced">Advanced Level</option>
                <option value="expert">Expert Level</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Daily Practice Goal (Minutes)</label>
              <select className="form-input" value={dailyPracticeGoal} onChange={(e) => setDailyPracticeGoal(e.target.value)} style={{ background: 'hsl(var(--bg-main))' }}>
                <option value="10">Casual (10 mins / day)</option>
                <option value="20">Regular (20 mins / day)</option>
                <option value="30">Serious (30 mins / day)</option>
                <option value="60">Intense (60 mins / day)</option>
              </select>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', padding: '0.25rem 0' }}>
            <input 
              type="checkbox" 
              checked={leaderboardOptIn} 
              onChange={(e) => setLeaderboardOptIn(e.target.checked)} 
              style={{ width: '16px', height: '16px', accentColor: 'hsl(var(--primary))' }}
            />
            <span style={{ fontSize: '0.85rem', color: 'hsl(var(--text-primary))' }}>
              Opt-in to rank on the Global Learning Leaderboard
            </span>
          </label>
        </div>

        {/* English Level Radio Cards */}
        <div className="form-group" style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '1.5rem' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Shield size={14} /> Proficiency Level
          </label>
          <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '0.75rem' }}>
            Determines the speaking pace, vocabulary difficulty, and depth of conversation analysis.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { id: 'beginner', label: 'Beginner', desc: 'Slower speech output. Standard grammatical error tracking. Basic vocabulary assistance.' },
              { id: 'intermediate', label: 'Intermediate', desc: 'Standard speed output. Complete grammatical and phrasing suggestions. Dynamic conversations.' },
              { id: 'advanced', label: 'Advanced', desc: 'Natural speech output. In-depth professional speech critiques and lexical alternatives.' }
            ].map((lvl) => (
              <label 
                key={lvl.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  padding: '1rem',
                  borderRadius: '0.85rem',
                  border: '1px solid',
                  borderColor: level === lvl.id ? 'hsl(var(--primary))' : 'hsl(var(--border-color))',
                  background: level === lvl.id ? 'hsla(var(--primary), 0.04)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="radio"
                  name="englishLevel"
                  value={lvl.id}
                  checked={level === lvl.id}
                  onChange={() => setLevel(lvl.id)}
                  style={{ marginTop: '0.25rem', accentColor: 'hsl(var(--primary))' }}
                />
                <div>
                  <strong style={{ fontSize: '0.9rem', color: level === lvl.id ? 'hsl(var(--text-primary))' : 'hsl(var(--text-secondary))' }}>
                    {lvl.label}
                  </strong>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))', marginTop: '0.15rem' }}>
                    {lvl.desc}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Gemini API Key */}
        <div className="form-group" style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '1.5rem' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Key size={14} /> Google Gemini API Key
          </label>
          <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', marginBottom: '0.75rem' }}>
            Add your key to activate advanced dynamic AI conversations and critiques. Your key is stored in your local configuration.
          </p>
          <input
            type="password"
            className="form-input"
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        {/* Save button */}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ alignSelf: 'flex-end', padding: '0.75rem 2rem', gap: '0.4rem' }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
          <Save size={16} />
        </button>
      </form>

    </div>
  );
}
