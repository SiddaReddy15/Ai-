import express from 'express';
import { db, executeWithRetry } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Fallback vocab list if DB is empty
const FALLBACK_VOCAB = {
  beginner: [
    { word: 'Frequent', meaning: 'Happening often or repeatedly.', example: 'He is a frequent visitor.', synonyms: ['Often', 'Common', 'Regular'], pronunciationGuide: '/ˈfriːkwənt/', level: 'beginner' },
    { word: 'Assist', meaning: 'To help someone.', example: 'The guide will assist you.', synonyms: ['Help', 'Aid', 'Support'], pronunciationGuide: '/əˈsɪst/', level: 'beginner' },
    { word: 'Attempt', meaning: 'An act of trying.', example: 'She made an attempt to climb.', synonyms: ['Try', 'Effort', 'Endeavor'], pronunciationGuide: '/əˈtempt/', level: 'beginner' },
    { word: 'Gigantic', meaning: 'Extremely large.', example: 'A gigantic ship in the harbor.', synonyms: ['Huge', 'Massive', 'Enormous'], pronunciationGuide: '/dʒaɪˈɡæntɪk/', level: 'beginner' },
    { word: 'Brief', meaning: 'Lasting a short time.', example: 'A brief explanation.', synonyms: ['Short', 'Quick', 'Concise'], pronunciationGuide: '/briːf/', level: 'beginner' }
  ],
  intermediate: [
    { word: 'Accumulate', meaning: 'To gather over time.', example: 'Dust will accumulate.', synonyms: ['Gather', 'Collect', 'Amass'], pronunciationGuide: '/əˈkjuːmjəleɪt/', level: 'intermediate' },
    { word: 'Elaborate', meaning: 'Involving many details.', example: 'An elaborate dinner.', synonyms: ['Detailed', 'Intricate', 'Complex'], pronunciationGuide: '/ɪˈlæbərət/', level: 'intermediate' },
    { word: 'Reluctant', meaning: 'Unwilling and hesitant.', example: 'She was reluctant.', synonyms: ['Unwilling', 'Hesitant', 'Averse'], pronunciationGuide: '/rɪˈlʌktənt/', level: 'intermediate' },
    { word: 'Consistent', meaning: 'Acting reliably over time.', example: 'Consistent performance.', synonyms: ['Steady', 'Regular', 'Constant'], pronunciationGuide: '/kənˈsɪstənt/', level: 'intermediate' },
    { word: 'Evaluate', meaning: 'To assess or judge.', example: 'Evaluate all applications.', synonyms: ['Assess', 'Appraise', 'Judge'], pronunciationGuide: '/ɪˈvæljueɪt/', level: 'intermediate' }
  ],
  advanced: [
    { word: 'Ambiguous', meaning: 'Open to interpretation.', example: 'Instructions were ambiguous.', synonyms: ['Unclear', 'Vague', 'Equivocal'], pronunciationGuide: '/æmˈbɪɡjuəs/', level: 'advanced' },
    { word: 'Pragmatic', meaning: 'Dealing with things practically.', example: 'A pragmatic approach.', synonyms: ['Practical', 'Realistic', 'Sensible'], pronunciationGuide: '/præɡˈmætɪk/', level: 'advanced' },
    { word: 'Substantial', meaning: 'Of considerable value.', example: 'Substantial funding received.', synonyms: ['Significant', 'Considerable', 'Sizable'], pronunciationGuide: '/səbˈstænʃl/', level: 'advanced' },
    { word: 'Indispensable', meaning: 'Absolutely necessary.', example: 'An indispensable tool.', synonyms: ['Essential', 'Crucial', 'Vital'], pronunciationGuide: '/ˌɪndɪˈspensəbl/', level: 'advanced' },
    { word: 'Exacerbate', meaning: 'To make worse.', example: 'Will exacerbate your cold.', synonyms: ['Aggravate', 'Worsen', 'Inflame'], pronunciationGuide: '/ɪɡˈzæsərbeɪt/', level: 'advanced' }
  ]
};

// ── Daily words ────────────────────────────────────────────────────────────────
router.get('/daily', authMiddleware, async (req, res) => {
  try {
    const user = await db.findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const level = user.englishLevel || 'beginner';
    const safeLevel = ['beginner', 'intermediate', 'advanced', 'expert'].includes(level) ? (level === 'expert' ? 'advanced' : level) : 'beginner';

    // Get from vocabulary_words table first
    const dbWords = await executeWithRetry({ sql: `SELECT * FROM vocabulary_words WHERE level = ?`, args: [safeLevel] });

    let wordsList = dbWords.rows.length >= 5 ? dbWords.rows.map(w => ({
      id: w.id, word: w.word, meaning: w.meaning, example: w.example,
      synonyms: (() => { try { return JSON.parse(w.synonyms); } catch(_) { return []; } })(),
      pronunciationGuide: w.pronunciation_guide, level: w.level
    })) : FALLBACK_VOCAB[safeLevel] || FALLBACK_VOCAB.beginner;

    // Rotate 5 words per day
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const startIndex = (dayOfYear * 2) % wordsList.length;
    const dailyWords = [];
    for (let i = 0; i < 5; i++) dailyWords.push(wordsList[(startIndex + i) % wordsList.length]);

    // Mark learned status from both tables
    const learnedLegacy = await db.find('vocab_learned', { userId: user.id });
    const learnedWords = new Set(learnedLegacy.map(v => v.word?.toLowerCase()));

    const uvRows = await executeWithRetry({ sql: `SELECT word FROM user_vocabulary WHERE user_id = ? AND status = 'learned'`, args: [user.id] });
    uvRows.rows.forEach(r => learnedWords.add((r.word || '').toLowerCase()));

    const result = dailyWords.map(w => ({ ...w, isLearned: learnedWords.has((w.word || '').toLowerCase()) }));
    res.json(result);
  } catch (error) {
    console.error('Daily vocab error:', error);
    res.status(500).json({ error: 'Server error fetching vocabulary' });
  }
});

// ── Mark word learned ──────────────────────────────────────────────────────────
router.post('/learned', authMiddleware, async (req, res) => {
  const { word, meaning, example, synonyms, pronunciationGuide, wordId } = req.body;
  if (!word) return res.status(400).json({ error: 'Word is required' });

  try {
    const user = await db.findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = new Date().toISOString().split('T')[0];

    // Update legacy vocab_learned
    const existing = await db.findOne('vocab_learned', { userId: user.id, word });
    if (existing) {
      await db.update('vocab_learned', existing.id, { reviewedCount: (existing.reviewedCount || 0) + 1, lastReviewedDate: today });
    } else {
      await db.insert('vocab_learned', { userId: user.id, word, meaning: meaning || '', example: example || '', synonyms: synonyms || [], pronunciationGuide: pronunciationGuide || '', dateLearned: today, reviewedCount: 1, lastReviewedDate: today });
    }

    // Update user_vocabulary table
    const uvExist = await executeWithRetry({ sql: `SELECT id, reviewed_count FROM user_vocabulary WHERE user_id = ? AND word = ? LIMIT 1`, args: [user.id, word] });
    if (uvExist.rows.length > 0) {
      await db.update('user_vocabulary', uvExist.rows[0].id, { status: 'learned', reviewedCount: (uvExist.rows[0].reviewed_count || 0) + 1, lastReviewedDate: today, learnedAt: today });
    } else {
      await db.insert('user_vocabulary', { userId: user.id, wordId: wordId || word, word, status: 'learned', reviewedCount: 1, lastReviewedDate: today, learnedAt: today });
    }

    await db.insert('activity_logs', { userId: user.id, action: 'vocab_learned', details: `Learned word: ${word}` });

    // Import and reward XP dynamically, check achievements
    const { addXp, checkAchievements } = await import('../utils/gamification.js');
    const xpResult = await addXp(user.id, 5);
    await checkAchievements(user.id);

    const responseData = { message: 'Vocabulary marked as learned', word, status: existing ? 'updated' : 'created' };
    if (xpResult && xpResult.leveledUp) {
      responseData.levelUpgraded = { from: user.englishLevel || 'beginner', to: xpResult.level };
    }

    res.status(201).json(responseData);
  } catch (error) {
    console.error('Learned vocab error:', error);
    res.status(500).json({ error: 'Server error logging vocabulary' });
  }
});

// ── Learned list ───────────────────────────────────────────────────────────────
router.get('/learned-list', authMiddleware, async (req, res) => {
  try {
    const learned = await db.find('vocab_learned', { userId: req.user.id });
    const uvRows = await executeWithRetry({ sql: `SELECT * FROM user_vocabulary WHERE user_id = ? AND status = 'learned' ORDER BY learned_at DESC`, args: [req.user.id] });

    const legacyWords = new Set(learned.map(v => v.word?.toLowerCase()));
    const extras = uvRows.rows.filter(r => !legacyWords.has((r.word || '').toLowerCase())).map(r => ({
      id: r.id, userId: r.user_id, word: r.word, meaning: '', example: '',
      synonyms: [], dateLearned: r.learned_at, reviewedCount: r.reviewed_count
    }));

    res.json([...learned, ...extras]);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching learned vocabulary' });
  }
});

// ── Quiz generate ──────────────────────────────────────────────────────────────
router.get('/quiz', authMiddleware, async (req, res) => {
  try {
    const learned = await db.find('vocab_learned', { userId: req.user.id });
    if (learned.length < 4) return res.status(400).json({ error: 'Learn at least 4 words to unlock the quiz!', needMore: true });

    // Get all vocab for wrong-answer pool
    const allVocab = await db.read('vocabulary_words');
    const allMeanings = [...new Set([...allVocab.map(v => v.meaning), ...learned.map(v => v.meaning)])].filter(Boolean);

    // Pick 5 random learned words for quiz
    const shuffled = [...learned].sort(() => Math.random() - 0.5).slice(0, 5);

    const questions = shuffled.map(w => {
      const correct = w.meaning || 'No definition available';
      const wrongPool = allMeanings.filter(m => m !== correct).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [correct, ...wrongPool].sort(() => Math.random() - 0.5);
      return {
        wordId: w.id, word: w.word, correctMeaning: correct,
        options, questionType: 'meaning'
      };
    });

    res.json(questions);
  } catch (error) {
    console.error('Quiz generate error:', error);
    res.status(500).json({ error: 'Server error generating quiz' });
  }
});

// ── Quiz submit ────────────────────────────────────────────────────────────────
router.post('/quiz/submit', authMiddleware, async (req, res) => {
  const { answers } = req.body;
  if (!answers || !Array.isArray(answers)) return res.status(400).json({ error: 'Answers array required' });

  try {
    const today = new Date().toISOString().split('T')[0];
    let correct = 0;
    const results = answers.map(a => {
      const isCorrect = a.selectedAnswer === a.correctAnswer;
      if (isCorrect) correct++;
      return { ...a, isCorrect };
    });
    const score = Math.round((correct / answers.length) * 100);

    // Log to practice_sessions
    await db.insert('practice_sessions', {
      userId: req.user.id, sessionType: 'vocab_quiz',
      durationMs: answers.length * 15000,
      wordsSpoken: 0, grammarScore: 0,
      vocabularyScore: score, pronunciationScore: 0, fluencyScore: 0
    });

    await db.insert('activity_logs', { userId: req.user.id, action: 'vocab_quiz', details: `Quiz completed. Score: ${correct}/${answers.length}` });

    // Import and reward XP dynamically, check achievements
    const { addXp, checkAchievements } = await import('../utils/gamification.js');
    const xpResult = await addXp(req.user.id, 15);
    await checkAchievements(req.user.id);

    const user = await db.findOne('users', { id: req.user.id });
    const responseData = { score, total: answers.length, correct, results };
    if (xpResult && xpResult.leveledUp) {
      responseData.levelUpgraded = { from: user?.englishLevel || 'beginner', to: xpResult.level };
    }

    res.json(responseData);
  } catch (error) {
    console.error('Quiz submit error:', error);
    res.status(500).json({ error: 'Server error submitting quiz' });
  }
});

// ── Vocab stats ────────────────────────────────────────────────────────────────
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const totalResult = await executeWithRetry({ sql: `SELECT COUNT(*) as cnt FROM vocab_learned WHERE user_id = ?`, args: [userId] });
    const todayResult = await executeWithRetry({ sql: `SELECT COUNT(*) as cnt FROM vocab_learned WHERE user_id = ? AND date_learned = ?`, args: [userId, today] });
    const weekResult = await executeWithRetry({ sql: `SELECT COUNT(*) as cnt FROM vocab_learned WHERE user_id = ? AND date_learned >= ?`, args: [userId, weekAgo] });
    const totalWordsResult = await executeWithRetry(`SELECT COUNT(*) as cnt FROM vocabulary_words`);

    const byLevelResult = await executeWithRetry({ sql: `SELECT vw.level, COUNT(*) as cnt FROM vocab_learned vl LEFT JOIN vocabulary_words vw ON vl.word = vw.word WHERE vl.user_id = ? GROUP BY vw.level`, args: [userId] });

    const byLevel = {};
    byLevelResult.rows.forEach(r => { byLevel[r.level || 'beginner'] = Number(r.cnt); });

    res.json({
      totalLearned: Number(totalResult.rows[0]?.cnt || 0),
      totalWords: Number(totalWordsResult.rows[0]?.cnt || 24),
      todayLearned: Number(todayResult.rows[0]?.cnt || 0),
      weekLearned: Number(weekResult.rows[0]?.cnt || 0),
      byLevel
    });
  } catch (error) {
    console.error('Vocab stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
