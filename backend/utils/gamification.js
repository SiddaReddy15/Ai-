import { db } from '../db.js';
import crypto from 'crypto';

export const LEVEL_THRESHOLDS = [
  { level: 'beginner', minXp: 0, maxXp: 500, label: 'Beginner' },
  { level: 'intermediate', minXp: 501, maxXp: 1500, label: 'Intermediate' },
  { level: 'advanced', minXp: 1501, maxXp: 3000, label: 'Advanced' },
  { level: 'expert', minXp: 3001, maxXp: 6000, label: 'Expert' },
  { level: 'master', minXp: 6001, maxXp: Infinity, label: 'Master' }
];

export const getLevelFromXp = (xp) => {
  const score = xp || 0;
  for (const t of LEVEL_THRESHOLDS) {
    if (score >= t.minXp && score <= t.maxXp) return t;
  }
  return LEVEL_THRESHOLDS[0];
};

export const addXp = async (userId, amount) => {
  try {
    const user = await db.findOne('users', { id: userId });
    if (!user) return null;

    const currentXp = user.xp || 0;
    const newXp = currentXp + amount;

    const currentLvlInfo = getLevelFromXp(currentXp);
    const newLvlInfo = getLevelFromXp(newXp);

    const updates = { xp: newXp };

    let leveledUp = false;
    if (newLvlInfo.level !== currentLvlInfo.level) {
      updates.englishLevel = newLvlInfo.level;
      leveledUp = true;

      // Log activity
      await db.insert('activity_logs', {
        userId,
        action: 'level_up',
        details: `Level upgraded from ${currentLvlInfo.label} to ${newLvlInfo.label} (+${amount} XP)`
      });

      // Insert notification
      await db.insert('notifications', {
        userId,
        type: 'achievement',
        title: '🎉 Level Upgraded!',
        message: `Congratulations! You are now a ${newLvlInfo.label}. Keep speaking!`
      });
    }

    await db.update('users', userId, updates);

    // Sync to Leaderboard if opted in
    if (user.leaderboardOptIn !== false) {
      const name = `${user.firstName || 'User'} ${user.lastName || ''}`.trim() || user.email;
      const lbRecord = await db.findOne('leaderboards', { userId });
      if (lbRecord) {
        await db.update('leaderboards', lbRecord.id, { xp: newXp, streak: user.dailyStreak || 0 });
      } else {
        await db.insert('leaderboards', {
          userId,
          name,
          xp: newXp,
          streak: user.dailyStreak || 0,
          optIn: 1
        });
      }
    }

    return { xpAdded: amount, totalXp: newXp, leveledUp, level: newLvlInfo.level };
  } catch (error) {
    console.error('[addXp] Error:', error);
    return null;
  }
};

export const checkAchievements = async (userId) => {
  try {
    const user = await db.findOne('users', { id: userId });
    if (!user) return [];

    const unlockedBadges = await db.find('achievements', { userId });
    const unlockedIds = new Set(unlockedBadges.map(b => b.badgeId));

    const awardsToUnlock = [];

    // Helper to request unlock
    const queueUnlock = (badgeId, badgeName, description) => {
      if (!unlockedIds.has(badgeId)) {
        awardsToUnlock.push({ badgeId, badgeName, description });
      }
    };

    // 1. Session milestones
    const sessionCountResult = await db.query('SELECT COUNT(*) as cnt FROM practice_sessions WHERE user_id = ?', [userId]);
    const totalSessions = Number(sessionCountResult[0]?.cnt || 0);

    if (totalSessions >= 1) {
      queueUnlock('first_session', 'First Practice Session', 'Complete your very first practice session.');
    }

    // 2. Streak milestones
    const streak = user.dailyStreak || 0;
    if (streak >= 3) {
      queueUnlock('streak_3', '3-Day Streak', 'Maintain a learning streak for 3 consecutive days.');
    }
    if (streak >= 7) {
      queueUnlock('streak_7', '7-Day Streak', 'Maintain a learning streak for 7 consecutive days.');
    }
    if (streak >= 30) {
      queueUnlock('streak_30', '30-Day Streak', 'Maintain a learning streak for 30 consecutive days.');
    }

    // 3. Vocab Milestones
    const vocabCountResult = await db.query('SELECT COUNT(*) as cnt FROM user_vocabulary WHERE user_id = ? AND status = \'learned\'', [userId]);
    const vocabCount = Number(vocabCountResult[0]?.cnt || 0);
    if (vocabCount >= 100) {
      queueUnlock('vocab_100', '100 Words Learned', 'Master 100 new vocabulary words.');
    }
    if (vocabCount >= 10) {
      queueUnlock('vocab_10', 'Vocab Initiate', 'Master 10 new vocabulary words.');
    }

    // 4. Spoken Words Milestones
    const totalWords = user.totalWordsSpoken || 0;
    if (totalWords >= 1000) {
      queueUnlock('words_1000', '1000 Words Spoken', 'Speak 1,000 words in voice conversation.');
    }

    // 5. Interview prep milestones
    const interviewCountResult = await db.query('SELECT COUNT(*) as cnt FROM interview_sessions WHERE user_id = ?', [userId]);
    const totalInterviews = Number(interviewCountResult[0]?.cnt || 0);
    if (totalInterviews >= 1) {
      queueUnlock('first_interview', 'First Interview Completed', 'Simulate your first recruiter mock interview.');
    }

    // 6. Max score achievements (search in practice_sessions)
    const topScoresResult = await db.query(
      'SELECT MAX(grammar_score) as maxGrammar, MAX(pronunciation_score) as maxPron, MAX(vocabulary_score) as maxVocab FROM practice_sessions WHERE user_id = ?',
      [userId]
    );
    const top = topScoresResult[0] || {};
    if (Number(top.maxGrammar || 0) >= 95) {
      queueUnlock('grammar_master', 'Grammar Master', 'Achieve a Grammar Accuracy score of 95% or above.');
    }
    if (Number(top.maxPron || 0) >= 95) {
      queueUnlock('pronunciation_pro', 'Pronunciation Pro', 'Achieve a Pronunciation Tone score of 95% or above.');
    }
    if (Number(top.maxVocab || 0) >= 95) {
      queueUnlock('vocab_champion', 'Vocabulary Champion', 'Achieve a Vocabulary score of 95% or above.');
    }

    // Process unlocks
    const newlyUnlocked = [];
    const now = new Date().toISOString();
    for (const badge of awardsToUnlock) {
      const record = await db.insert('achievements', {
        userId,
        badgeId: badge.badgeId,
        badgeName: badge.badgeName,
        description: badge.description,
        unlocked: 1,
        unlockedAt: now
      });

      // Insert notification
      await db.insert('notifications', {
        userId,
        type: 'achievement',
        title: '🏆 Achievement Unlocked!',
        message: `You earned the badge: "${badge.badgeName}"!`
      });

      // Add XP for achievement unlock
      await addXp(userId, 50);

      newlyUnlocked.push(record);
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('[checkAchievements] Error:', error);
    return [];
  }
};
