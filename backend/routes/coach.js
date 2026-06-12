import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, executeWithRetry } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { checkAndUpgradeLevel } from './auth.js';
import { addXp, checkAchievements } from '../utils/gamification.js';

const router = express.Router();

const calculateFluencyScore = (text) => {
  const fillers = ['um', 'uh', 'like', 'er', 'ah', 'so', 'basically', 'actually'];
  const words = text.toLowerCase().split(/\s+/);
  if (words.length === 0) return 100;
  let fillerCount = 0;
  words.forEach(w => { if (fillers.includes(w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ''))) fillerCount++; });
  const percentage = (fillerCount / words.length) * 100;
  return Math.max(40, Math.min(100, Math.round(100 - percentage * 3.5)));
};

const generateOfflineResponse = (userText, level) => {
  const lower = userText.toLowerCase();
  let reply = "That's very interesting! Can you tell me more about it?";
  let hasMistakes = false, corrected = userText, explanation = "No obvious grammar errors detected.";
  let grammarScore = 90;

  if (lower.includes('i go to') && (lower.includes('yesterday') || lower.includes('last week'))) {
    hasMistakes = true; corrected = userText.replace(/i go to/i, 'I went to');
    explanation = "Since you refer to the past, use the past tense 'went' instead of 'go'.";
    grammarScore = 60;
  } else if (lower.includes('he do') || lower.includes('she do')) {
    hasMistakes = true; corrected = userText.replace(/\bdo\b/, 'does');
    explanation = "Third-person singular subjects require 'does' in present simple.";
    grammarScore = 65;
  } else if (lower.includes('i am agree')) {
    hasMistakes = true; corrected = userText.replace(/i am agree/i, 'I agree');
    explanation = "'Agree' is a verb — say 'I agree' not 'I am agree'.";
    grammarScore = 70;
  }

  const vocabImprovements = [];
  if (lower.includes('good')) vocabImprovements.push({ originalWord: 'good', improvedWord: level === 'advanced' ? 'exceptional' : 'excellent', explanation: 'Using stronger adjectives makes your speech more engaging.' });
  if (lower.includes('help')) vocabImprovements.push({ originalWord: 'help', improvedWord: 'assist', explanation: "'Assist' sounds more professional and is common in business English." });

  return {
    reply,
    grammarCorrection: { hasMistakes, original: userText, corrected: hasMistakes ? corrected : '', explanation },
    vocabularyImprovements: vocabImprovements,
    scores: { grammar: grammarScore, vocabulary: vocabImprovements.length > 0 ? 80 : 90, pronunciation: Math.round(75 + Math.random() * 20), fluency: calculateFluencyScore(userText) },
    isOffline: true
  };
};

// ── Chat ───────────────────────────────────────────────────────────────────────
router.post('/chat', authMiddleware, async (req, res) => {
  const { message, chatHistory = [], contextMode = 'general', practiceTimeMs = 5000 } = req.body;
  if (!message || message.trim() === '') return res.status(400).json({ error: 'Message is required' });

  try {
    const user = await db.findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const level = user.englishLevel || 'beginner';
    const apiKey = user.geminiApiKey || process.env.GEMINI_API_KEY;
    let responseData;

    if (!apiKey) {
      responseData = generateOfflineResponse(message, level);
    } else {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const systemInstruction = `You are a friendly English teacher. The student level is "${level.toUpperCase()}".\nAnalyze: "${message}"\nRespond ONLY with valid JSON (no markdown):\n{"reply":"...","grammarCorrection":{"hasMistakes":true/false,"original":"${message}","corrected":"","explanation":""},"vocabularyImprovements":[{"originalWord":"","improvedWord":"","explanation":""}],"scores":{"grammar":85,"vocabulary":80,"pronunciation":90,"fluency":90}}`;
        const chatPrompt = [];
        if (chatHistory.length > 0) {
          chatHistory.slice(-4).forEach(item => { chatPrompt.push(`Student: ${item.user}`); chatPrompt.push(`Teacher: ${item.ai}`); });
        }
        chatPrompt.push(systemInstruction);
        const result = await model.generateContent(chatPrompt.join('\n'));
        let responseText = result.response.text().trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        try { responseData = JSON.parse(responseText); } catch (e) {
          responseData = generateOfflineResponse(message, level);
          responseData.reply = "I had a small issue analyzing your speech, but I'm listening!";
        }
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
        responseData = generateOfflineResponse(message, level);
        responseData.reply = "Running in offline mode. " + responseData.reply;
      }
    }

    const rawFluency = calculateFluencyScore(message);
    if (responseData.scores) responseData.scores.fluency = Math.round((responseData.scores.fluency + rawFluency) / 2);

    const today = new Date().toISOString().split('T')[0];
    const scores = responseData.scores || { grammar: 90, vocabulary: 90, pronunciation: 90, fluency: 90 };
    const wordsSpoken = message.trim().split(/\s+/).length;

    // 1. practice_sessions
    await db.insert('practice_sessions', {
      userId: user.id, sessionType: contextMode || 'general',
      durationMs: practiceTimeMs, wordsSpoken,
      grammarScore: scores.grammar, vocabularyScore: scores.vocabulary,
      pronunciationScore: scores.pronunciation, fluencyScore: scores.fluency
    });

    // 2. voice_sessions
    await db.insert('voice_sessions', {
      userId: user.id, userText: message,
      aiReply: responseData.reply || '',
      grammarScore: scores.grammar, vocabularyScore: scores.vocabulary,
      pronunciationScore: scores.pronunciation, fluencyScore: scores.fluency,
      hadMistake: responseData.grammarCorrection?.hasMistakes ? 1 : 0
    });

    // 3. error_tracker
    if (responseData.grammarCorrection?.hasMistakes) {
      const existing = await executeWithRetry({ sql: `SELECT id, frequency FROM error_tracker WHERE user_id = ? AND original_text = ? LIMIT 1`, args: [user.id, responseData.grammarCorrection.original] });
      if (existing.rows.length > 0) {
        await db.update('error_tracker', existing.rows[0].id, { frequency: (existing.rows[0].frequency || 1) + 1 });
      } else {
        await db.insert('error_tracker', {
          userId: user.id, category: 'grammar',
          originalText: responseData.grammarCorrection.original,
          correctedText: responseData.grammarCorrection.corrected,
          explanation: responseData.grammarCorrection.explanation,
          frequency: 1, level, mastered: false
        });
      }
      // legacy mistakes
      await db.insert('mistakes', {
        userId: user.id, originalSentence: responseData.grammarCorrection.original,
        correctedSentence: responseData.grammarCorrection.corrected,
        explanation: responseData.grammarCorrection.explanation, level, mastered: false
      });
    }

    // 4. vocab improvements → user_vocabulary
    if (responseData.vocabularyImprovements?.length > 0) {
      for (const item of responseData.vocabularyImprovements) {
        const ex = await db.findOne('vocab_learned', { userId: user.id, word: item.improvedWord });
        if (!ex) {
          await db.insert('vocab_learned', {
            userId: user.id, word: item.improvedWord, meaning: item.explanation,
            originalWord: item.originalWord,
            example: `Instead of "${item.originalWord}", say "${item.improvedWord}".`,
            dateLearned: today, reviewedCount: 1, lastReviewedDate: today
          });
        }
      }
    }

    // 5. user_progress (upsert today's day)
    const upRow = await executeWithRetry({ sql: `SELECT id FROM user_progress WHERE user_id = ? AND date = ? LIMIT 1`, args: [user.id, today] });
    if (upRow.rows.length > 0) {
      const pid = upRow.rows[0].id;
      await executeWithRetry({
        sql: `UPDATE user_progress SET grammar = ROUND((grammar + ?)/2), vocabulary = ROUND((vocabulary + ?)/2), pronunciation = ROUND((pronunciation + ?)/2), fluency = ROUND((fluency + ?)/2), words_spoken = words_spoken + ?, practice_time_ms = practice_time_ms + ? WHERE id = ?`,
        args: [scores.grammar, scores.vocabulary, scores.pronunciation, scores.fluency, wordsSpoken, practiceTimeMs, pid]
      });
    } else {
      await db.insert('user_progress', {
        userId: user.id, date: today,
        grammar: scores.grammar, vocabulary: scores.vocabulary,
        pronunciation: scores.pronunciation, fluency: scores.fluency,
        wordsSpoken, practiceTimeMs
      });
    }

    // 6. skill_scores (upsert running averages)
    const skRow = await executeWithRetry({ sql: `SELECT * FROM skill_scores WHERE user_id = ? LIMIT 1`, args: [user.id] });
    if (skRow.rows.length > 0) {
      const sk = skRow.rows[0];
      const n = Number(sk.total_sessions || 0) + 1;
      await executeWithRetry({
        sql: `UPDATE skill_scores SET grammar_avg = ROUND((grammar_avg * (total_sessions) + ?) / ?), vocabulary_avg = ROUND((vocabulary_avg * (total_sessions) + ?) / ?), pronunciation_avg = ROUND((pronunciation_avg * (total_sessions) + ?) / ?), fluency_avg = ROUND((fluency_avg * (total_sessions) + ?) / ?), total_sessions = ?, updated_at = ? WHERE user_id = ?`,
        args: [scores.grammar, n, scores.vocabulary, n, scores.pronunciation, n, scores.fluency, n, n, today, user.id]
      });
    } else {
      await db.insert('skill_scores', {
        userId: user.id,
        grammarAvg: scores.grammar, vocabularyAvg: scores.vocabulary,
        pronunciationAvg: scores.pronunciation, fluencyAvg: scores.fluency,
        totalSessions: 1, updatedAt: today
      });
    }

    // 7. update users
    const totalPracticeTimeMs = (user.totalPracticeTimeMs || 0) + practiceTimeMs;
    const totalWordsSpoken = (user.totalWordsSpoken || 0) + wordsSpoken;
    let dailyStreak = user.dailyStreak || 0;
    let longestStreak = user.longestStreak || 0;
    if (user.lastPracticeDate !== today) {
      if (user.lastPracticeDate) {
        const diffMs = new Date(today) - new Date(user.lastPracticeDate);
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        dailyStreak = diffDays === 1 ? dailyStreak + 1 : 1;
      } else {
        dailyStreak = 1;
      }
      if (dailyStreak > longestStreak) longestStreak = dailyStreak;
    }
    await db.update('users', user.id, { totalPracticeTimeMs, totalWordsSpoken, dailyStreak, longestStreak, lastPracticeDate: today });

    // 8. activity log
    await db.insert('activity_logs', { userId: user.id, action: 'voice_session', details: 'Completed voice coaching session' });

    // 9. award XP & check achievements
    const xpResult = await addXp(user.id, 20);
    if (xpResult && xpResult.leveledUp) {
      responseData.levelUpgraded = { from: user.englishLevel || 'beginner', to: xpResult.level };
    }
    await checkAchievements(user.id);

    responseData.isOffline = !apiKey;
    res.json(responseData);
  } catch (error) {
    console.error('Coach API error:', error);
    res.status(500).json({ error: 'Server error in English coach processing' });
  }
});

export default router;
