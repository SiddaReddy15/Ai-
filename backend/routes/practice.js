import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, executeWithRetry } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const TOPICS = {
  beginner: [
    { id: 'b1', title: 'Introduce Yourself', description: 'Practice introducing yourself, your name, hobbies, and where you live.', prompt: 'Hello! Could you please introduce yourself?' },
    { id: 'b2', title: 'Daily Routine', description: 'Describe your typical day — morning, afternoon, and evening.', prompt: 'Can you describe what your daily routine looks like?' },
    { id: 'b3', title: 'My Family', description: 'Talk about your family members and their occupations.', prompt: 'Could you tell me a little bit about your family?' }
  ],
  intermediate: [
    { id: 'i1', title: 'Your Favorite Sport', description: 'Explain a sport you love and why you enjoy it.', prompt: 'What is your favorite sport, and why do you like it?' },
    { id: 'i2', title: 'A Memorable Holiday', description: 'Share details of a vacation that stood out to you.', prompt: 'Tell me about a memorable trip or holiday you took.' },
    { id: 'i3', title: 'Healthy Habits', description: 'Discuss actions people can take to live a healthier lifestyle.', prompt: 'What are the most important habits for a healthy life?' }
  ],
  advanced: [
    { id: 'a1', title: 'Why Learn AI?', description: 'Discuss the impact of AI and your motivation to study it.', prompt: 'Why do you believe learning AI is important in today\'s world?' },
    { id: 'a2', title: 'Climate Change Solutions', description: 'Argue key strategies for reducing global carbon emissions.', prompt: 'What are the most effective strategies to address climate change?' },
    { id: 'a3', title: 'Work-Life Balance', description: 'Explain how modern organizations can encourage a healthy work-life balance.', prompt: 'How do you define work-life balance, and what can companies do to foster it?' }
  ]
};

const INTERVIEW_QUESTIONS = {
  hr: [
    { id: 'hr1', question: 'Tell me about yourself.', tips: 'Walk through your experience, highlight key achievements, and connect them to the role.' },
    { id: 'hr2', question: 'What are your greatest strengths and weaknesses?', tips: 'Be honest. Share a real weakness and how you are working to improve it.' },
    { id: 'hr3', question: 'Where do you see yourself in five years?', tips: 'Align your goals with the company\'s growth opportunities.' }
  ],
  technical: [
    { id: 'tech1', question: 'Explain the difference between SQL and NoSQL databases.', tips: 'Discuss schema, scalability, and ACID transactions.' },
    { id: 'tech2', question: 'What is an API and how does RESTful architecture work?', tips: 'Define APIs, HTTP methods, statelessness, and JSON exchanges.' },
    { id: 'tech3', question: 'What are the main concepts of Object-Oriented Programming?', tips: 'Mention Encapsulation, Inheritance, Polymorphism, and Abstraction.' }
  ],
  behavioral: [
    { id: 'beh1', question: 'Tell me about a time you overcame a significant challenge at work.', tips: 'Use the STAR method: Situation, Task, Action, Result.' },
    { id: 'beh2', question: 'Describe a situation where you had to work with a difficult team member.', tips: 'Focus on how you handled conflict constructively and reached resolution.' },
    { id: 'beh3', question: 'Give an example of when you demonstrated leadership under pressure.', tips: 'Highlight your decision-making process and the positive outcome.' }
  ]
};

const DAILY_PROMPTS = {
  speaking: [
    'Describe your ideal weekend in detail.',
    'Talk about the last movie or show you watched.',
    'What is one skill you want to learn this year and why?',
    'Describe your hometown and what makes it special.',
    'What are three things you are grateful for today?'
  ],
  reading: [
    'The sun rises in the east and sets in the west. This cycle has been observed by humans for thousands of years, helping us track time and seasons.',
    'Technology is changing how we communicate. From letters to emails to instant messages, each advancement has made communication faster but sometimes less personal.',
    'Exercise has numerous benefits for both the body and the mind. Regular physical activity can improve mood, boost energy, and help prevent many diseases.',
    'Learning a new language opens doors to different cultures and ways of thinking. It challenges the brain and creates new neural connections that improve overall cognitive ability.',
    'The ocean covers more than 70 percent of the Earth\'s surface and is home to millions of species, many of which have not yet been discovered by scientists.'
  ],
  listening: [
    'Repeat after me: The quick brown fox jumps over the lazy dog.',
    'Listen carefully: Practice makes perfect in English speaking.',
    'Say this sentence: Communication is the key to understanding.',
    'Repeat: Confidence grows with every conversation you have.',
    'Echo this: Reading widely improves your vocabulary significantly.'
  ],
  grammar: [
    'Correct this: She don\'t like going to the park on Sundays.',
    'Fix the error: He have been working here for five years.',
    'Correct: I am very boring at this lecture today.',
    'Fix this: They was playing football when it started raining.',
    'Correct: She speaked very loudly during the meeting yesterday.'
  ]
};

const GRAMMAR_ANSWERS = [
  'She doesn\'t like going to the park on Sundays.',
  'He has been working here for five years.',
  'I am very bored at this lecture today.',
  'They were playing football when it started raining.',
  'She spoke very loudly during the meeting yesterday.'
];

router.get('/topics', authMiddleware, (req, res) => res.json(TOPICS));
router.get('/interview', authMiddleware, (req, res) => res.json(INTERVIEW_QUESTIONS));

// ── Interview Evaluation ───────────────────────────────────────────────────────
router.post('/interview-eval', authMiddleware, async (req, res) => {
  const { question, answer, type, practiceTimeMs = 8000 } = req.body;
  if (!question || !answer) return res.status(400).json({ error: 'Question and answer are required' });

  try {
    const user = await db.findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const apiKey = user.geminiApiKey || process.env.GEMINI_API_KEY;
    let feedback;

    if (!apiKey) {
      feedback = {
        confidenceAnalysis: 'You spoke with moderate confidence. The response structure was clear.',
        correctness: 'Your response addresses the key concepts. Adding specific examples would strengthen it.',
        feedbackText: 'Great attempt! Try using the STAR method (Situation, Task, Action, Result) to structure your experiences.',
        scores: { grammar: 85, vocabulary: 80, communication: 85, confidence: 80 }
      };
    } else {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `You are a professional recruiter. Evaluate the interview answer to: "${question}" (Type: ${type}). Answer: "${answer}". Return ONLY valid JSON (no markdown): {"confidenceAnalysis":"","correctness":"","feedbackText":"","scores":{"grammar":85,"vocabulary":80,"communication":85,"confidence":80}}`;
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
        try { feedback = JSON.parse(text); } catch (_) { feedback = { confidenceAnalysis: 'Analysis complete.', correctness: 'Response was logical.', feedbackText: 'Good attempt! Practice structuring technical terms more concisely.', scores: { grammar: 80, vocabulary: 80, communication: 80, confidence: 80 } }; }
      } catch (e) {
        console.error('Gemini interview eval error:', e);
        feedback = { confidenceAnalysis: 'Offline mode.', correctness: 'Response checked offline.', feedbackText: 'Update your Gemini API key in settings for detailed feedback.', scores: { grammar: 80, vocabulary: 80, communication: 80, confidence: 80 } };
      }
    }

    const today = new Date().toISOString().split('T')[0];
    await db.insert('progress', { userId: user.id, date: today, grammarScore: feedback.scores.grammar, vocabularyScore: feedback.scores.vocabulary, pronunciationScore: feedback.scores.confidence, fluencyScore: feedback.scores.communication, practiceTimeMs, wordsSpoken: answer.split(/\s+/).length });
    await db.update('users', user.id, { totalPracticeTimeMs: (user.totalPracticeTimeMs || 0) + practiceTimeMs, lastPracticeDate: today });

    // Import and reward XP dynamically, check achievements
    const { addXp, checkAchievements } = await import('../utils/gamification.js');
    const xpResult = await addXp(user.id, 30);
    const achievementsResult = await checkAchievements(user.id);
    if (xpResult && xpResult.leveledUp) {
      feedback.levelUpgraded = { from: user.englishLevel || 'beginner', to: xpResult.level };
    }

    res.json(feedback);
  } catch (error) {
    console.error('Interview evaluation error:', error);
    res.status(500).json({ error: 'Server error during interview evaluation' });
  }
});

// ── Save full interview session ─────────────────────────────────────────────────
router.post('/interview-session/save', authMiddleware, async (req, res) => {
  const { interviewType, questions, answers, scores, overallScore } = req.body;
  try {
    const session = await db.insert('interview_sessions', {
      userId: req.user.id,
      interviewType: interviewType || 'hr',
      questionsJson: JSON.stringify(questions || []),
      answersJson: JSON.stringify(answers || []),
      scoresJson: JSON.stringify(scores || []),
      overallScore: overallScore || 0
    });
    await db.insert('activity_logs', { userId: req.user.id, action: 'interview_session', details: `Completed ${interviewType} interview session. Score: ${overallScore}` });
    res.json({ message: 'Session saved', id: session.id });
  } catch (error) {
    console.error('Save interview session error:', error);
    res.status(500).json({ error: 'Server error saving session' });
  }
});

// ── Interview History ──────────────────────────────────────────────────────────
router.get('/interview/history', authMiddleware, async (req, res) => {
  try {
    const rows = await executeWithRetry({
      sql: `SELECT * FROM interview_sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
      args: [req.user.id]
    });
    const sessions = rows.rows.map(r => ({
      ...r,
      questionsJson: (() => { try { return JSON.parse(r.questions_json); } catch(_) { return []; } })(),
      answersJson: (() => { try { return JSON.parse(r.answers_json); } catch(_) { return []; } })(),
      scoresJson: (() => { try { return JSON.parse(r.scores_json); } catch(_) { return []; } })()
    }));
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching history' });
  }
});

// ── Daily Exercise ─────────────────────────────────────────────────────────────
router.post('/daily-exercise', authMiddleware, async (req, res) => {
  const { exerciseType, userInput, promptText } = req.body;
  if (!exerciseType || !userInput) return res.status(400).json({ error: 'exerciseType and userInput are required' });

  try {
    const user = await db.findOne('users', { id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const today = new Date().toISOString().split('T')[0];
    let score = 0, feedback = '', correct = false;

    // Score based on input complexity + length
    const wordCount = userInput.trim().split(/\s+/).length;
    const baseScore = Math.min(95, Math.max(55, 60 + wordCount * 2));

    if (exerciseType === 'grammar') {
      // Compare to answer
      const promptIdx = DAILY_PROMPTS.grammar.findIndex(p => promptText && p === promptText);
      const correctAnswer = promptIdx >= 0 ? GRAMMAR_ANSWERS[promptIdx] : null;
      if (correctAnswer) {
        const similarity = userInput.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
        score = similarity ? 100 : baseScore;
        correct = similarity;
        feedback = similarity ? 'Perfect! Your correction is exactly right.' : `Good try! The correct answer is: "${correctAnswer}"`;
      } else {
        score = baseScore;
        feedback = 'Good attempt! Keep practicing grammar corrections.';
      }
    } else if (exerciseType === 'reading') {
      score = baseScore;
      feedback = `Well done! You read ${wordCount} words. Focus on clarity and pronunciation.`;
    } else if (exerciseType === 'listening') {
      const promptLower = (promptText || '').toLowerCase().replace(/[^a-z\s]/g, '');
      const inputLower = userInput.toLowerCase().replace(/[^a-z\s]/g, '');
      const promptWords = promptLower.split(/\s+/);
      const inputWords = inputLower.split(/\s+/);
      const matched = promptWords.filter(w => inputWords.includes(w)).length;
      score = Math.round((matched / Math.max(promptWords.length, 1)) * 100);
      feedback = score >= 80 ? 'Excellent listening! You captured most of the sentence.' : score >= 50 ? 'Good effort! Some words were missed. Try listening again.' : 'Keep practicing! Focus on each word carefully.';
    } else {
      score = baseScore;
      feedback = `Great speaking practice! You used ${wordCount} words. Keep it up!`;
    }

    // Update daily_practice flags
    const dpRow = await executeWithRetry({ sql: `SELECT * FROM daily_practice WHERE user_id = ? AND date = ? LIMIT 1`, args: [user.id, today] });
    const flagField = { speaking: 'speaking_done', reading: 'reading_done', listening: 'listening_done', grammar: 'grammar_done' }[exerciseType] || 'speaking_done';

    if (dpRow.rows.length > 0) {
      const id = dpRow.rows[0].id;
      const existing = dpRow.rows[0];
      const doneCount = [
        exerciseType === 'speaking' ? 1 : Number(existing.speaking_done || 0),
        exerciseType === 'reading' ? 1 : Number(existing.reading_done || 0),
        exerciseType === 'listening' ? 1 : Number(existing.listening_done || 0),
        exerciseType === 'grammar' ? 1 : Number(existing.grammar_done || 0)
      ].filter(Boolean).length;
      const completionPercent = Math.round((doneCount / 4) * 100);
      await executeWithRetry({ sql: `UPDATE daily_practice SET ${flagField} = 1, completion_percent = ?, performance_score = ROUND((performance_score + ?) / 2) WHERE id = ?`, args: [completionPercent, score, id] });
    } else {
      await db.insert('daily_practice', {
        userId: user.id, date: today,
        speakingDone: exerciseType === 'speaking' ? 1 : 0,
        readingDone: exerciseType === 'reading' ? 1 : 0,
        listeningDone: exerciseType === 'listening' ? 1 : 0,
        grammarDone: exerciseType === 'grammar' ? 1 : 0,
        completionPercent: 25, performanceScore: score
      });
    }

    // Log activity
    await db.insert('activity_logs', { userId: user.id, action: 'daily_exercise', details: `Completed ${exerciseType} exercise. Score: ${score}` });

    // Import and reward XP dynamically, check achievements
    const { addXp, checkAchievements } = await import('../utils/gamification.js');
    const xpResult = await addXp(user.id, 10);
    await checkAchievements(user.id);

    const responseData = { score, feedback, correct, exerciseType };
    if (xpResult && xpResult.leveledUp) {
      responseData.levelUpgraded = { from: user.englishLevel || 'beginner', to: xpResult.level };
    }

    res.json(responseData);
  } catch (error) {
    console.error('Daily exercise error:', error);
    res.status(500).json({ error: 'Server error processing exercise' });
  }
});

// ── Daily progress ─────────────────────────────────────────────────────────────
router.get('/daily-progress', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const row = await executeWithRetry({ sql: `SELECT * FROM daily_practice WHERE user_id = ? AND date = ? LIMIT 1`, args: [req.user.id, today] });
    res.json(row.rows[0] || { speaking_done: 0, reading_done: 0, listening_done: 0, grammar_done: 0, completion_percent: 0, performance_score: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Daily prompts ──────────────────────────────────────────────────────────────
router.get('/daily-prompts', authMiddleware, (req, res) => {
  const dayIdx = new Date().getDay();
  res.json({
    speaking: DAILY_PROMPTS.speaking[dayIdx % DAILY_PROMPTS.speaking.length],
    reading: DAILY_PROMPTS.reading[dayIdx % DAILY_PROMPTS.reading.length],
    listening: DAILY_PROMPTS.listening[dayIdx % DAILY_PROMPTS.listening.length],
    grammar: DAILY_PROMPTS.grammar[dayIdx % DAILY_PROMPTS.grammar.length],
    grammarAnswer: GRAMMAR_ANSWERS[dayIdx % GRAMMAR_ANSWERS.length]
  });
});

export default router;
