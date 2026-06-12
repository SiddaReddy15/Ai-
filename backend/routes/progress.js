import express from 'express';
import { db, executeWithRetry } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ── Dashboard ──────────────────────────────────────────────────────────────────
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.findOne('users', { id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Pull from practice_sessions for accurate time + words
    const sessions = await db.find('practice_sessions', { userId });
    const totalSessionTimeMs = sessions.reduce((s, p) => s + (p.durationMs || 0), 0);
    const totalSessionWords = sessions.reduce((s, p) => s + (p.wordsSpoken || 0), 0);

    // Pull vocab learned from both tables
    const vocabLearned = await db.find('vocab_learned', { userId });
    const userVocab = await executeWithRetry({ sql: `SELECT COUNT(*) as cnt FROM user_vocabulary WHERE user_id = ? AND status = 'learned'`, args: [userId] });
    const vocabLearnedCount = vocabLearned.length + Number(userVocab.rows[0]?.cnt || 0);

    // Error tracker
    const errorsResult = await executeWithRetry({ sql: `SELECT COUNT(*) as cnt FROM error_tracker WHERE user_id = ? AND mastered = 0`, args: [userId] });
    const masteredResult = await executeWithRetry({ sql: `SELECT COUNT(*) as cnt FROM error_tracker WHERE user_id = ? AND mastered = 1`, args: [userId] });
    const oldMistakes = await db.find('mistakes', { userId });
    const activeErrorsCount = Number(errorsResult.rows[0]?.cnt || 0) + oldMistakes.filter(m => !m.mastered).length;
    const masteredErrorsCount = Number(masteredResult.rows[0]?.cnt || 0) + oldMistakes.filter(m => m.mastered).length;

    // Skill scores
    const skill = await db.findOne('skill_scores', { userId });

    // Merge practice_time from user row + session records
    const totalPracticeTimeMs = (user.totalPracticeTimeMs || 0) + totalSessionTimeMs;
    const totalWordsSpoken = (user.totalWordsSpoken || 0) + totalSessionWords;

    const stats = {
      totalPracticeTimeMs,
      dailyStreak: user.dailyStreak || 0,
      longestStreak: user.longestStreak || 0,
      vocabLearnedCount,
      totalWordsSpoken,
      totalSessions: sessions.length,
      grammarAccuracy: skill?.grammarAvg || 0,
      pronunciationScore: skill?.pronunciationAvg || 0,
      fluencyScore: skill?.fluencyAvg || 0,
      vocabularyScore: skill?.vocabularyAvg || 0,
      englishLevel: user.englishLevel || 'beginner',
      activeErrorsCount,
      masteredErrorsCount
    };

    // Weekly progress from user_progress
    const weeklyData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const dayRows = await executeWithRetry({
        sql: `SELECT AVG(grammar) as g, AVG(vocabulary) as v, AVG(pronunciation) as p, AVG(fluency) as f, SUM(words_spoken) as ws FROM user_progress WHERE user_id = ? AND date = ?`,
        args: [userId, dateString]
      });
      const row = dayRows.rows[0];

      weeklyData.push({
        day: dayName, date: dateString,
        grammar: Math.round(row?.g || 0),
        vocabulary: Math.round(row?.v || 0),
        pronunciation: Math.round(row?.p || 0),
        fluency: Math.round(row?.f || 0),
        wordsSpoken: Number(row?.ws || 0),
        active: (row?.g || 0) > 0
      });
    }

    const skillBreakdown = {
      grammar: skill?.grammarAvg || 0,
      vocabulary: skill?.vocabularyAvg || 0,
      pronunciation: skill?.pronunciationAvg || 0,
      fluency: skill?.fluencyAvg || 0,
      sessions: skill?.totalSessions || 0
    };

    res.json({ stats, weeklyProgress: weeklyData, skillBreakdown });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error fetching statistics' });
  }
});

// ── Activity log ───────────────────────────────────────────────────────────────
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const rows = await executeWithRetry({
      sql: `SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      args: [req.user.id]
    });
    res.json(rows.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching activity' });
  }
});

// ── Mistakes ───────────────────────────────────────────────────────────────────
router.get('/mistakes', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // Get from both tables
    const legacy = await db.find('mistakes', { userId });
    const tracker = await db.find('error_tracker', { userId });

    // Merge: legacy → add category='grammar', originalText from originalSentence
    const legacyMapped = legacy.map(m => ({
      id: m.id, userId: m.userId,
      category: 'grammar',
      originalText: m.originalSentence,
      correctedText: m.correctedSentence,
      explanation: m.explanation,
      frequency: 1,
      level: m.level,
      mastered: m.mastered,
      createdAt: m.createdAt,
      source: 'legacy'
    }));

    const trackerMapped = tracker.map(m => ({
      id: m.id, userId: m.userId,
      category: m.category || 'grammar',
      originalText: m.originalText,
      correctedText: m.correctedText,
      explanation: m.explanation,
      frequency: m.frequency || 1,
      level: m.level,
      mastered: m.mastered,
      createdAt: m.createdAt,
      source: 'tracker'
    }));

    const all = [...trackerMapped, ...legacyMapped];

    // Category summary
    const categorySummary = {};
    for (const m of all) {
      const cat = m.category || 'grammar';
      categorySummary[cat] = (categorySummary[cat] || 0) + 1;
    }

    res.json({ mistakes: all, categorySummary });
  } catch (error) {
    console.error('Mistakes error:', error);
    res.status(500).json({ error: 'Server error fetching mistakes' });
  }
});

// ── Resolve mistake ────────────────────────────────────────────────────────────
router.post('/mistakes/resolve', authMiddleware, async (req, res) => {
  const { id, source } = req.body;
  if (!id) return res.status(400).json({ error: 'Mistake ID is required' });

  try {
    if (source === 'tracker') {
      await db.update('error_tracker', id, { mastered: true });
    } else {
      await db.update('mistakes', id, { mastered: true });
    }
    res.json({ message: 'Marked as mastered', id });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating mistake' });
  }
});

// ── Monthly analytics ──────────────────────────────────────────────────────────
router.get('/analytics/monthly', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await executeWithRetry({
      sql: `SELECT date, grammar, vocabulary, pronunciation, fluency, words_spoken, practice_time_ms FROM user_progress WHERE user_id = ? ORDER BY date DESC LIMIT 30`,
      args: [userId]
    });
    res.json(rows.rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Daily practice ─────────────────────────────────────────────────────────────
router.get('/daily-practice/today', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const record = await executeWithRetry({
      sql: `SELECT * FROM daily_practice WHERE user_id = ? AND date = ? LIMIT 1`,
      args: [req.user.id, today]
    });
    res.json(record.rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/daily-practice', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const userId = req.user.id;
    const { speakingDone, readingDone, listeningDone, grammarDone, performanceScore } = req.body;

    const existing = await executeWithRetry({ sql: `SELECT * FROM daily_practice WHERE user_id = ? AND date = ? LIMIT 1`, args: [userId, today] });

    const done = [speakingDone, readingDone, listeningDone, grammarDone].filter(Boolean).length;
    const completionPercent = Math.round((done / 4) * 100);

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await db.update('daily_practice', id, { speakingDone: speakingDone ? 1 : 0, readingDone: readingDone ? 1 : 0, listeningDone: listeningDone ? 1 : 0, grammarDone: grammarDone ? 1 : 0, completionPercent, performanceScore: performanceScore || 0 });
      return res.json({ message: 'Updated', completionPercent });
    }

    await db.insert('daily_practice', { userId, date: today, speakingDone: speakingDone ? 1 : 0, readingDone: readingDone ? 1 : 0, listeningDone: listeningDone ? 1 : 0, grammarDone: grammarDone ? 1 : 0, completionPercent, performanceScore: performanceScore || 0 });
    res.json({ message: 'Created', completionPercent });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── AI Learning Insights ───────────────────────────────────────────────────────
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const skill = await db.findOne('skill_scores', { userId });
    const user = await db.findOne('users', { id: userId });
    
    const insights = [];
    
    if (skill) {
      const scores = [
        { name: 'grammar', label: 'Grammar', value: skill.grammarAvg || 0 },
        { name: 'vocabulary', label: 'Vocabulary', value: skill.vocabularyAvg || 0 },
        { name: 'pronunciation', label: 'Pronunciation', value: skill.pronunciationAvg || 0 },
        { name: 'fluency', label: 'Fluency', value: skill.fluencyAvg || 0 }
      ];
      
      scores.sort((a, b) => b.value - a.value);
      
      const highest = scores[0];
      const lowest = scores[scores.length - 1];
      
      if (highest.value > 0) {
        insights.push(`🌟 Your ${highest.label} is your strongest skill, averaging ${highest.value}%. Excellent work!`);
      }
      
      if (lowest.value > 0 && lowest.value < 85) {
        insights.push(`🎯 Focus more on ${lowest.label} practice. Your average is ${lowest.value}%, which has room for improvement.`);
      }
      
      if (skill.grammarAvg < 75) {
        insights.push("✏️ Tip: Make sure to check the Error Tracker after speaking sessions to correct recurring grammatical issues.");
      }
      
      if (skill.fluencyAvg < 75) {
        insights.push("🗣️ Tip: Try speaking continuously without worrying about mistakes to improve your fluency and speed.");
      }
    } else {
      insights.push("💡 Welcome! Complete your first Voice Coach session to unlock personalized AI insights and recommendations.");
    }
    
    if (user && user.dailyStreak > 0) {
      insights.push(`🔥 You have a ${user.dailyStreak}-day active learning streak! Practice today to keep the momentum going.`);
    }

    // Dynamic recommendations
    const recs = [];
    if (!skill || skill.totalSessions === 0) {
      recs.push("Start a Natural Conversation in the Voice Coach.");
    } else {
      if (skill.grammarAvg < 80) recs.push("Retest your mistakes in the Error Tracker.");
      if (skill.vocabularyAvg < 80) recs.push("Learn 5 new words in the Vocabulary Builder.");
      recs.push("Simulate a Behavioral Recruiter Interview.");
    }
    
    res.json({ insights, recommendations: recs });
  } catch (error) {
    res.status(500).json({ error: 'Server error generating insights' });
  }
});

// ── Achievements List ─────────────────────────────────────────────────────────
router.get('/achievements', authMiddleware, async (req, res) => {
  try {
    const list = await db.find('achievements', { userId: req.user.id });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Practice Heatmap ───────────────────────────────────────────────────────────
router.get('/heatmap', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // Query dates and count of sessions for the last 60 days
    const rows = await db.query(
      `SELECT date(created_at) as date, COUNT(*) as count FROM practice_sessions WHERE user_id = ? GROUP BY date(created_at) ORDER BY date DESC LIMIT 60`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Export Learning Report ─────────────────────────────────────────────────────
router.get('/reports/export', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await db.findOne('users', { id: userId });
    const skill = await db.findOne('skill_scores', { userId });
    const sessions = await db.find('practice_sessions', { userId });
    
    const reportData = {
      user: {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        level: user.englishLevel || 'beginner',
        xp: user.xp || 0,
        streak: user.dailyStreak || 0
      },
      skills: skill || { grammarAvg: 0, vocabularyAvg: 0, pronunciationAvg: 0, fluencyAvg: 0, totalSessions: 0 },
      sessionsCount: sessions.length,
      totalPracticeTimeMs: (user.totalPracticeTimeMs || 0) + sessions.reduce((s, p) => s + (p.durationMs || 0), 0),
      dateGenerated: new Date().toISOString()
    };
    
    res.json(reportData);
  } catch (error) {
    res.status(500).json({ error: 'Server error exporting report' });
  }
});

export default router;
