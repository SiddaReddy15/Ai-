import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, executeWithRetry } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-coach-key-123';

// ── Level upgrade helper ───────────────────────────────────────────────────────
export const checkAndUpgradeLevel = async (userId) => {
  try {
    const user = await db.findOne('users', { id: userId });
    if (!user) return null;

    const skill = await db.findOne('skill_scores', { userId });
    if (!skill || skill.totalSessions < 3) return null;

    const { grammarAvg, vocabularyAvg, fluencyAvg, totalSessions } = skill;
    const currentLevel = user.englishLevel || 'beginner';
    let newLevel = currentLevel;

    if (currentLevel === 'beginner' && grammarAvg >= 65 && vocabularyAvg >= 65 && totalSessions >= 5) {
      newLevel = 'intermediate';
    } else if (currentLevel === 'intermediate' && grammarAvg >= 78 && vocabularyAvg >= 78 && totalSessions >= 15) {
      newLevel = 'advanced';
    } else if (currentLevel === 'advanced' && grammarAvg >= 90 && vocabularyAvg >= 90 && fluencyAvg >= 88 && totalSessions >= 30) {
      newLevel = 'expert';
    }

    if (newLevel !== currentLevel) {
      await db.update('users', userId, { englishLevel: newLevel });
      await db.insert('activity_logs', {
        userId,
        action: 'level_up',
        details: `Level upgraded from ${currentLevel} to ${newLevel}`
      });
      return { from: currentLevel, to: newLevel };
    }
    return null;
  } catch (e) {
    console.error('[checkAndUpgradeLevel]', e);
    return null;
  }
};

// ── Register ───────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { firstName, lastName, email, phone, password, confirmPassword } = req.body;

  if (!firstName || !lastName || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  try {
    const existingUser = await db.findOne('users', { email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = await db.insert('users', {
      firstName, lastName, email,
      phone: phone || '',
      passwordHash,
      englishLevel: 'beginner',
      geminiApiKey: '',
      dailyStreak: 0,
      longestStreak: 0,
      totalPracticeTimeMs: 0,
      totalWordsSpoken: 0,
      role: 'user',
      isVerified: 0
    });

    await db.insert('activity_logs', { userId: newUser.id, action: 'register', details: 'New user registered' });

    const token = jwt.sign(
      { id: newUser.id, username: newUser.email, englishLevel: newUser.englishLevel, role: 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id, username: newUser.email,
        firstName: newUser.firstName, lastName: newUser.lastName,
        email: newUser.email, phone: newUser.phone,
        englishLevel: newUser.englishLevel, role: 'user',
        dailyStreak: 0, isVerified: false
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// ── Login ──────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await db.findOne('users', { email: username });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    // Streak logic
    let dailyStreak = user.dailyStreak || 0;
    const today = new Date().toISOString().split('T')[0];
    if (user.lastPracticeDate && user.lastPracticeDate !== today) {
      const diffMs = new Date(today) - new Date(user.lastPracticeDate);
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        dailyStreak = 0;
        await db.update('users', user.id, { dailyStreak: 0 });
      }
    }

    await db.insert('activity_logs', { userId: user.id, action: 'login', details: 'User logged in' });

    const token = jwt.sign(
      { id: user.id, username: user.email, englishLevel: user.englishLevel, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id, username: user.email,
        firstName: user.firstName, lastName: user.lastName,
        email: user.email, phone: user.phone,
        englishLevel: user.englishLevel,
        geminiApiKey: user.geminiApiKey || '',
        dailyStreak, longestStreak: user.longestStreak || 0,
        totalPracticeTimeMs: user.totalPracticeTimeMs || 0,
        totalWordsSpoken: user.totalWordsSpoken || 0,
        role: user.role || 'user',
        isVerified: user.isVerified || false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ── Get current user ───────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id, username: user.email,
      firstName: user.firstName, lastName: user.lastName,
      email: user.email, phone: user.phone,
      englishLevel: user.englishLevel,
      geminiApiKey: user.geminiApiKey || '',
      dailyStreak: user.dailyStreak || 0,
      longestStreak: user.longestStreak || 0,
      totalPracticeTimeMs: user.totalPracticeTimeMs || 0,
      totalWordsSpoken: user.totalWordsSpoken || 0,
      role: user.role || 'user',
      isVerified: user.isVerified || false
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Update profile ─────────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req, res) => {
  const { englishLevel, geminiApiKey, firstName, lastName, email, phone, role } = req.body;
  const updates = {};

  if (englishLevel) {
    if (!['beginner', 'intermediate', 'advanced', 'expert'].includes(englishLevel)) {
      return res.status(400).json({ error: 'Invalid English level' });
    }
    updates.englishLevel = englishLevel;
  }
  if (geminiApiKey !== undefined) updates.geminiApiKey = geminiApiKey;
  if (firstName !== undefined) {
    if (!firstName.trim()) return res.status(400).json({ error: 'First name cannot be empty.' });
    updates.firstName = firstName.trim();
  }
  if (lastName !== undefined) {
    if (!lastName.trim()) return res.status(400).json({ error: 'Last name cannot be empty.' });
    updates.lastName = lastName.trim();
  }
  if (phone !== undefined) updates.phone = phone.trim();
  if (email !== undefined) {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return res.status(400).json({ error: 'Email cannot be empty.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return res.status(400).json({ error: 'Invalid email format' });
    const existing = await db.findOne('users', { email: trimmedEmail });
    if (existing && existing.id !== req.user.id) return res.status(400).json({ error: 'Email already registered by another account.' });
    updates.email = trimmedEmail;
  }

  // Only admins can change roles
  if (role) {
    const requester = await db.findOne('users', { id: req.user.id });
    if (requester && requester.role === 'admin') updates.role = role;
  }

  try {
    const updatedUser = await db.update('users', req.user.id, updates);
    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    const token = jwt.sign(
      { id: updatedUser.id, username: updatedUser.email, englishLevel: updatedUser.englishLevel, role: updatedUser.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: updatedUser.id, username: updatedUser.email,
        firstName: updatedUser.firstName, lastName: updatedUser.lastName,
        email: updatedUser.email, phone: updatedUser.phone,
        englishLevel: updatedUser.englishLevel,
        geminiApiKey: updatedUser.geminiApiKey || '',
        dailyStreak: updatedUser.dailyStreak || 0,
        role: updatedUser.role || 'user'
      }
    });
  } catch (error) {
    console.error('Profile update failed:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

// ── Forgot password (simulated) ────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const user = await db.findOne('users', { email });
    if (!user) return res.status(404).json({ error: 'No account found with this email' });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await db.update('users', user.id, { resetToken: resetCode, resetTokenExpires: expires });

    res.json({ message: 'Reset code generated (check console in dev)', resetToken: resetCode });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Reset password ─────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  const { email, resetToken, newPassword } = req.body;
  if (!email || !resetToken || !newPassword) return res.status(400).json({ error: 'All fields required' });

  try {
    const user = await db.findOne('users', { email });
    if (!user || user.resetToken !== resetToken) return res.status(400).json({ error: 'Invalid reset code' });
    if (user.resetTokenExpires && new Date(user.resetTokenExpires) < new Date()) {
      return res.status(400).json({ error: 'Reset code has expired' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await db.update('users', user.id, { passwordHash, resetToken: null, resetTokenExpires: null });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Verify email ───────────────────────────────────────────────────────────────
router.post('/verify-email', authMiddleware, async (req, res) => {
  try {
    await db.update('users', req.user.id, { isVerified: 1 });
    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Leaderboard ───────────────────────────────────────────────────────────────
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const list = await db.query('SELECT user_id, name, xp, streak FROM leaderboards WHERE opt_in = 1 ORDER BY xp DESC LIMIT 50');
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
});

// ── Toggle Leaderboard Opt-In ──────────────────────────────────────────────
router.put('/leaderboard/opt-in', authMiddleware, async (req, res) => {
  const { optIn } = req.body;
  try {
    await db.update('users', req.user.id, { leaderboardOptIn: optIn ? 1 : 0 });
    const lbRecord = await db.findOne('leaderboards', { userId: req.user.id });
    if (lbRecord) {
      await db.update('leaderboards', lbRecord.id, { optIn: optIn ? 1 : 0 });
    } else {
      const user = await db.findOne('users', { id: req.user.id });
      await db.insert('leaderboards', {
        userId: req.user.id,
        name: `${user?.firstName || 'User'} ${user?.lastName || ''}`.trim() || user?.email,
        xp: user?.xp || 0,
        streak: user?.dailyStreak || 0,
        optIn: optIn ? 1 : 0
      });
    }
    res.json({ message: 'Leaderboard preference updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Profile Goals ─────────────────────────────────────────────────────────────
router.get('/goals', authMiddleware, async (req, res) => {
  try {
    let goals = await db.findOne('user_goals', { userId: req.user.id });
    if (!goals) {
      goals = await db.insert('user_goals', {
        userId: req.user.id,
        dailyMinutes: 20,
        weeklyMinutes: 100,
        learningFocus: 'speaking'
      });
    }
    res.json(goals);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching goals' });
  }
});

router.put('/goals', authMiddleware, async (req, res) => {
  const { dailyMinutes, weeklyMinutes, learningFocus, targetLevel } = req.body;
  try {
    let goals = await db.findOne('user_goals', { userId: req.user.id });
    const updates = {
      dailyMinutes: dailyMinutes !== undefined ? Number(dailyMinutes) : 20,
      weeklyMinutes: weeklyMinutes !== undefined ? Number(weeklyMinutes) : 100,
      learningFocus: learningFocus || 'speaking',
      updatedAt: new Date().toISOString()
    };

    if (goals) {
      await db.update('user_goals', goals.id, updates);
    } else {
      await db.insert('user_goals', {
        userId: req.user.id,
        ...updates
      });
    }

    // Also update users table shortcut properties
    const userUpdates = {};
    if (targetLevel) userUpdates.targetLevel = targetLevel;
    if (dailyMinutes) userUpdates.dailyPracticeGoal = Number(dailyMinutes);
    if (Object.keys(userUpdates).length > 0) {
      await db.update('users', req.user.id, userUpdates);
    }

    res.json({ message: 'Goals updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error saving goals' });
  }
});

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const list = await db.find('notifications', { userId: req.user.id });
    // Sort manually by creation date descending
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list.slice(0, 20));
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching notifications' });
  }
});

router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await db.update('notifications', req.params.id, { isRead: 1 });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/notifications/clear', authMiddleware, async (req, res) => {
  try {
    const list = await db.find('notifications', { userId: req.user.id });
    for (const n of list) {
      await db.delete('notifications', n.id);
    }
    res.json({ message: 'Notifications cleared' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
