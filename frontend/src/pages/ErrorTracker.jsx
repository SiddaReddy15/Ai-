import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { AlertCircle, CheckCircle, ChevronDown, TrendingUp, Mic, BookOpen, Volume2, PenLine, Search, RefreshCw } from 'lucide-react';

const CATEGORY_COLORS = { grammar: '#ef4444', pronunciation: '#f59e0b', vocabulary: '#6366f1', fluency: '#06b6d4' };
const CATEGORY_ICONS = { grammar: Mic, pronunciation: Volume2, vocabulary: BookOpen, fluency: PenLine };

export default function ErrorTracker({ user }) {
  const [mistakes, setMistakes] = useState([]);
  const [categorySummary, setCategorySummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTest, setActiveTest] = useState(null);
  const [testAnswer, setTestAnswer] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [weakExpanded, setWeakExpanded] = useState(true);

  useEffect(() => {
    fetchMistakes();
  }, []);

  const fetchMistakes = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/api/progress/mistakes');
      const all = data.mistakes || data || [];
      setMistakes(Array.isArray(all) ? all : []);
      setCategorySummary(data.categorySummary || {});
    } catch (err) {
      setError('Failed to load error tracker data.');
    } finally {
      setLoading(false);
    }
  };

  const resolveMistake = async (id, source) => {
    setResolving(id);
    try {
      await api.post('/api/progress/mistakes/resolve', { id, source });
      setMistakes(prev => prev.map(m => m.id === id ? { ...m, mastered: true } : m));
    } catch (_) {
      setError('Failed to mark as mastered.');
    } finally {
      setResolving(null);
    }
  };

  const runTest = (mistake) => {
    setActiveTest(mistake);
    setTestAnswer('');
    setTestResult(null);
  };

  const checkAnswer = () => {
    if (!activeTest || !testAnswer.trim()) return;
    const correct = activeTest.correctedText || activeTest.correctedSentence || '';
    const similarity = testAnswer.toLowerCase().trim() === correct.toLowerCase().trim();
    const partialWords = correct.toLowerCase().split(' ').filter(w => testAnswer.toLowerCase().includes(w)).length;
    const partialScore = Math.round((partialWords / correct.split(' ').length) * 100);
    setTestResult({ isCorrect: similarity, score: similarity ? 100 : partialScore, correct });
  };

  const activeMistakes = mistakes.filter(m => !m.mastered);
  const masteredMistakes = mistakes.filter(m => m.mastered);

  // Category filtering + search
  const filtered = activeMistakes
    .filter(m => activeCategory === 'all' || m.category === activeCategory)
    .filter(m => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (m.originalText || m.originalSentence || '').toLowerCase().includes(q) ||
             (m.correctedText || m.correctedSentence || '').toLowerCase().includes(q);
    })
    .sort((a, b) => (b.frequency || 1) - (a.frequency || 1));

  // Top 3 weak areas
  const weakAreas = Object.entries(categorySummary)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const totalErrors = activeMistakes.length;
  const mostFrequent = activeMistakes.sort((a, b) => (b.frequency || 1) - (a.frequency || 1))[0];

  if (loading) return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh', gap: '1rem' }}>
      <div style={{ width: 40, height: 40, border: '3px solid hsl(var(--border-color))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} className="spin-slow"/>
      <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Loading your error tracker...</p>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }} className="animate-slide-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>Error Tracker</h1>
          <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Track grammar mistakes, fix patterns, and build stronger speaking habits.</p>
        </div>
        <button onClick={fetchMistakes} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '0.82rem' }}>
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '0.85rem 1rem', color: '#ef4444', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={15}/>{error}</div>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Active Errors', value: activeMistakes.length, color: '#ef4444' },
          { label: 'Mastered', value: masteredMistakes.length, color: '#22c55e' },
          { label: 'Total Caught', value: mistakes.length, color: '#6366f1' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'hsl(var(--bg-card))', border: `1px solid ${color}30`, borderRadius: 14, padding: '1rem 1.25rem' }}>
            <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', marginBottom: '0.3rem' }}>{label}</div>
            <div style={{ color, fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Weak Areas Panel */}
      {weakAreas.length > 0 && (
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: weakExpanded ? '1rem' : 0, cursor: 'pointer' }} onClick={() => setWeakExpanded(e => !e)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
              <TrendingUp size={16} color="#f59e0b"/> Weak Areas
            </div>
            <ChevronDown size={16} color="hsl(var(--text-muted))" style={{ transform: weakExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}/>
          </div>
          {weakExpanded && (
            <>
              {mostFrequent && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Most Common Mistake</div>
                  <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}><span style={{ color: '#ef4444' }}>✗</span> {mostFrequent.originalText || mostFrequent.originalSentence}</div>
                  <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem', marginTop: '0.25rem' }}><span style={{ color: '#22c55e' }}>✓</span> {mostFrequent.correctedText || mostFrequent.correctedSentence}</div>
                </div>
              )}
              {weakAreas.map(([cat, count]) => {
                const c = CATEGORY_COLORS[cat] || '#6366f1';
                const pct = totalErrors > 0 ? Math.round((count / totalErrors) * 100) : 0;
                return (
                  <div key={cat} style={{ marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.78rem' }}>
                      <span style={{ color: '#fff', textTransform: 'capitalize', fontWeight: 500 }}>{cat}</span>
                      <span style={{ color: c, fontWeight: 700 }}>{count} errors ({pct}%)</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 4, transition: 'width 0.8s ease' }}/>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'grammar', 'pronunciation', 'vocabulary', 'fluency'].map(cat => {
          const c = cat === 'all' ? '#6366f1' : CATEGORY_COLORS[cat];
          const count = cat === 'all' ? activeMistakes.length : (categorySummary[cat] || 0);
          const active = activeCategory === cat;
          return (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem', borderRadius: 20, border: `1px solid ${active ? c : 'hsl(var(--border-color))'}`, background: active ? `${c}22` : 'transparent', color: active ? c : 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.2s' }}>
              {cat} <span style={{ background: `${c}30`, borderRadius: 10, padding: '0 0.4rem', fontSize: '0.7rem' }}>{count}</span>
            </button>
          );
        })}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}/>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search errors..."
            style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 20, padding: '0.4rem 0.9rem 0.4rem 2rem', color: '#fff', fontSize: '0.78rem', outline: 'none', width: 160 }}/>
        </div>
      </div>

      {/* Active Mistakes */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--text-muted))' }}>
          {activeMistakes.length === 0 ? '🎉 No active errors! Great job!' : 'No errors match your filter.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {filtered.map((m, i) => {
            const borderColor = CATEGORY_COLORS[m.category] || '#ef4444';
            const isTestOpen = activeTest?.id === m.id;
            return (
              <div key={m.id || i} style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderLeft: `4px solid ${borderColor}`, borderRadius: 14, padding: '1.1rem 1.25rem', position: 'relative' }}>
                {(m.frequency || 1) > 1 && (
                  <div style={{ position: 'absolute', top: 10, right: 12, background: `${borderColor}20`, color: borderColor, borderRadius: 20, padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 700 }}>
                    Repeated {m.frequency}×
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <span style={{ background: `${borderColor}18`, color: borderColor, borderRadius: 6, padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize' }}>{m.category || 'grammar'}</span>
                  {m.level && <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.72rem' }}>{m.level}</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <div>
                    <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', marginBottom: '0.2rem' }}>Original</div>
                    <div style={{ color: '#ef4444', fontSize: '0.85rem', lineHeight: 1.4 }}>{m.originalText || m.originalSentence}</div>
                  </div>
                  <div>
                    <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.7rem', marginBottom: '0.2rem' }}>Corrected</div>
                    <div style={{ color: '#22c55e', fontSize: '0.85rem', lineHeight: 1.4 }}>{m.correctedText || m.correctedSentence}</div>
                  </div>
                </div>
                {m.explanation && <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.75rem', borderTop: '1px solid hsl(var(--border-color))', paddingTop: '0.6rem' }}>{m.explanation}</div>}

                {isTestOpen && (
                  <div style={{ borderTop: '1px solid hsl(var(--border-color))', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                    <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', marginBottom: '0.5rem' }}>Type the corrected version:</div>
                    <input value={testAnswer} onChange={e => setTestAnswer(e.target.value)} placeholder="Enter corrected sentence..."
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border-color))', borderRadius: 8, padding: '0.6rem', color: '#fff', fontSize: '0.85rem', outline: 'none', marginBottom: '0.5rem', boxSizing: 'border-box' }}/>
                    {testResult && (
                      <div style={{ marginBottom: '0.5rem', color: testResult.isCorrect ? '#22c55e' : '#f59e0b', fontSize: '0.82rem', fontWeight: 600 }}>
                        {testResult.isCorrect ? '✓ Perfect!' : `Partial match: ${testResult.score}% — Correct: "${testResult.correct}"`}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={checkAnswer} style={{ flex: 1, padding: '0.55rem', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Check</button>
                      <button onClick={() => setActiveTest(null)} style={{ padding: '0.55rem 0.9rem', borderRadius: 8, border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-muted))', cursor: 'pointer', fontSize: '0.8rem' }}>Close</button>
                    </div>
                  </div>
                )}

                {!isTestOpen && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => runTest(m)} style={{ padding: '0.45rem 0.9rem', borderRadius: 8, border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.1)', color: '#6366f1', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>Practice Fix</button>
                    <button onClick={() => resolveMistake(m.id, m.source)} disabled={resolving === m.id}
                      style={{ padding: '0.45rem 0.9rem', borderRadius: 8, border: '1px solid rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontWeight: 600, fontSize: '0.78rem', cursor: resolving === m.id ? 'not-allowed' : 'pointer' }}>
                      {resolving === m.id ? 'Saving...' : '✓ Mastered'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mastered Section */}
      {masteredMistakes.length > 0 && (
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid #22c55e30', borderRadius: 16, padding: '1.25rem 1.5rem' }}>
          <div style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16}/> Mastered Corrections ({masteredMistakes.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {masteredMistakes.slice(0, 5).map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < Math.min(4, masteredMistakes.length - 1) ? '1px solid hsl(var(--border-color))' : 'none' }}>
                <CheckCircle size={14} color="#22c55e" style={{ flexShrink: 0 }}/>
                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.82rem' }}>{m.correctedText || m.correctedSentence}</span>
              </div>
            ))}
            {masteredMistakes.length > 5 && <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem', textAlign: 'center' }}>+{masteredMistakes.length - 5} more mastered</div>}
          </div>
        </div>
      )}
    </div>
  );
}
