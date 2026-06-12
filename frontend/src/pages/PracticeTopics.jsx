import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { BookOpen, Mic, Volume2, PenLine, CheckCircle, Clock, Star, AlertCircle, ChevronRight, RefreshCw } from 'lucide-react';

const EXERCISE_META = {
  speaking: { icon: Mic, color: '#6366f1', label: 'Speaking Exercise', instruction: 'Speak about the given topic clearly and confidently.', inputType: 'text' },
  reading: { icon: BookOpen, color: '#06b6d4', label: 'Reading Practice', instruction: 'Read the passage aloud. Type or speak what you read.', inputType: 'text' },
  listening: { icon: Volume2, color: '#f59e0b', label: 'Listening Practice', instruction: 'Listen to the sentence and type exactly what you heard.', inputType: 'text' },
  grammar: { icon: PenLine, color: '#22c55e', label: 'Grammar Fix', instruction: 'Find and fix the grammatical error in the sentence below.', inputType: 'text' }
};

export default function PracticeTopics({ user, onSelectTopic }) {
  const [topics, setTopics] = useState({ beginner: [], intermediate: [], advanced: [] });
  const [activeLevel, setActiveLevel] = useState(user?.englishLevel || 'beginner');
  const [mainTab, setMainTab] = useState('topics');
  const [loading, setLoading] = useState(true);
  const [dailyProgress, setDailyProgress] = useState(null);
  const [dailyPrompts, setDailyPrompts] = useState(null);
  const [exerciseInputs, setExerciseInputs] = useState({ speaking: '', reading: '', listening: '', grammar: '' });
  const [exerciseResults, setExerciseResults] = useState({});
  const [submitting, setSubmitting] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [topicsData, progressData, promptsData] = await Promise.all([
        api.get('/api/practice/topics'),
        api.get('/api/practice/daily-progress').catch(() => null),
        api.get('/api/practice/daily-prompts').catch(() => null)
      ]);
      setTopics(topicsData || {});
      setDailyProgress(progressData);
      setDailyPrompts(promptsData);
    } catch (err) {
      setError('Failed to load practice data.');
    } finally {
      setLoading(false);
    }
  };

  const submitExercise = async (type) => {
    const input = exerciseInputs[type]?.trim();
    if (!input) return;
    setSubmitting(s => ({ ...s, [type]: true }));
    try {
      const result = await api.post('/api/practice/daily-exercise', {
        exerciseType: type,
        userInput: input,
        promptText: dailyPrompts?.[type] || ''
      });
      setExerciseResults(r => ({ ...r, [type]: result }));
      // Refresh progress
      const prog = await api.get('/api/practice/daily-progress').catch(() => null);
      setDailyProgress(prog);
    } catch (err) {
      setExerciseResults(r => ({ ...r, [type]: { error: 'Submission failed. Try again.' } }));
    } finally {
      setSubmitting(s => ({ ...s, [type]: false }));
    }
  };

  const levelList = topics[activeLevel] || [];
  const completionPercent = dailyProgress?.completion_percent || 0;
  const doneFlags = {
    speaking: !!(dailyProgress?.speaking_done),
    reading: !!(dailyProgress?.reading_done),
    listening: !!(dailyProgress?.listening_done),
    grammar: !!(dailyProgress?.grammar_done)
  };
  const doneCount = Object.values(doneFlags).filter(Boolean).length;

  if (loading) return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh', gap: '1rem' }}>
      <div style={{ width: 40, height: 40, border: '3px solid hsl(var(--border-color))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} className="spin-slow"/>
      <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Loading practice content...</p>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 1000, margin: '0 auto' }} className="animate-slide-in">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '0.3rem' }}>Practice Center</h1>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Topic practice & daily exercises to sharpen your English skills.</p>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'hsl(var(--bg-card))', borderRadius: 12, padding: '0.4rem', width: 'fit-content' }}>
        {[{ key: 'topics', label: 'Topic Practice' }, { key: 'exercises', label: 'Daily Exercises' }].map(t => (
          <button key={t.key} onClick={() => setMainTab(t.key)} style={{ padding: '0.55rem 1.25rem', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', background: mainTab === t.key ? 'hsl(var(--primary))' : 'transparent', color: mainTab === t.key ? '#fff' : 'hsl(var(--text-muted))', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TOPIC PRACTICE TAB ── */}
      {mainTab === 'topics' && (
        <>
          {/* Level Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {['beginner', 'intermediate', 'advanced'].map(lv => {
              const colors = { beginner: '#22c55e', intermediate: '#f59e0b', advanced: '#6366f1' };
              const c = colors[lv];
              const active = activeLevel === lv;
              return (
                <button key={lv} onClick={() => setActiveLevel(lv)} style={{ padding: '0.45rem 1.1rem', borderRadius: 20, border: `1px solid ${active ? c : 'hsl(var(--border-color))'}`, background: active ? `${c}22` : 'transparent', color: active ? c : 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>
                  {lv}
                </button>
              );
            })}
          </div>

          {/* Topic Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {levelList.map(topic => (
              <div key={topic.id} style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '1.5rem', cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                onClick={() => onSelectTopic(topic)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'hsl(var(--border-color))'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>{topic.title}</div>
                <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '1rem' }}>{topic.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'hsl(var(--primary))', fontSize: '0.82rem', fontWeight: 600 }}>
                  <Mic size={14}/> Start Practice <ChevronRight size={14}/>
                </div>
              </div>
            ))}
            {levelList.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'hsl(var(--text-muted))', padding: '3rem' }}>No topics for this level yet.</div>
            )}
          </div>
        </>
      )}

      {/* ── DAILY EXERCISES TAB ── */}
      {mainTab === 'exercises' && (
        <>
          {/* Completion Bar */}
          <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>Today's Progress</span>
              <span style={{ color: completionPercent >= 100 ? '#22c55e' : 'hsl(var(--text-muted))', fontWeight: 700, fontSize: '0.85rem' }}>{doneCount}/4 exercises</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 8, transition: 'width 0.8s ease', width: `${completionPercent}%`, background: completionPercent >= 100 ? '#22c55e' : completionPercent >= 50 ? '#f59e0b' : '#6366f1' }}/>
            </div>
            {completionPercent >= 100 && (
              <div style={{ color: '#22c55e', fontSize: '0.82rem', marginTop: '0.5rem', fontWeight: 600 }}>🎉 All exercises completed today!</div>
            )}
          </div>

          {/* 2x2 Exercise Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {['speaking', 'reading', 'listening', 'grammar'].map(type => {
              const meta = EXERCISE_META[type];
              const Icon = meta.icon;
              const done = doneFlags[type];
              const result = exerciseResults[type];
              const isSubmitting = submitting[type];
              const prompt = dailyPrompts?.[type] || '';

              return (
                <div key={type} style={{ background: 'hsl(var(--bg-card))', border: `1px solid ${done ? meta.color + '60' : 'hsl(var(--border-color))'}`, borderRadius: 18, padding: '1.5rem', position: 'relative', overflow: 'hidden', transition: 'border-color 0.3s' }}>
                  {/* Done overlay badge */}
                  {done && (
                    <div style={{ position: 'absolute', top: 12, right: 12, background: '#22c55e22', border: '1px solid #22c55e60', borderRadius: 20, padding: '0.25rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <CheckCircle size={12} color="#22c55e"/>
                      <span style={{ color: '#22c55e', fontSize: '0.72rem', fontWeight: 700 }}>Done!</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ background: `${meta.color}22`, borderRadius: 10, padding: '0.5rem', display: 'flex' }}>
                      <Icon size={20} color={meta.color}/>
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>{meta.label}</div>
                      <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>{meta.instruction}</div>
                    </div>
                  </div>

                  {/* Prompt */}
                  {prompt && (
                    <div style={{ background: `${meta.color}10`, border: `1px solid ${meta.color}25`, borderRadius: 10, padding: '0.75rem', marginBottom: '0.75rem', color: '#fff', fontSize: '0.82rem', lineHeight: 1.5, fontStyle: 'italic' }}>
                      "{prompt}"
                    </div>
                  )}

                  {/* Result */}
                  {result && !result.error && (
                    <div style={{ background: result.score >= 70 ? '#22c55e12' : '#ef444412', border: `1px solid ${result.score >= 70 ? '#22c55e40' : '#ef444440'}`, borderRadius: 10, padding: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <Star size={14} color={result.score >= 70 ? '#22c55e' : '#ef4444'}/>
                        <span style={{ color: result.score >= 70 ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '0.85rem' }}>Score: {result.score}%</span>
                      </div>
                      <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.78rem' }}>{result.feedback}</div>
                    </div>
                  )}
                  {result?.error && (
                    <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.5rem' }}>{result.error}</div>
                  )}

                  {/* Input */}
                  {!done && (
                    <>
                      <textarea
                        value={exerciseInputs[type]}
                        onChange={e => setExerciseInputs(i => ({ ...i, [type]: e.target.value }))}
                        placeholder={type === 'grammar' ? 'Type the corrected sentence...' : type === 'listening' ? 'Type what you heard...' : 'Type your response here...'}
                        rows={3}
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border-color))', borderRadius: 10, padding: '0.75rem', color: '#fff', fontSize: '0.85rem', resize: 'none', outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', marginBottom: '0.75rem' }}
                        onFocus={e => e.target.style.borderColor = meta.color}
                        onBlur={e => e.target.style.borderColor = 'hsl(var(--border-color))'}
                      />
                      <button onClick={() => submitExercise(type)} disabled={isSubmitting || !exerciseInputs[type]?.trim()}
                        style={{ width: '100%', padding: '0.65rem', borderRadius: 10, border: 'none', background: isSubmitting || !exerciseInputs[type]?.trim() ? 'rgba(255,255,255,0.08)' : meta.color, color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: isSubmitting || !exerciseInputs[type]?.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                        {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <button onClick={fetchAll} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '0.82rem' }}>
            <RefreshCw size={14}/> Refresh progress
          </button>
        </>
      )}
    </div>
  );
}
