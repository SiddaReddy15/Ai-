import express from 'express';
import { db, executeWithRetry } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Admin-only middleware
const adminMiddleware = async (req, res, next) => {
  try {
    const user = await db.findOne('users', { id: req.user.id });
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (e) {
    res.status(500).json({ error: 'Server error verifying admin' });
  }
};

// GET /api/admin/stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [totalUsers, activeToday, totalSessions, newThisWeek, totalVocab] = await Promise.all([
      executeWithRetry(`SELECT COUNT(*) as cnt FROM users`),
      executeWithRetry({ sql: `SELECT COUNT(DISTINCT user_id) as cnt FROM activity_logs WHERE created_at >= ?`, args: [today] }),
      executeWithRetry(`SELECT COUNT(*) as cnt FROM practice_sessions`),
      executeWithRetry({ sql: `SELECT COUNT(*) as cnt FROM users WHERE created_at >= ?`, args: [weekAgo] }),
      executeWithRetry(`SELECT COUNT(*) as cnt FROM vocab_learned`)
    ]);

    const skillAvgs = await executeWithRetry(`SELECT AVG(grammar_avg) as ga, AVG(vocabulary_avg) as va, AVG(fluency_avg) as fa FROM skill_scores`);
    const sk = skillAvgs.rows[0];

    res.json({
      totalUsers: Number(totalUsers.rows[0]?.cnt || 0),
      activeToday: Number(activeToday.rows[0]?.cnt || 0),
      totalSessions: Number(totalSessions.rows[0]?.cnt || 0),
      avgGrammarScore: Math.round(sk?.ga || 0),
      avgVocabScore: Math.round(sk?.va || 0),
      avgFluencyScore: Math.round(sk?.fa || 0),
      newUsersThisWeek: Number(newThisWeek.rows[0]?.cnt || 0),
      totalVocabLearned: Number(totalVocab.rows[0]?.cnt || 0)
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Server error fetching admin stats' });
  }
});

// GET /api/admin/users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await executeWithRetry(`SELECT id, first_name, last_name, email, english_level, daily_streak, role, is_verified, created_at FROM users ORDER BY created_at DESC`);
    const skills = await executeWithRetry(`SELECT user_id, grammar_avg, vocabulary_avg, fluency_avg, total_sessions FROM skill_scores`);

    const skillMap = {};
    skills.rows.forEach(s => { skillMap[s.user_id] = s; });

    const result = users.rows.map(u => ({
      id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      email: u.email,
      englishLevel: u.english_level,
      dailyStreak: u.daily_streak,
      role: u.role,
      isVerified: u.is_verified === 1,
      createdAt: u.created_at,
      skills: skillMap[u.id] ? {
        grammarAvg: skillMap[u.id].grammar_avg,
        vocabularyAvg: skillMap[u.id].vocabulary_avg,
        fluencyAvg: skillMap[u.id].fluency_avg,
        totalSessions: skillMap[u.id].total_sessions
      } : null
    }));

    res.json(result);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// GET /api/admin/sessions
router.get('/sessions', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await executeWithRetry(`
      SELECT ps.id, ps.session_type, ps.duration_ms, ps.words_spoken,
             ps.grammar_score, ps.vocabulary_score, ps.fluency_score, ps.created_at,
             u.email as user_email, u.first_name, u.last_name
      FROM practice_sessions ps
      LEFT JOIN users u ON u.id = ps.user_id
      ORDER BY ps.created_at DESC
      LIMIT 50
    `);
    res.json(rows.rows.map(r => ({
      id: r.id, sessionType: r.session_type,
      durationMs: r.duration_ms, wordsSpoken: r.words_spoken,
      grammarScore: r.grammar_score, vocabularyScore: r.vocabulary_score,
      fluencyScore: r.fluency_score, createdAt: r.created_at,
      userEmail: r.user_email,
      userName: `${r.first_name || ''} ${r.last_name || ''}`.trim()
    })));
  } catch (error) {
    console.error('Admin sessions error:', error);
    res.status(500).json({ error: 'Server error fetching sessions' });
  }
});

// GET /api/admin/activity
router.get('/activity', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await executeWithRetry(`
      SELECT al.id, al.action, al.details, al.created_at, u.email as user_email, u.first_name
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    res.json(rows.rows.map(r => ({
      id: r.id, action: r.action, details: r.details,
      createdAt: r.created_at, userEmail: r.user_email, firstName: r.first_name
    })));
  } catch (error) {
    console.error('Admin activity error:', error);
    res.status(500).json({ error: 'Server error fetching activity' });
  }
});

// GET /api/admin/growth
router.get('/growth', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await executeWithRetry(`
      SELECT DATE(created_at) as date, COUNT(*) as new_users
      FROM users
      WHERE created_at >= DATE('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    res.json(rows.rows);
  } catch (error) {
    console.error('Admin growth error:', error);
    res.status(500).json({ error: 'Server error fetching growth data' });
  }
});

export default router;
