import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { BookOpen, CheckCircle, Volume2, Star, AlertCircle, RefreshCw, ChevronRight, Award, X } from 'lucide-react';

export default function VocabBuilder({ user }) {
  const [dailyWords, setDailyWords] = useState([]);
  const [learnedWords, setLearnedWords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [markingWord, setMarkingWord] = useState(null);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizError, setQuizError] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [daily, learned, statsData] = await Promise.all([
        api.get('/api/vocab/daily'),
        api.get('/api/vocab/learned-list'),
        api.get('/api/vocab/stats').catch(() => null)
      ]);
      setDailyWords(Array.isArray(daily) ? daily : []);
      setLearnedWords(Array.isArray(learned) ? learned : []);
      setStats(statsData);
    } catch (err) {
      setError('Failed to load vocabulary data.');
    } finally {
      setLoading(false);
    }
  };

  const markLearned = async (word) => {
    setMarkingWord(word.word);
    try {
      await api.post('/api/vocab/learned', {
        word: word.word, meaning: word.meaning,
        example: word.example, synonyms: word.synonyms,
        pronunciationGuide: word.pronunciationGuide
      });
      setDailyWords(prev => prev.map(w => w.word === word.word ? { ...w, isLearned: true } : w));
      // Refresh stats
      const s = await api.get('/api/vocab/stats').catch(() => null);
      setStats(s);
    } catch (_) {
      setError('Failed to mark word as learned.');
    } finally {
      setMarkingWord(null);
    }
  };

  const loadQuiz = async () => {
    setLoadingQuiz(true);
    setQuizError('');
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizResult(null);
    try {
      const q = await api.get('/api/vocab/quiz');
      setQuizQuestions(q);
    } catch (err) {
      setQuizError(err?.message || 'Learn at least 4 words to unlock the quiz!');
    } finally {
      setLoadingQuiz(false);
    }
  };

  const submitQuiz = async () => {
    if (Object.keys(quizAnswers).length < quizQuestions.length) {
      setQuizError('Please answer all questions before submitting.');
      return;
    }
    try {
      const answers = quizQuestions.map(q => ({
        wordId: q.wordId, word: q.word,
        selectedAnswer: quizAnswers[q.wordId],
        correctAnswer: q.correctMeaning
      }));
      const result = await api.post('/api/vocab/quiz/submit', { answers });
      setQuizResult(result);
      setQuizSubmitted(true);
    } catch (_) {
      setQuizError('Failed to submit quiz. Try again.');
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utt = new SpeechSynthesisUtterance(text);
      utt.rate = 0.85;
      window.speechSynthesis.speak(utt);
    }
  };

  const filteredLearned = learnedWords.filter(w => w.word?.toLowerCase().includes(searchQuery.toLowerCase()) || w.meaning?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (loading) return (
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '60vh', gap: '1rem' }}>
      <div style={{ width: 40, height: 40, border: '3px solid hsl(var(--border-color))', borderTopColor: 'hsl(var(--primary))', borderRadius: '50%' }} className="spin-slow"/>
      <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Loading vocabulary...</p>
    </div>
  );

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: 960, margin: '0 auto' }} className="animate-slide-in">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '0.25rem' }}>Vocabulary Builder</h1>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '0.9rem' }}>Learn new words daily, test yourself, and build your vocabulary library.</p>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Learned', value: stats.totalLearned || 0, color: '#22c55e' },
            { label: 'Today', value: stats.todayLearned || 0, color: '#6366f1' },
            { label: 'This Week', value: stats.weekLearned || 0, color: '#06b6d4' },
            { label: 'Total Words', value: stats.totalWords || 24, color: '#f59e0b' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 14, padding: '1rem 1.25rem' }}>
              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', marginBottom: '0.3rem' }}>{label}</div>
              <div style={{ color, fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'hsl(var(--bg-card))', borderRadius: 12, padding: '0.4rem', width: 'fit-content' }}>
        {[{ key: 'daily', label: 'Daily Words' }, { key: 'library', label: `My Library (${learnedWords.length})` }, { key: 'quiz', label: '📝 Quiz' }].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ padding: '0.5rem 1.1rem', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', background: activeTab === t.key ? 'hsl(var(--primary))' : 'transparent', color: activeTab === t.key ? '#fff' : 'hsl(var(--text-muted))', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '0.85rem 1rem', color: '#ef4444', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertCircle size={15}/> {error}</div>}

      {/* ── DAILY WORDS ── */}
      {activeTab === 'daily' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {dailyWords.map((word, i) => (
            <div key={i} style={{ background: 'hsl(var(--bg-card))', border: `1px solid ${word.isLearned ? '#22c55e50' : 'hsl(var(--border-color))'}`, borderRadius: 18, padding: '1.5rem', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
              {word.isLearned && (
                <div style={{ position: 'absolute', top: 12, right: 12, background: '#22c55e22', border: '1px solid #22c55e50', borderRadius: 20, padding: '0.2rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <CheckCircle size={11} color="#22c55e"/>
                  <span style={{ color: '#22c55e', fontSize: '0.7rem', fontWeight: 700 }}>Learned</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ color: '#fff', fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '0.2rem' }}>{word.word}</div>
                  <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem', fontStyle: 'italic' }}>{word.pronunciationGuide}</div>
                </div>
                <button onClick={() => speak(word.word)} style={{ marginLeft: 'auto', marginTop: '0.25rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '0.4rem', color: 'hsl(var(--primary))', cursor: 'pointer', display: 'flex' }}>
                  <Volume2 size={14}/>
                </button>
              </div>

              <div style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>{word.meaning}</div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.6rem 0.85rem', marginBottom: '0.75rem' }}>
                <span style={{ color: 'hsl(var(--text-muted))', fontSize: '0.75rem' }}>Example: </span>
                <span style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.8rem', fontStyle: 'italic' }}>"{word.example}"</span>
              </div>

              {word.synonyms?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {word.synonyms.slice(0, 3).map((s, si) => (
                    <span key={si} style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4', borderRadius: 20, padding: '0.2rem 0.65rem', fontSize: '0.72rem', fontWeight: 600 }}>{s}</span>
                  ))}
                </div>
              )}

              {!word.isLearned && (
                <button onClick={() => markLearned(word)} disabled={markingWord === word.word}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: 10, border: 'none', background: markingWord === word.word ? 'rgba(255,255,255,0.08)' : 'hsl(var(--primary))', color: '#fff', fontWeight: 700, fontSize: '0.82rem', cursor: markingWord === word.word ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                  {markingWord === word.word ? 'Saving...' : '✓ Mark as Learned'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── MY LIBRARY ── */}
      {activeTab === 'library' && (
        <>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search your vocabulary library..."
            style={{ width: '100%', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 12, padding: '0.75rem 1rem', color: '#fff', fontSize: '0.88rem', outline: 'none', fontFamily: 'var(--font-sans)', marginBottom: '1rem', boxSizing: 'border-box' }}/>
          {filteredLearned.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'hsl(var(--text-muted))' }}>
              {learnedWords.length === 0 ? 'Your library is empty. Start learning words in Daily Words!' : 'No words match your search.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {filteredLearned.map((word, i) => (
                <div key={i} style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 14, padding: '1.1rem 1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>{word.word}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'hsl(var(--text-muted))', fontSize: '0.72rem' }}>
                      <Star size={11} color="#f59e0b"/> {word.reviewedCount || 1}x
                    </div>
                  </div>
                  <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.8rem', lineHeight: 1.4 }}>{word.meaning}</div>
                  {word.dateLearned && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', marginTop: '0.4rem' }}>Learned {word.dateLearned}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── QUIZ TAB ── */}
      {activeTab === 'quiz' && (
        <>
          {quizQuestions.length === 0 && !quizSubmitted && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Vocabulary Quiz</div>
              <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.88rem', marginBottom: '1.5rem' }}>Test yourself on the words you've learned. You need at least 4 learned words.</div>
              {quizError && <div style={{ color: '#f59e0b', fontSize: '0.85rem', marginBottom: '1rem', background: 'rgba(245,158,11,0.1)', borderRadius: 10, padding: '0.75rem' }}>{quizError}</div>}
              <button onClick={loadQuiz} disabled={loadingQuiz} style={{ padding: '0.8rem 2rem', borderRadius: 12, border: 'none', background: loadingQuiz ? 'rgba(255,255,255,0.08)' : 'hsl(var(--primary))', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: loadingQuiz ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                {loadingQuiz ? <><span className="spin-slow" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }}/> Generating...</> : '🎯 Generate Quiz'}
              </button>
            </div>
          )}

          {quizQuestions.length > 0 && !quizSubmitted && (
            <>
              {quizError && <div style={{ color: '#ef4444', fontSize: '0.82rem', marginBottom: '1rem' }}>{quizError}</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {quizQuestions.map((q, qi) => (
                  <div key={q.wordId} style={{ background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 18, padding: '1.5rem' }}>
                    <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.78rem', marginBottom: '0.5rem' }}>Question {qi + 1} of {quizQuestions.length}</div>
                    <div style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '1.25rem' }}>{q.word}</div>
                    <div style={{ color: 'hsl(var(--text-muted))', fontSize: '0.82rem', marginBottom: '0.75rem' }}>What does this word mean?</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {q.options.map((opt, oi) => {
                        const selected = quizAnswers[q.wordId] === opt;
                        return (
                          <button key={oi} onClick={() => setQuizAnswers(a => ({ ...a, [q.wordId]: opt }))}
                            style={{ padding: '0.75rem 1rem', borderRadius: 10, border: `1px solid ${selected ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'}`, background: selected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', color: selected ? '#fff' : 'hsl(var(--text-secondary))', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.15s', fontWeight: selected ? 600 : 400 }}>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={submitQuiz} style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem', borderRadius: 12, border: 'none', background: 'hsl(var(--primary))', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                Submit Quiz →
              </button>
            </>
          )}

          {quizSubmitted && quizResult && (
            <div>
              <div style={{ textAlign: 'center', background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-color))', borderRadius: 20, padding: '2rem', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8"/>
                    <circle cx="50" cy="50" r="42" fill="none" stroke={quizResult.score >= 80 ? '#22c55e' : quizResult.score >= 60 ? '#f59e0b' : '#ef4444'} strokeWidth="8"
                      strokeDasharray={`${(quizResult.score / 100) * 264} 264`} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 1s ease' }}/>
                    <text x="50" y="55" textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800">{quizResult.score}%</text>
                  </svg>
                </div>
                <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.3rem' }}>
                  {quizResult.correct}/{quizResult.total} Correct
                </div>
                <div style={{ color: quizResult.score >= 80 ? '#22c55e' : quizResult.score >= 60 ? '#f59e0b' : '#ef4444', fontSize: '0.9rem', fontWeight: 600 }}>
                  {quizResult.score >= 80 ? '🎉 Excellent!' : quizResult.score >= 60 ? '👍 Good job!' : '📚 Keep practicing!'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {(quizResult.results || []).map((r, i) => (
                  <div key={i} style={{ background: 'hsl(var(--bg-card))', border: `1px solid ${r.isCorrect ? '#22c55e40' : '#ef444440'}`, borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ marginTop: '2px' }}>{r.isCorrect ? <CheckCircle size={18} color="#22c55e"/> : <X size={18} color="#ef4444"/>}</div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{r.word}</div>
                      {!r.isCorrect && <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>You chose: {r.selectedAnswer}</div>}
                      <div style={{ color: '#22c55e', fontSize: '0.8rem' }}>Correct: {r.correctAnswer}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => { setQuizSubmitted(false); setQuizResult(null); setQuizQuestions([]); setQuizAnswers({}); }} style={{ width: '100%', padding: '0.8rem', borderRadius: 12, border: 'none', background: 'hsl(var(--primary))', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                <RefreshCw size={15} style={{ display: 'inline', marginRight: '0.5rem' }}/> Try Again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
