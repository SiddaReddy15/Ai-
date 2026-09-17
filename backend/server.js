import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import coachRoutes from './routes/coach.js';
import practiceRoutes from './routes/practice.js';
import vocabRoutes from './routes/vocab.js';
import progressRoutes from './routes/progress.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for local-first testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parsers
app.use(express.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/vocab', vocabRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Root route - redirect to frontend app in development mode
app.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  }
  res.send(`
    <html>
      <head><title>English Coach AI API</title></head>
      <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-center: center; height: 100vh; margin: 0; text-align: center;">
        <h1>English Coach AI API Server (Port 5000)</h1>
        <p>The main web application UI is running on <strong>Port 3000</strong>.</p>
        <a href="http://localhost:3000" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Open App on Port 3000 &rarr;</a>
      </body>
    </html>
  `);
});

// Serve static frontend assets in production mode if built
const __dirname = path.resolve();
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`  English Speaking Coach AI Backend running!`);
  console.log(`  Port: http://localhost:${PORT} (Bound to 0.0.0.0)`);
  console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`==================================================`);
});
