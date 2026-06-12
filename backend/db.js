import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

dotenv.config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN
});

export const executeWithRetry = async (queryObj, retries = 2, delay = 500) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await client.execute(queryObj);
    } catch (error) {
      const errorMsg = error.message ? error.message.toLowerCase() : '';
      const isNetworkError =
        errorMsg.includes('fetch failed') ||
        errorMsg.includes('timeout') ||
        error.code?.includes('TIMEOUT') ||
        error.code?.includes('UND_ERR');
      if (isNetworkError && i < retries) {
        console.warn(`[DB] Query timed out. Retrying ${i + 1}/${retries} in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
};

const initDb = async () => {
  try {
    // ── users ──────────────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT UNIQUE,
      phone TEXT,
      password_hash TEXT,
      english_level TEXT DEFAULT 'beginner',
      gemini_api_key TEXT DEFAULT '',
      daily_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_practice_date TEXT,
      total_practice_time_ms INTEGER DEFAULT 0,
      total_words_spoken INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      is_verified INTEGER DEFAULT 0,
      reset_token TEXT,
      reset_token_expires TEXT,
      created_at TEXT,
      updated_at TEXT
    );`);

    // Safety ALTER TABLE for users
    const userAlters = [
      `ALTER TABLE users ADD COLUMN first_name TEXT`,
      `ALTER TABLE users ADD COLUMN last_name TEXT`,
      `ALTER TABLE users ADD COLUMN phone TEXT`,
      `ALTER TABLE users ADD COLUMN english_level TEXT DEFAULT 'beginner'`,
      `ALTER TABLE users ADD COLUMN gemini_api_key TEXT DEFAULT ''`,
      `ALTER TABLE users ADD COLUMN daily_streak INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN longest_streak INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN last_practice_date TEXT`,
      `ALTER TABLE users ADD COLUMN total_practice_time_ms INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN total_words_spoken INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`,
      `ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN reset_token TEXT`,
      `ALTER TABLE users ADD COLUMN reset_token_expires TEXT`,
      `ALTER TABLE users ADD COLUMN updated_at TEXT`,
      `ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN learning_goal_hours INTEGER DEFAULT 5`,
      `ALTER TABLE users ADD COLUMN target_level TEXT DEFAULT 'expert'`,
      `ALTER TABLE users ADD COLUMN daily_practice_goal INTEGER DEFAULT 20`,
      `ALTER TABLE users ADD COLUMN leaderboard_opt_in INTEGER DEFAULT 1`,
      `ALTER TABLE users ADD COLUMN avatar_url TEXT DEFAULT ''`,
    ];
    for (const sql of userAlters) {
      try { await executeWithRetry(sql); } catch (_) {}
    }

    // ── practice_sessions ──────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS practice_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      session_type TEXT DEFAULT 'general',
      duration_ms INTEGER DEFAULT 0,
      words_spoken INTEGER DEFAULT 0,
      grammar_score INTEGER DEFAULT 0,
      vocabulary_score INTEGER DEFAULT 0,
      pronunciation_score INTEGER DEFAULT 0,
      fluency_score INTEGER DEFAULT 0,
      created_at TEXT
    );`);

    // ── voice_sessions ─────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS voice_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_text TEXT,
      ai_reply TEXT,
      grammar_score INTEGER DEFAULT 0,
      vocabulary_score INTEGER DEFAULT 0,
      pronunciation_score INTEGER DEFAULT 0,
      fluency_score INTEGER DEFAULT 0,
      had_mistake INTEGER DEFAULT 0,
      created_at TEXT
    );`);

    // ── daily_practice ─────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS daily_practice (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      date TEXT,
      speaking_done INTEGER DEFAULT 0,
      reading_done INTEGER DEFAULT 0,
      listening_done INTEGER DEFAULT 0,
      grammar_done INTEGER DEFAULT 0,
      completion_percent INTEGER DEFAULT 0,
      performance_score INTEGER DEFAULT 0,
      created_at TEXT
    );`);

    // ── vocabulary_words ───────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS vocabulary_words (
      id TEXT PRIMARY KEY,
      word TEXT,
      meaning TEXT,
      example TEXT,
      synonyms TEXT,
      pronunciation_guide TEXT,
      level TEXT DEFAULT 'beginner',
      created_at TEXT
    );`);

    // ── user_vocabulary ────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS user_vocabulary (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      word_id TEXT,
      word TEXT,
      status TEXT DEFAULT 'not_learned',
      reviewed_count INTEGER DEFAULT 0,
      last_reviewed_date TEXT,
      learned_at TEXT,
      created_at TEXT
    );`);

    // ── error_tracker ──────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS error_tracker (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      category TEXT DEFAULT 'grammar',
      original_text TEXT,
      corrected_text TEXT,
      explanation TEXT,
      frequency INTEGER DEFAULT 1,
      level TEXT,
      mastered INTEGER DEFAULT 0,
      created_at TEXT
    );`);

    // ── interview_sessions ─────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      interview_type TEXT,
      questions_json TEXT,
      answers_json TEXT,
      scores_json TEXT,
      overall_score INTEGER DEFAULT 0,
      created_at TEXT
    );`);

    // ── skill_scores ───────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS skill_scores (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE,
      grammar_avg INTEGER DEFAULT 0,
      vocabulary_avg INTEGER DEFAULT 0,
      pronunciation_avg INTEGER DEFAULT 0,
      fluency_avg INTEGER DEFAULT 0,
      total_sessions INTEGER DEFAULT 0,
      updated_at TEXT
    );`);
    try { await executeWithRetry(`ALTER TABLE skill_scores ADD COLUMN user_id TEXT`); } catch(_) {}

    // ── user_progress ──────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS user_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      date TEXT,
      grammar INTEGER DEFAULT 0,
      vocabulary INTEGER DEFAULT 0,
      pronunciation INTEGER DEFAULT 0,
      fluency INTEGER DEFAULT 0,
      words_spoken INTEGER DEFAULT 0,
      practice_time_ms INTEGER DEFAULT 0,
      created_at TEXT
    );`);

    // ── activity_logs ──────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT,
      details TEXT,
      created_at TEXT
    );`);
    try { await executeWithRetry(`ALTER TABLE activity_logs ADD COLUMN details TEXT`); } catch (_) {}

    // ── vocab_learned (legacy) ─────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS vocab_learned (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      word TEXT,
      meaning TEXT,
      example TEXT,
      synonyms TEXT,
      pronunciation_guide TEXT,
      date_learned TEXT,
      reviewed_count INTEGER DEFAULT 0,
      last_reviewed_date TEXT,
      original_word TEXT,
      created_at TEXT
    );`);
    const vlAlters = [
      `ALTER TABLE vocab_learned ADD COLUMN last_reviewed_date TEXT`,
      `ALTER TABLE vocab_learned ADD COLUMN original_word TEXT`,
    ];
    for (const sql of vlAlters) { try { await executeWithRetry(sql); } catch(_) {} }

    // ── mistakes (legacy) ──────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS mistakes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      original_sentence TEXT,
      corrected_sentence TEXT,
      explanation TEXT,
      level TEXT,
      mastered INTEGER DEFAULT 0,
      created_at TEXT
    );`);

    // ── progress (legacy) ──────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      date TEXT,
      grammar_score INTEGER,
      vocabulary_score INTEGER,
      pronunciation_score INTEGER,
      fluency_score INTEGER,
      practice_time_ms INTEGER,
      words_spoken INTEGER,
      created_at TEXT
    );`);

    // ── achievements ───────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      badge_id TEXT,
      badge_name TEXT,
      description TEXT,
      unlocked INTEGER DEFAULT 0,
      unlocked_at TEXT,
      created_at TEXT
    );`);

    // ── notifications ──────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      type TEXT,
      title TEXT,
      message TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT
    );`);

    // ── user_goals ─────────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS user_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      daily_minutes INTEGER DEFAULT 20,
      weekly_minutes INTEGER DEFAULT 100,
      learning_focus TEXT DEFAULT 'speaking',
      updated_at TEXT,
      created_at TEXT
    );`);

    // ── leaderboards ────────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS leaderboards (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT,
      xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      opt_in INTEGER DEFAULT 1,
      updated_at TEXT,
      created_at TEXT
    );`);

    // ── learning_reports ────────────────────────────────────────────────────────
    await executeWithRetry(`CREATE TABLE IF NOT EXISTS learning_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      period TEXT,
      date_generated TEXT,
      file_data_json TEXT,
      created_at TEXT
    );`);

    // ── Seed vocabulary_words ──────────────────────────────────────────────────
    const vocabCountResult = await executeWithRetry(`SELECT COUNT(*) as cnt FROM vocabulary_words`);
    if (Number(vocabCountResult.rows[0].cnt) === 0) {
      const SEED_VOCAB = [
        // Beginner
        { word: 'Frequent', meaning: 'Happening often or repeatedly.', example: 'He is a frequent visitor to the library.', synonyms: JSON.stringify(['Often', 'Common', 'Regular']), pronunciation_guide: '/ˈfriːkwənt/', level: 'beginner' },
        { word: 'Assist', meaning: 'To help someone by doing a share of the work.', example: 'The guide will assist you with your bags.', synonyms: JSON.stringify(['Help', 'Aid', 'Support']), pronunciation_guide: '/əˈsɪst/', level: 'beginner' },
        { word: 'Attempt', meaning: 'An act of trying to do something difficult.', example: 'She made an attempt to climb the tree.', synonyms: JSON.stringify(['Try', 'Effort', 'Endeavor']), pronunciation_guide: '/əˈtempt/', level: 'beginner' },
        { word: 'Gigantic', meaning: 'Extremely large or huge.', example: 'They saw a gigantic ship in the harbor.', synonyms: JSON.stringify(['Huge', 'Massive', 'Enormous']), pronunciation_guide: '/dʒaɪˈɡæntɪk/', level: 'beginner' },
        { word: 'Brief', meaning: 'Lasting only for a short time; using few words.', example: 'The teacher gave a brief explanation.', synonyms: JSON.stringify(['Short', 'Quick', 'Concise']), pronunciation_guide: '/briːf/', level: 'beginner' },
        { word: 'Inquire', meaning: 'To ask someone for information.', example: 'I called to inquire about ticket prices.', synonyms: JSON.stringify(['Ask', 'Query', 'Question']), pronunciation_guide: '/ɪnˈkwaɪər/', level: 'beginner' },
        { word: 'Construct', meaning: 'To build or make something physical.', example: 'Workers construct a new bridge.', synonyms: JSON.stringify(['Build', 'Create', 'Assemble']), pronunciation_guide: '/kənˈstrʌkt/', level: 'beginner' },
        { word: 'Generous', meaning: 'Showing readiness to give more than expected.', example: 'It was generous of you to buy lunch.', synonyms: JSON.stringify(['Kind', 'Charitable', 'Unselfish']), pronunciation_guide: '/ˈdʒenərəs/', level: 'beginner' },
        // Intermediate
        { word: 'Accumulate', meaning: 'To gather an increasing quantity over time.', example: 'Dust will accumulate on the shelves.', synonyms: JSON.stringify(['Gather', 'Collect', 'Amass']), pronunciation_guide: '/əˈkjuːmjəleɪt/', level: 'intermediate' },
        { word: 'Elaborate', meaning: 'Involving many carefully arranged details.', example: 'The chef prepared an elaborate dinner.', synonyms: JSON.stringify(['Detailed', 'Intricate', 'Complex']), pronunciation_guide: '/ɪˈlæbərət/', level: 'intermediate' },
        { word: 'Reluctant', meaning: 'Unwilling and hesitant to do something.', example: 'She was reluctant to speak in public.', synonyms: JSON.stringify(['Unwilling', 'Hesitant', 'Averse']), pronunciation_guide: '/rɪˈlʌktənt/', level: 'intermediate' },
        { word: 'Obtain', meaning: 'To get something through effort or request.', example: 'You need to obtain permission first.', synonyms: JSON.stringify(['Acquire', 'Get', 'Procure']), pronunciation_guide: '/əbˈteɪn/', level: 'intermediate' },
        { word: 'Accurate', meaning: 'Correct in all details; exact.', example: 'The forecast was surprisingly accurate.', synonyms: JSON.stringify(['Correct', 'Precise', 'Exact']), pronunciation_guide: '/ˈækjərət/', level: 'intermediate' },
        { word: 'Decline', meaning: 'To politely refuse an offer; to decrease.', example: 'She chose to decline the job offer.', synonyms: JSON.stringify(['Refuse', 'Reject', 'Decrease']), pronunciation_guide: '/dɪˈklaɪn/', level: 'intermediate' },
        { word: 'Consistent', meaning: 'Acting the same way over time; reliable.', example: 'Her performance has been consistent.', synonyms: JSON.stringify(['Steady', 'Regular', 'Constant']), pronunciation_guide: '/kənˈsɪstənt/', level: 'intermediate' },
        { word: 'Evaluate', meaning: 'To form an idea of the value or quality of something.', example: 'The committee will evaluate all applications.', synonyms: JSON.stringify(['Assess', 'Appraise', 'Judge']), pronunciation_guide: '/ɪˈvæljueɪt/', level: 'intermediate' },
        // Advanced
        { word: 'Ambiguous', meaning: 'Open to more than one interpretation.', example: 'The instructions were ambiguous.', synonyms: JSON.stringify(['Unclear', 'Vague', 'Equivocal']), pronunciation_guide: '/æmˈbɪɡjuəs/', level: 'advanced' },
        { word: 'Exacerbate', meaning: 'To make a bad situation worse.', example: 'Running will exacerbate your cough.', synonyms: JSON.stringify(['Aggravate', 'Worsen', 'Inflame']), pronunciation_guide: '/ɪɡˈzæsərbeɪt/', level: 'advanced' },
        { word: 'Pragmatic', meaning: 'Dealing with things sensibly based on practical considerations.', example: 'We need a pragmatic approach.', synonyms: JSON.stringify(['Practical', 'Realistic', 'Sensible']), pronunciation_guide: '/præɡˈmætɪk/', level: 'advanced' },
        { word: 'Substantial', meaning: 'Of considerable importance, size, or value.', example: 'The project received substantial funding.', synonyms: JSON.stringify(['Significant', 'Considerable', 'Sizable']), pronunciation_guide: '/səbˈstænʃl/', level: 'advanced' },
        { word: 'Superfluous', meaning: 'Unnecessary; more than enough.', example: 'Avoid adding superfluous words.', synonyms: JSON.stringify(['Redundant', 'Excess', 'Extra']), pronunciation_guide: '/suːˈpɜːrfluəs/', level: 'advanced' },
        { word: 'Acquiesce', meaning: 'To accept something reluctantly without protest.', example: 'She acquiesced to the client demands.', synonyms: JSON.stringify(['Comply', 'Consent', 'Agree']), pronunciation_guide: '/ˌækwiˈes/', level: 'advanced' },
        { word: 'Discrepancy', meaning: 'A lack of compatibility between two facts.', example: 'There was a discrepancy in the reports.', synonyms: JSON.stringify(['Difference', 'Inconsistency', 'Divergence']), pronunciation_guide: '/dɪˈskrepənsi/', level: 'advanced' },
        { word: 'Indispensable', meaning: 'Absolutely necessary; essential.', example: 'A dictionary is indispensable for learners.', synonyms: JSON.stringify(['Essential', 'Crucial', 'Vital']), pronunciation_guide: '/ˌɪndɪˈspensəbl/', level: 'advanced' },
      ];
      for (const v of SEED_VOCAB) {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        await executeWithRetry({
          sql: `INSERT INTO vocabulary_words (id, word, meaning, example, synonyms, pronunciation_guide, level, created_at) VALUES (?,?,?,?,?,?,?,?)`,
          args: [id, v.word, v.meaning, v.example, v.synonyms, v.pronunciation_guide, v.level, now]
        });
      }
      console.log('[DB] Seeded 24 vocabulary words.');
    }

    // ── Seed admin user ────────────────────────────────────────────────────────
    const adminResult = await executeWithRetry(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
    if (adminResult.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin123', salt);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      await executeWithRetry({
        sql: `INSERT INTO users (id, first_name, last_name, email, phone_number, password_hash, english_level, gemini_api_key, daily_streak, longest_streak, total_practice_time_ms, total_words_spoken, role, is_verified, created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [id, 'Admin', 'Coach', 'admin@englishcoach.ai', '', passwordHash, 'expert', '', 0, 0, 0, 0, 'admin', 1, now, now]
      });
      console.log('[DB] Admin user seeded: admin@englishcoach.ai / admin123');
    }

    console.log('[DB] All tables initialized successfully.');
  } catch (error) {
    console.error('[DB] Initialization failed:', error);
  }
};

initDb();

// ── Column mappings (camelCase ↔ snake_case) ───────────────────────────────────
const MAPPINGS = {
  users: {
    id: 'id', email: 'email', username: 'email',
    firstName: 'first_name', lastName: 'last_name', phone: 'phone_number',
    passwordHash: 'password_hash', englishLevel: 'english_level',
    geminiApiKey: 'gemini_api_key', dailyStreak: 'daily_streak',
    longestStreak: 'longest_streak', lastPracticeDate: 'last_practice_date',
    totalPracticeTimeMs: 'total_practice_time_ms', totalWordsSpoken: 'total_words_spoken',
    role: 'role', isVerified: 'is_verified', resetToken: 'reset_token',
    resetTokenExpires: 'reset_token_expires', createdAt: 'created_at', updatedAt: 'updated_at',
    xp: 'xp', learningGoalHours: 'learning_goal_hours', targetLevel: 'target_level',
    dailyPracticeGoal: 'daily_practice_goal', leaderboardOptIn: 'leaderboard_opt_in',
    avatarUrl: 'avatar_url'
  },
  practice_sessions: {
    id: 'id', userId: 'user_id', sessionType: 'session_type', durationMs: 'duration_ms',
    wordsSpoken: 'words_spoken', grammarScore: 'grammar_score',
    vocabularyScore: 'vocabulary_score', pronunciationScore: 'pronunciation_score',
    fluencyScore: 'fluency_score', createdAt: 'created_at'
  },
  voice_sessions: {
    id: 'id', userId: 'user_id', userText: 'user_text', aiReply: 'ai_reply',
    grammarScore: 'grammar_score', vocabularyScore: 'vocabulary_score',
    pronunciationScore: 'pronunciation_score', fluencyScore: 'fluency_score',
    hadMistake: 'had_mistake', createdAt: 'created_at'
  },
  daily_practice: {
    id: 'id', userId: 'user_id', date: 'date',
    speakingDone: 'speaking_done', readingDone: 'reading_done',
    listeningDone: 'listening_done', grammarDone: 'grammar_done',
    completionPercent: 'completion_percent', performanceScore: 'performance_score',
    createdAt: 'created_at'
  },
  vocabulary_words: {
    id: 'id', word: 'word', meaning: 'meaning', example: 'example',
    synonyms: 'synonyms', pronunciationGuide: 'pronunciation_guide',
    level: 'level', createdAt: 'created_at'
  },
  user_vocabulary: {
    id: 'id', userId: 'user_id', wordId: 'word_id', word: 'word',
    status: 'status', reviewedCount: 'reviewed_count',
    lastReviewedDate: 'last_reviewed_date', learnedAt: 'learned_at', createdAt: 'created_at'
  },
  error_tracker: {
    id: 'id', userId: 'user_id', category: 'category',
    originalText: 'original_text', correctedText: 'corrected_text',
    explanation: 'explanation', frequency: 'frequency',
    level: 'level', mastered: 'mastered', createdAt: 'created_at'
  },
  interview_sessions: {
    id: 'id', userId: 'user_id', interviewType: 'interview_type',
    questionsJson: 'questions_json', answersJson: 'answers_json',
    scoresJson: 'scores_json', overallScore: 'overall_score', createdAt: 'created_at'
  },
  skill_scores: {
    id: 'id', userId: 'user_id', grammarAvg: 'grammar_avg',
    vocabularyAvg: 'vocabulary_avg', pronunciationAvg: 'pronunciation_avg',
    fluencyAvg: 'fluency_avg', totalSessions: 'total_sessions', updatedAt: 'updated_at'
  },
  user_progress: {
    id: 'id', userId: 'user_id', date: 'date',
    grammar: 'grammar', vocabulary: 'vocabulary',
    pronunciation: 'pronunciation', fluency: 'fluency',
    wordsSpoken: 'words_spoken', practiceTimeMs: 'practice_time_ms', createdAt: 'created_at'
  },
  activity_logs: {
    id: 'id', userId: 'user_id', action: 'action', details: 'details', createdAt: 'created_at'
  },
  vocab_learned: {
    id: 'id', userId: 'user_id', word: 'word', meaning: 'meaning',
    example: 'example', synonyms: 'synonyms', pronunciationGuide: 'pronunciation_guide',
    dateLearned: 'date_learned', reviewedCount: 'reviewed_count',
    lastReviewedDate: 'last_reviewed_date', originalWord: 'original_word', createdAt: 'created_at'
  },
  mistakes: {
    id: 'id', userId: 'user_id', originalSentence: 'original_sentence',
    correctedSentence: 'corrected_sentence', explanation: 'explanation',
    level: 'level', mastered: 'mastered', createdAt: 'created_at'
  },
  progress: {
    id: 'id', userId: 'user_id', date: 'date',
    grammarScore: 'grammar_score', vocabularyScore: 'vocabulary_score',
    pronunciationScore: 'pronunciation_score', fluencyScore: 'fluency_score',
    practiceTimeMs: 'practice_time_ms', wordsSpoken: 'words_spoken', createdAt: 'created_at'
  },
  achievements: {
    id: 'id', userId: 'user_id', badgeId: 'badge_id', badgeName: 'badge_name',
    description: 'description', unlocked: 'unlocked', unlocked_at: 'unlocked_at',
    createdAt: 'created_at'
  },
  notifications: {
    id: 'id', userId: 'user_id', type: 'type', title: 'title', message: 'message',
    isRead: 'is_read', createdAt: 'created_at'
  },
  user_goals: {
    id: 'id', userId: 'user_id', dailyMinutes: 'daily_minutes', weeklyMinutes: 'weekly_minutes',
    learningFocus: 'learning_focus', updatedAt: 'updated_at', createdAt: 'created_at'
  },
  leaderboards: {
    id: 'id', userId: 'user_id', name: 'name', xp: 'xp', streak: 'streak',
    optIn: 'opt_in', updatedAt: 'updated_at', createdAt: 'created_at'
  },
  learning_reports: {
    id: 'id', userId: 'user_id', period: 'period', dateGenerated: 'date_generated',
    fileDataJson: 'file_data_json', createdAt: 'created_at'
  }
};

const JSON_FIELDS = new Set(['synonyms', 'questions_json', 'answers_json', 'scores_json', 'file_data_json']);
const BOOL_FIELDS = new Set(['mastered', 'had_mistake', 'is_verified', 'speaking_done', 'reading_done', 'listening_done', 'grammar_done', 'unlocked', 'is_read', 'opt_in', 'leaderboard_opt_in']);

const mapToDb = (tableName, record) => {
  const mapping = MAPPINGS[tableName];
  if (!mapping) return record;
  const dbRecord = {};
  for (const key in record) {
    const dbKey = mapping[key] || key;
    let value = record[key];
    if (JSON_FIELDS.has(dbKey) && Array.isArray(value)) value = JSON.stringify(value);
    if (BOOL_FIELDS.has(dbKey)) value = value ? 1 : 0;
    dbRecord[dbKey] = value;
  }
  return dbRecord;
};

const mapFromDb = (tableName, dbRecord) => {
  if (!dbRecord) return null;
  const mapping = MAPPINGS[tableName];
  if (!mapping) return dbRecord;

  const reverseMapping = {};
  for (const key in mapping) reverseMapping[mapping[key]] = key;

  const record = {};
  for (const dbKey in dbRecord) {
    const jsKey = reverseMapping[dbKey];
    let value = dbRecord[dbKey];
    if (JSON_FIELDS.has(dbKey) && typeof value === 'string') {
      try { value = JSON.parse(value); } catch (_) {}
    }
    if (BOOL_FIELDS.has(dbKey)) value = value === 1 || value === true;
    record[jsKey || dbKey] = value;
  }

  if (tableName === 'users') {
    if (!record.username) record.username = record.email;
    if (record.phone && record.phone.startsWith('no-phone-')) record.phone = '';
  }
  return record;
};

export const db = {
  async read(tableName) {
    try {
      const rs = await executeWithRetry(`SELECT * FROM ${tableName}`);
      return rs.rows.map(row => mapFromDb(tableName, row));
    } catch (e) { console.error(`[DB read] ${tableName}:`, e); return []; }
  },

  async query(sql, args = []) {
    try {
      const rs = await executeWithRetry({ sql, args });
      return rs.rows;
    } catch (e) { console.error(`[DB query] ${sql}:`, e); return []; }
  },

  async find(tableName, predicate) {
    try {
      if (!predicate || Object.keys(predicate).length === 0) return this.read(tableName);
      const dbPredicate = mapToDb(tableName, predicate);
      const clauses = [], values = [];
      for (const col in dbPredicate) { clauses.push(`${col} = ?`); values.push(dbPredicate[col]); }
      const rs = await executeWithRetry({ sql: `SELECT * FROM ${tableName} WHERE ${clauses.join(' AND ')}`, args: values });
      return rs.rows.map(row => mapFromDb(tableName, row));
    } catch (e) { console.error(`[DB find] ${tableName}:`, e); return []; }
  },

  async findOne(tableName, predicate) {
    const results = await this.find(tableName, predicate);
    return results.length > 0 ? results[0] : null;
  },

  async insert(tableName, record) {
    try {
      const now = new Date().toISOString();
      const newRecord = { id: crypto.randomUUID(), ...record };
      if (MAPPINGS[tableName]?.createdAt && !newRecord.createdAt) {
        newRecord.createdAt = now;
      }
      if (MAPPINGS[tableName]?.updatedAt && !newRecord.updatedAt) {
        newRecord.updatedAt = now;
      }
      if (tableName === 'users' && (!newRecord.phone || !newRecord.phone.trim())) {
        newRecord.phone = 'no-phone-' + crypto.randomUUID();
      }
      const dbRecord = mapToDb(tableName, newRecord);
      const columns = Object.keys(dbRecord);
      const values = Object.values(dbRecord);
      await executeWithRetry({ sql: `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, args: values });
      return mapFromDb(tableName, dbRecord);
    } catch (e) { console.error(`[DB insert] ${tableName}:`, e); throw e; }
  },

  async update(tableName, id, updates) {
    try {
      const newUpdates = { ...updates };
      if (tableName === 'users' && newUpdates.phone !== undefined && (!newUpdates.phone || !newUpdates.phone.trim())) {
        newUpdates.phone = 'no-phone-' + crypto.randomUUID();
      }
      const dbUpdates = mapToDb(tableName, newUpdates);
      const clauses = [], values = [];
      for (const col in dbUpdates) { clauses.push(`${col} = ?`); values.push(dbUpdates[col]); }
      values.push(id);
      await executeWithRetry({ sql: `UPDATE ${tableName} SET ${clauses.join(', ')} WHERE id = ?`, args: values });
      return this.findOne(tableName, { id });
    } catch (e) { console.error(`[DB update] ${tableName}:`, e); throw e; }
  },

  async delete(tableName, id) {
    try {
      const result = await executeWithRetry({ sql: `DELETE FROM ${tableName} WHERE id = ?`, args: [id] });
      return result.rowsAffected > 0;
    } catch (e) { console.error(`[DB delete] ${tableName}:`, e); return false; }
  }
};
