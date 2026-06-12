import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Mic, ChevronRight, ChevronDown, History, Star, Award, AlertCircle, CheckCircle, X, Send } from 'lucide-react';

const TYPE_COLORS = { hr: '#6366f1', technical: '#06b6d4', behavioral: '#f59e0b' };
const TYPE_LABELS = { hr: 'HR Interview', technical: 'Technical', behavioral: 'Behavioral' };

export default function InterviewPrep({ user }) {
  const [questions, setQuestions] = useState({ hr: [], technical: [], behavioral: [] });
  const [activeType, setActiveType] = useState('hr');
  const [selectedQ, setSelectedQ] = useState(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(null);

  // Session mode
  const [sessionMode, setSessionMode] = useState(false);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [sessionAnswers, setSessionAnswers] = useState([]);
  const [sessionFeedbacks, setSessionFeedbacks] = useState([]);
  const [sessionComplete, setSessionComplete] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [qData, histData] = await Promise.all([
        api.get('/api/practice/interview'),
        api.get('/api/practice/interview/history').catch(() => [])
      ]);
      setQuestions(qData || {});
      setHistory(Array.isArray(histData) ? histData : []);
    } catch (err) {
      setError('Failed to load interview questions.');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (q, ans, forSession = false) => {
    if (!ans?.trim()) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const result = await api.post('/api/practice/interview-eval', {
        question: q.question, answer: ans, type: activeType
      });
      if (forSession) {
        const newFeedbacks = [...sessionFeedbacks, result];
        const newAnswers = [...sessionAnswers, { question: q.question, answer: ans, scores: result.scores }];
        setSessionFeedbacks(newFeedbacks);
        setSessionAnswers(newAnswers);

        const qList = questions[activeType] || [];
        if (sessionIndex + 1 >= qList.length) {
          setSessionComplete(true);
        } else {
          setTimeout(() => {
            setSessionIndex(i => i + 1);
            setAnswer('');
            setFeedback(result);
          }, 400);
        }
      } else {
        setFeedback(result);
      }
    } catch (err) {
      setError('Evaluation failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const startSession = () => {
    setSessionMode(true);
    setSessionIndex(0);
    setSessionAnswers([]);
    setSessionFeedbacks([]);
    setSessionComplete(false);
    setAnswer('');
    setFeedback(null);
  };

  const saveSession = async () => {
    const avgScores = sessionFeedbacks.reduce((acc, fb) => {
      const s = fb.scores || {};
      acc.grammar += s.grammar || 0; acc.vocabulary += s.vocabulary || 0;
      acc.communication += s.communication || 0; acc.confidence += s.confidence || 0;
      return acc;
    }, { grammar: 0, vocabulary: 0, communication: 0, confidence: 0 });
    const n = sessionFeedbacks.length || 1;
    const overall = Math.round((avgScores.grammar + avgScores.communication) / (2 * n));
    try {
      await api.post('/api/practice/interview-session/save', {
        interviewType: activeType, questions: (questions[activeType] || []).map(q => q.question),
        answers: sessionAnswers.map(a => a.answer), scores: sessionAnswers.map(a => a.scores), overallScore: overall
      });
      const updated = await api.get('/api/practice/interview/history').catch(() => []);
      setHistory(updated);
      setSessionMode(false);
      setSessionComplete(false);
    } catch (_) {}
  };

  const currentSessionQ = (questions[activeType] || [])[sessionIndex];

  const ScoreBar = ({ label, value, color }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
        <span style={{ color: 'hsl(var(--text-muted))' }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4, transition: 'width 0.8s ease' }}/>
      </div>
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh', gap: '1rem' }}>
      <div style={{ width: 40, height: 40, border: '3px solid hsl(var(--border-color))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} className="spin-slow"/>
      <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Loading interview questions...</p>
    </div>
  );

  const qList = questions[activeType] || [];
  const typeColor = TYPE_COLORS[activeType];

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 900, margin: '0 auto' }} className="animate-slide-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>Interview Prep</h1>
          <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Practice HR, Technical & Behavioral interviews with AI feedback.</p>
        </div>
        <button onClick={() => setShowHistory(h => !h)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1.1rem', borderRadius: 10, border: '1px solid hsl(var(--border-color))', background: showHistory ? 'rgba(99,102,241,0.15)' : 'transparent', color: showHistory ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          <History size={15}/> History ({history.length})
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '1rem', color: '#ef4444', marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={16}/> {error}
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 16, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={16}/> Past Sessions
          </div>
          {history.length === 0 ? (
            <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No sessions yet. Complete an interview to see history.</div>
          ) : history.map((s, i) => (
            <div key={s.id || i} style={{ borderTop: i > 0 ? '1px solid hsl(var(--border-color))' : 'none', paddingTop: i > 0 ? '0.75rem' : 0, marginTop: i > 0 ? '0.75rem' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setExpandedHistory(expandedHistory === i ? null : i)}>
                <span style={{ background: `${TYPE_COLORS[s.interview_type] || '#6366f1'}22`, color: TYPE_COLORS[s.interview_type] || '#6366f1', borderRadius: 20, padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>{s.interview_type || 'hr'}</span>
                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem' }}>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</span>
                <span style={{ marginLeft: 'auto', background: `${s.overall_score >= 80 ? '#22c55e' : s.overall_score >= 60 ? '#f59e0b' : '#ef4444'}22`, color: s.overall_score >= 80 ? '#22c55e' : s.overall_score >= 60 ? '#f59e0b' : '#ef4444', borderRadius: 20, padding: '0.2rem 0.7rem', fontSize: '0.75rem', fontWeight: 700 }}>{s.overall_score || 0}%</span>
                <ChevronDown size={14} color="hsl(var(--text-muted))" style={{ transform: expandedHistory === i ? 'rotate(180deg)' : 'none', transition: '0.2s' }}/>
              </div>
              {expandedHistory === i && (
                <div style={{ marginTop: '0.75rem', paddingLeft: '0.5rem' }}>
                  {(s.questionsJson || []).map((q, qi) => (
                    <div key={qi} style={{ marginBottom: '0.5rem', color: 'hsl(var(--text-secondary))', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 600, color: '#fff', marginBottom: '0.2rem' }}>Q{qi+1}: {q}</div>
                      {(s.answersJson || [])[qi] && <div style={{ color: 'hsl(var(--text-muted))' }}>A: {(s.answersJson || [])[qi]}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Type Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {Object.keys(TYPE_LABELS).map(t => {
          const c = TYPE_COLORS[t];
          const active = activeType === t;
          return (
            <button key={t} onClick={() => { setActiveType(t); setSelectedQ(null); setFeedback(null); setSessionMode(false); }} style={{ padding: '0.5rem 1.2rem', borderRadius: 20, border: `1px solid ${active ? c : 'hsl(var(--border-color))'}`, background: active ? `${c}22` : 'transparent', color: active ? c : 'hsl(var(--text-muted))', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s' }}>
              {TYPE_LABELS[t]}
            </button>
          );
        })}
      </div>

      {/* Session Mode */}
      {sessionMode && !sessionComplete && currentSessionQ && (
        <div style={{ background: 'hsl(var(--bg-card))', border: `1px solid ${typeColor}40`, borderRadius: 18, padding: '1.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span style={{ background: `${typeColor}22`, color: typeColor, borderRadius: 20, padding: '0.25rem 0.85rem', fontSize: '0.78rem', fontWeight: 700 }}>Question {sessionIndex + 1}/{qList.length}</span>
            <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem' }}>Session Mode</span>
          </div>
          <div style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '0.75rem' }}>{currentSessionQ.question}</div>
          {currentSessionQ.tips && <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '1rem', borderLeft: `3px solid ${typeColor}`, paddingLeft: '0.75rem' }}>💡 {currentSessionQ.tips}</div>}
          <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type your answer here..." rows={5}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border-color))', borderRadius: 12, padding: '0.85rem', color: '#fff', fontSize: '0.88rem', resize: 'vertical', outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', marginBottom: '1rem' }}/>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => submitAnswer(currentSessionQ, answer, true)} disabled={submitting || !answer.trim()}
              style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: 'none', background: submitting || !answer.trim() ? 'rgba(255,255,255,0.08)' : typeColor, color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: submitting || !answer.trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
              {submitting ? 'Evaluating...' : sessionIndex + 1 < qList.length ? 'Submit & Next →' : 'Submit & Finish'}
            </button>
            <button onClick={() => setSessionMode(false)} style={{ padding: '0.75rem 1.25rem', borderRadius: 12, border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}>Exit</button>
          </div>
        </div>
      )}

      {/* Session Complete */}
      {sessionMode && sessionComplete && (
        <div style={{ background: 'hsl(var(--bg-card))', border: '1px solid #22c55e40', borderRadius: 18, padding: '2rem', marginBottom: '1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <Award size={40} color="#22c55e" style={{ marginBottom: '0.75rem' }}/>
            <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.4rem' }}>Session Complete!</div>
            <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.88rem' }}>You answered all {qList.length} questions.</div>
          </div>
          {sessionFeedbacks.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {Object.entries(sessionFeedbacks.reduce((acc, fb) => {
                const s = fb.scores || {};
                ['grammar', 'vocabulary', 'communication', 'confidence'].forEach(k => { acc[k] = (acc[k] || 0) + (s[k] || 0); });
                return acc;
              }, {})).map(([key, total]) => {
                const avg = Math.round(total / sessionFeedbacks.length);
                const scoreColors = { grammar: '#6366f1', vocabulary: '#06b6d4', communication: '#22c55e', confidence: '#f59e0b' };
                return <ScoreBar key={key} label={key.charAt(0).toUpperCase() + key.slice(1)} value={avg} color={scoreColors[key] || '#6366f1'}/>;
              })}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={saveSession} style={{ flex: 1, padding: '0.75rem', borderRadius: 12, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>Save Session</button>
            <button onClick={() => { setSessionMode(false); setSessionComplete(false); }} style={{ padding: '0.75rem 1.25rem', borderRadius: 12, border: '1px solid hsl(var(--border-color))', background: 'transparent', color: 'hsl(var(--text-muted))', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {/* Questions List */}
      {!sessionMode && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
            <button onClick={startSession} style={{ padding: '0.65rem 1.4rem', borderRadius: 12, border: 'none', background: typeColor, color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Star size={15}/> Start Full Session
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {qList.map((q, i) => (
              <div key={q.id} onClick={() => { setSelectedQ(selectedQ?.id === q.id ? null : q); setFeedback(null); setAnswer(''); }}
                style={{ background: 'hsl(var(--bg-card))', border: `1px solid ${selectedQ?.id === q.id ? typeColor : 'hsl(var(--border-color))'}`, borderRadius: 16, padding: '1.25rem 1.5rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ background: `${typeColor}22`, color: typeColor, borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>{i+1}</span>
                  <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.92rem', flex: 1 }}>{q.question}</span>
                  <ChevronRight size={16} color="hsl(var(--text-muted))" style={{ transform: selectedQ?.id === q.id ? 'rotate(90deg)' : 'none', transition: '0.2s' }}/>
                </div>

                {selectedQ?.id === q.id && (
                  <div onClick={e => e.stopPropagation()} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid hsl(var(--border-color))' }}>
                    {q.tips && <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', fontStyle: 'italic', marginBottom: '1rem', borderLeft: `3px solid ${typeColor}`, paddingLeft: '0.75rem' }}>💡 {q.tips}</div>}
                    <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type your answer here..." rows={4}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid hsl(var(--border-color))', borderRadius: 10, padding: '0.75rem', color: '#fff', fontSize: '0.85rem', resize: 'vertical', outline: 'none', fontFamily: 'var(--font-sans)', boxSizing: 'border-box', marginBottom: '0.75rem' }}/>
                    <button onClick={() => submitAnswer(q, answer, false)} disabled={submitting || !answer.trim()}
                      style={{ padding: '0.65rem 1.4rem', borderRadius: 10, border: 'none', background: submitting || !answer.trim() ? 'rgba(255,255,255,0.08)' : typeColor, color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: submitting || !answer.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Send size={14}/> {submitting ? 'Evaluating...' : 'Get Feedback'}
                    </button>

                    {feedback && (
                      <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border-color))', borderRadius: 12, padding: '1rem' }}>
                        {feedback.feedbackText && <p style={{ color: '#fff', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>{feedback.feedbackText}</p>}
                        {feedback.confidenceAnalysis && <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.75rem', fontStyle: 'italic' }}>{feedback.confidenceAnalysis}</p>}
                        {feedback.scores && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                            {Object.entries(feedback.scores).map(([k, v]) => {
                              const sc = { grammar: '#6366f1', vocabulary: '#06b6d4', communication: '#22c55e', confidence: '#f59e0b' };
                              return <ScoreBar key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={v} color={sc[k] || '#6366f1'}/>;
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
        <span style={{ color: 'hsl(var(--text-muted))' }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 4, transition: 'width 0.8s ease' }}/>
      </div>
    </div>
  );
}
