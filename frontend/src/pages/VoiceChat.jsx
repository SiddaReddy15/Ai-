import React, { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';
import { speechHandler } from '../utils/speech';
import VoiceVisualizer from '../components/VoiceVisualizer';
import { 
  Mic, 
  MicOff, 
  Send, 
  Volume2, 
  VolumeX, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';

export default function VoiceChat({ user, topicContext }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [inputText, setInputText] = useState('');
  const [visualizerState, setVisualizerState] = useState('idle'); // 'idle' | 'listening' | 'speaking'
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Real-time metrics panel state
  const [analysis, setAnalysis] = useState(null);
  
  const chatEndRef = useRef(null);
  const startTimeRef = useRef(null);

  // Initialize speaking rate speed based on level and custom settings
  useEffect(() => {
    if (user?.englishLevel) {
      speechHandler.setLevel(user.englishLevel);
    }
    // Pull accent and speed settings from user record if they exist
    if (user) {
      const goals = async () => {
        try {
          const uGoals = await api.get('/api/auth/goals');
          if (uGoals) {
            // Find stored speed/accent/personality in localstorage or via custom API
            // For now, let's load from user configuration objects
            const savedAccent = localStorage.getItem(`accent_${user.id}`);
            const savedSpeed = localStorage.getItem(`speed_${user.id}`);
            speechHandler.setCustomVoiceSettings(savedAccent, savedSpeed);
          }
        } catch (_) {}
      };
      goals();
    }
  }, [user]);

  // Load initial greeting or topic-specific context greeting
  useEffect(() => {
    const initGreeting = () => {
      let welcomeText = `Hello! I'm your English Coach. Let's practice speaking today. How are you doing?`;
      if (topicContext) {
        welcomeText = `Welcome to the topic practice room! Today we'll talk about "${topicContext.title}". ${topicContext.prompt}`;
      } else if (user?.englishLevel === 'beginner') {
        welcomeText = `Hello! I am your English coach. I speak slowly. How are you today?`;
      } else if (user?.englishLevel === 'advanced') {
        welcomeText = `Hello! It's a pleasure to speak with you today. Let's engage in an interesting topic. What would you like to discuss?`;
      }

      setChatHistory([{
        sender: 'ai',
        text: welcomeText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

      // Speak welcome greeting
      if (!isMuted) {
        speakResponse(welcomeText);
      }
    };
    initGreeting();
    
    // Start tracking practice duration
    startTimeRef.current = Date.now();

    return () => {
      speechHandler.cancelSpeak();
      speechHandler.stopListening();
    };
  }, [topicContext]);

  // Scroll to bottom of chat bubbles
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const speakResponse = (text) => {
    if (isMuted) return;
    
    setVisualizerState('speaking');
    speechHandler.speak(text, {
      onEnd: () => setVisualizerState('idle'),
      onStart: () => setVisualizerState('speaking')
    });
  };

  const handleToggleListening = () => {
    if (visualizerState === 'listening') {
      speechHandler.stopListening();
      setVisualizerState('idle');
    } else {
      speechHandler.cancelSpeak();
      setVisualizerState('listening');
      
      speechHandler.startListening({
        onStart: () => {
          setVisualizerState('listening');
          setError('');
        },
        onResult: ({ text, isFinal }) => {
          setInputText(text);
          if (isFinal) {
            sendMessage(text);
          }
        },
        onEnd: () => {
          setVisualizerState('idle');
        },
        onError: (err) => {
          setError(`Microphone error: ${err}`);
          setVisualizerState('idle');
        }
      });
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    setInputText('');
    speechHandler.stopListening();
    
    // Calculate approximate speaking duration for statistics
    const sessionDurationMs = startTimeRef.current 
      ? Date.now() - startTimeRef.current 
      : 5000;
    startTimeRef.current = Date.now(); // reset timer

    const userMessage = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMessage]);
    setLoading(true);
    setError('');

    try {
      // Map existing messages to format expected by backend
      const historyContext = chatHistory.map(c => ({
        user: c.sender === 'user' ? c.text : '',
        ai: c.sender === 'ai' ? c.text : ''
      }));

      // Call backend AI Coach API
      const response = await api.post('/api/coach/chat', {
        message: text,
        chatHistory: historyContext,
        contextMode: topicContext ? 'topic' : 'general',
        practiceTimeMs: Math.max(2000, Math.min(60000, sessionDurationMs))
      });

      const aiMessage = {
        sender: 'ai',
        text: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isOffline: response.isOffline
      };

      setChatHistory(prev => [...prev, aiMessage]);
      setAnalysis(response);
      speakResponse(response.reply);

    } catch (err) {
      console.error(err);
      setError('Communication error. Failed to get response from AI coach.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    speechHandler.cancelSpeak();
    setChatHistory([]);
    setAnalysis(null);
  };

  return (
    <div className="flex animate-slide-in gap-6" style={{ height: 'calc(100vh - 5.5rem)', overflow: 'hidden' }}>
      
      {/* Primary Conversation Area */}
      <div className="card flex flex-col flex-1" style={{ height: '100%', padding: '1.25rem', justifyContent: 'space-between' }}>
        
        {/* Chat Header */}
        <div className="flex justify-between items-center pb-3" style={{ borderBottom: '1px solid hsl(var(--border-color))' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} style={{ color: 'hsl(var(--primary))' }} />
              {topicContext ? `Topic: ${topicContext.title}` : 'English Speaking Coach'}
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
              {topicContext ? 'Focused Practice Room' : 'Free Conversation Room'}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              className="btn btn-secondary btn-icon"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute voice feedback' : 'Mute voice feedback'}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button 
              className="btn btn-secondary btn-icon"
              onClick={handleClearChat}
              title="Clear conversation history"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Conversation Bubbles */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {chatHistory.map((msg, index) => (
            <div 
              key={index}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}
            >
              <div style={{
                background: msg.sender === 'user' 
                  ? 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.8) 100%)'
                  : 'hsl(var(--bg-main))',
                color: 'hsl(var(--text-primary))',
                padding: '0.8rem 1.1rem',
                borderRadius: msg.sender === 'user' 
                  ? '1.1rem 1.1rem 0 1.1rem'
                  : '1.1rem 1.1rem 1.1rem 0',
                border: msg.sender === 'user' ? 'none' : '1px solid hsl(var(--border-color))',
                fontSize: '0.925rem',
                lineHeight: '1.5',
                boxShadow: msg.sender === 'user' ? '0 4px 12px hsla(var(--primary), 0.15)' : 'none'
              }}>
                {msg.text}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem', padding: '0 0.25rem' }}>
                {msg.timestamp}
              </span>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start', background: 'hsl(var(--bg-main))', border: '1px solid hsl(var(--border-color))', padding: '0.75rem 1.25rem', borderRadius: '1.1rem 1.1rem 1.1rem 0', display: 'flex', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', background: 'hsl(var(--text-muted))', borderRadius: '50%', animation: 'pulse-mic 1s infinite alternate' }} />
              <span style={{ width: '6px', height: '6px', background: 'hsl(var(--text-muted))', borderRadius: '50%', animation: 'pulse-mic 1s infinite alternate 0.2s' }} />
              <span style={{ width: '6px', height: '6px', background: 'hsl(var(--text-muted))', borderRadius: '50%', animation: 'pulse-mic 1s infinite alternate 0.4s' }} />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input interface */}
        <div className="flex flex-col gap-3">
          {/* Dynamic canvas waveform */}
          <VoiceVisualizer state={visualizerState} />

          {error && (
            <div className="flex items-center gap-2" style={{
              background: 'hsla(var(--accent-red), 0.1)',
              border: '1px solid hsla(var(--accent-red), 0.2)',
              color: 'hsl(var(--accent-red))',
              padding: '0.5rem 1rem',
              borderRadius: '0.75rem',
              fontSize: '0.8rem'
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Form / Mic controls */}
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <button
              type="button"
              onClick={handleToggleListening}
              className={`btn ${visualizerState === 'listening' ? 'mic-active' : 'btn-secondary'}`}
              style={{ padding: '0.85rem', borderRadius: '50%', width: '48px', height: '48px', flexShrink: 0 }}
              title="Toggle Speak Mode (Microphone)"
            >
              {visualizerState === 'listening' ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input
              type="text"
              className="form-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={visualizerState === 'listening' ? 'Speaking...' : 'Type a response or tap microphone to speak...'}
              style={{ borderRadius: '1.5rem', padding: '0 1.25rem' }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ borderRadius: '50%', width: '48px', height: '48px', flexShrink: 0, padding: 0 }}
              disabled={!inputText.trim()}
            >
              <Send size={18} />
            </button>
          </form>
        </div>

      </div>

      {/* Real-Time Assessment Drawer Panel */}
      <div className="card flex flex-col" style={{ width: '320px', height: '100%', padding: '1.25rem', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '1.05rem', borderBottom: '1px solid hsl(var(--border-color))', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Sparkles size={16} style={{ color: 'hsl(var(--primary))' }} />
          Coach Evaluation
        </h3>

        {analysis ? (
          <div className="flex flex-col gap-5">
            {/* Real-time scores */}
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, marginBottom: '0.75rem' }}>SESSION PERFORMANCE</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ background: 'hsl(var(--bg-main))', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid hsl(var(--border-color))', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', display: 'block' }}>Grammar</span>
                  <strong style={{ fontSize: '1.1rem', color: 'hsl(var(--primary))' }}>{analysis.scores?.grammar || 0}%</strong>
                </div>
                <div style={{ background: 'hsl(var(--bg-main))', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid hsl(var(--border-color))', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', display: 'block' }}>Vocabulary</span>
                  <strong style={{ fontSize: '1.1rem', color: 'hsl(var(--secondary))' }}>{analysis.scores?.vocabulary || 0}%</strong>
                </div>
                <div style={{ background: 'hsl(var(--bg-main))', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid hsl(var(--border-color))', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', display: 'block' }}>Fluency</span>
                  <strong style={{ fontSize: '1.1rem', color: 'hsl(var(--accent-green))' }}>{analysis.scores?.fluency || 0}%</strong>
                </div>
                <div style={{ background: 'hsl(var(--bg-main))', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid hsl(var(--border-color))', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'hsl(var(--text-muted))', display: 'block' }}>Pronunciation</span>
                  <strong style={{ fontSize: '1.1rem', color: 'hsl(var(--accent-yellow))' }}>{analysis.scores?.pronunciation || 0}%</strong>
                </div>
              </div>
            </div>

            {/* Grammar corrections */}
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, marginBottom: '0.5rem' }}>GRAMMAR CORRECTION</h4>
              {analysis.grammarCorrection?.hasMistakes ? (
                <div className="flex flex-col gap-2" style={{ background: 'hsla(var(--accent-red), 0.05)', border: '1px solid hsla(var(--accent-red), 0.2)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'hsl(var(--accent-red))', fontWeight: 600 }}>Spoken: </span>
                    <span style={{ textDecoration: 'line-through', color: 'hsl(var(--text-muted))' }}>"{analysis.grammarCorrection.original}"</span>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'hsl(var(--accent-green))', fontWeight: 600 }}>Correct: </span>
                    <strong>"{analysis.grammarCorrection.corrected}"</strong>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))', marginTop: '0.25rem', borderTop: '1px dashed hsl(var(--border-color))', paddingTop: '0.4rem' }}>
                    {analysis.grammarCorrection.explanation}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2" style={{ background: 'hsla(var(--accent-green), 0.05)', border: '1px solid hsla(var(--accent-green), 0.2)', padding: '0.75rem', borderRadius: '0.75rem', color: 'hsl(var(--accent-green))', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle size={16} />
                  No grammar mistakes detected!
                </div>
              )}
            </div>

            {/* Vocabulary upgrades */}
            <div>
              <h4 style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', fontWeight: 600, marginBottom: '0.5rem' }}>VOCABULARY UPGRADES</h4>
              {analysis.vocabularyImprovements && analysis.vocabularyImprovements.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {analysis.vocabularyImprovements.map((item, index) => (
                    <div key={index} style={{ background: 'hsl(var(--bg-main))', border: '1px solid hsl(var(--border-color))', padding: '0.65rem', borderRadius: '0.65rem', fontSize: '0.825rem' }}>
                      <div className="flex items-center gap-1.5" style={{ marginBottom: '0.2rem' }}>
                        <span style={{ color: 'hsl(var(--text-muted))' }}>{item.originalWord}</span>
                        <span style={{ fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>→</span>
                        <strong style={{ color: 'hsl(var(--secondary))' }}>{item.improvedWord}</strong>
                      </div>
                      <p style={{ fontSize: '0.725rem', color: 'hsl(var(--text-secondary))' }}>{item.explanation}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>Excellent word choice!</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1" style={{ textAlign: 'center', color: 'hsl(var(--text-muted))', gap: '0.75rem', padding: '1rem' }}>
            <BookOpen size={32} strokeWidth={1.5} />
            <p style={{ fontSize: '0.85rem' }}>
              Your speech corrections and vocabulary enhancements will update here in real time as you speak.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
