import React, { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import Logo from '../components/Logo';
import { 
  Mic, 
  Lock, 
  User, 
  CheckCircle2, 
  Mail, 
  Phone, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles,
  BookOpen,
  MessageSquare,
  Award,
  BookMarked,
  Menu,
  X
} from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [username, setUsername] = useState(''); // Email for login
  const [password, setPassword] = useState('');
  
  // Registration Profile States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  // UI States for professional navbar
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const firstNameRef = useRef(null);

  const handleOpenLogin = () => {
    setIsLogin(true);
    setError('');
    setShowAuthModal(true);
  };

  const handleOpenRegister = () => {
    setIsLogin(false);
    setError('');
    setShowAuthModal(true);
    setTimeout(() => {
      firstNameRef.current?.focus();
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Field checks
    if (isLogin) {
      if (!username || !password) {
        setError('Please fill in all credentials.');
        return;
      }
    } else {
      if (!firstName || !lastName || !email || !password || !confirmPassword) {
        setError('Please fill in all registration fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Handle login (username represents their email)
        const response = await api.post('/api/auth/login', { username, password });
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        onLoginSuccess(response.user);
      } else {
        // Handle registration
        await api.post('/api/auth/register', { 
          firstName, 
          lastName, 
          email, 
          phone, 
          password, 
          confirmPassword 
        });
        setRegistered(true);
        setTimeout(() => {
          setIsLogin(true);
          setRegistered(false);
          // Set login username to the registered email for easy sign-in
          setUsername(email);
          setPassword('');
          // Clear inputs
          setFirstName('');
          setLastName('');
          setEmail('');
          setPhone('');
          setConfirmPassword('');
          // Stay in modal

        }, 1800);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'hsl(var(--bg-main))', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Navbar */}
      <header className={`landing-header ${isScrolled ? 'scrolled' : ''}`}>
        <Logo size={20} showText={true} />
        
        <nav className="desktop-nav flex items-center gap-8">
          <a href="#hero" className="header-nav-link">Home</a>
          <a href="#features" className="header-nav-link">Features</a>
          <a href="#about" className="header-nav-link">About Us</a>
          <button 
            onClick={handleOpenLogin}
            className="header-btn"
          >
            Sign In
          </button>
        </nav>

        {/* Mobile Nav Toggle */}
        <button 
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className={`mobile-nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <a 
              href="#hero" 
              className="header-nav-link"
              onClick={() => setMobileMenuOpen(false)}
              style={{ display: 'block', padding: '0.5rem 0', width: '100%' }}
            >
              Home
            </a>
            <a 
              href="#features" 
              className="header-nav-link"
              onClick={() => setMobileMenuOpen(false)}
              style={{ display: 'block', padding: '0.5rem 0', width: '100%' }}
            >
              Features
            </a>
            <a 
              href="#about" 
              className="header-nav-link"
              onClick={() => setMobileMenuOpen(false)}
              style={{ display: 'block', padding: '0.5rem 0', width: '100%' }}
            >
              About Us
            </a>
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenLogin();
              }}
              className="header-btn"
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              Sign In
            </button>
          </div>
        )}
      </header>

      {/* Main Landing Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Section 1: Hero Banner (Home) */}
        <section id="hero" style={{
          minHeight: '85vh',
          padding: '4rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          {/* Visual gradient flares */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '5%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, hsla(var(--primary), 0.06) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '10%',
            right: '5%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, hsla(var(--secondary), 0.05) 0%, transparent 60%)',
            pointerEvents: 'none'
          }} />

          <div style={{
            width: '100%',
            maxWidth: '900px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: '2.5rem',
            padding: '2.5rem 0'
          }}>
            
            {/* SaaS Pitch details */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{
                background: 'hsla(var(--primary), 0.1)',
                border: '1px solid hsla(var(--primary), 0.25)',
                color: 'hsl(var(--primary))',
                padding: '0.4rem 1rem',
                borderRadius: '50px',
                fontSize: '0.75rem',
                fontWeight: 700,
                alignSelf: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Sparkles size={12} /> Powered by Gemini AI
              </div>

              <h1 style={{
                fontSize: '3.5rem',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #fff 0%, hsl(var(--text-secondary)) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                maxWidth: '750px'
              }}>
                Speak English Confidently with <span style={{ background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Real-Time Feedback</span>
              </h1>

              <p style={{
                fontSize: '1.15rem',
                color: 'hsl(var(--text-secondary))',
                lineHeight: 1.6,
                fontWeight: 500,
                maxWidth: '680px'
              }}>
                English Coach AI is your personal, judgment-free speaking partner. Practice verbal chats, get instant grammar analysis, and prep for HR or technical interviews 24/7.
              </p>

              <button 
                onClick={handleOpenRegister}
                className="btn btn-primary"
                style={{ alignSelf: 'center', padding: '0.95rem 2.5rem', gap: '0.5rem', fontSize: '1rem', marginTop: '0.5rem' }}
              >
                Start Practicing Free <ArrowRight size={16} />
              </button>
            </div>

            {/* Premium horizontal cards */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
              gap: '1.5rem', 
              width: '100%',
              marginTop: '1.5rem',
              textAlign: 'left'
            }}>
              {[
                { title: "Natural Voice Coaching", desc: "Speak into your mic and listen to automated fluent verbal responses." },
                { title: "Speaking Analytics", desc: "Grades Grammar Accuracy, Vocab Richness, Pronunciation, and Fluency." },
                { title: "Mock Interview Prep", desc: "Simulate technical and HR interviews with recruiter-level feedback." }
              ].map((item, idx) => (
                <div key={idx} className="card" style={{ 
                  padding: '1.5rem', 
                  background: 'hsla(var(--bg-card), 0.35)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem',
                  border: '1px solid hsl(var(--border-color))' 
                }}>
                  <div style={{
                    background: 'hsla(var(--secondary), 0.12)',
                    color: 'hsl(var(--secondary))',
                    padding: '0.45rem',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    alignSelf: 'flex-start'
                  }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '1rem', color: 'hsl(var(--text-primary))', display: 'block', marginBottom: '0.25rem' }}>{item.title}</strong>
                    <span style={{ fontSize: '0.825rem', color: 'hsl(var(--text-muted))', lineHeight: 1.4, display: 'block' }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 2: Features Grid */}
        <section id="features" style={{
          padding: '5rem 2rem',
          background: 'linear-gradient(180deg, transparent 0%, hsla(var(--bg-card), 0.3) 100%)',
          borderTop: '1px solid hsl(var(--border-color))',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{ width: '100%', maxWidth: '1100px', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Designed to Build Speaking Confidence</h2>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem' }}>
                Democratizing language tutoring with AI tools mapped to improve speech, vocabulary, and grammar.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              {[
                { icon: <MessageSquare size={22} />, title: "General Voice Coach", desc: "Verbal dialogues utilizing speech recognition and synthesis. Hear replies, speak naturally, and get graded instantly." },
                { icon: <BookOpen size={22} />, title: "Structured Practice Topics", desc: "Difficulty-segmented prompts ranging from basic introductions to debates on science and work-life balance." },
                { icon: <Award size={22} />, title: "Recruiter Mock Interviews", desc: "HR and technical recruiter interview simulation. Analyze content correctness, structural flow, and confidence." },
                { icon: <BookMarked size={22} />, title: "Mistakes Tracker & Quiz", desc: "We log all your spoken grammatical errors and describe corrections. Take verbal quizzes to test your improvements." }
              ].map((item, idx) => (
                <div key={idx} className="card" style={{ padding: '2rem', background: 'hsla(var(--bg-card), 0.45)', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid hsl(var(--border-color))' }}>
                  <div style={{
                    color: 'hsl(var(--primary))',
                    background: 'hsla(var(--primary), 0.12)',
                    padding: '0.6rem',
                    borderRadius: '0.5rem',
                    alignSelf: 'flex-start'
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>{item.title}</h3>
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: About Us Section */}
        <section id="about" style={{
          padding: '5rem 2rem',
          borderTop: '1px solid hsl(var(--border-color))',
          background: 'hsl(var(--bg-main))',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{ 
            width: '100%', 
            maxWidth: '1000px', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '3rem',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ 
                fontSize: '0.75rem', 
                fontWeight: 700, 
                letterSpacing: '0.15em', 
                color: 'hsl(var(--secondary))', 
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '0.5rem'
              }}>
                OUR MISSION
              </span>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1rem' }}>
                Democratizing Language Tutoring
              </h2>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                Hiring native English speakers or private language tutors is expensive, and practicing with real humans can sometimes feel intimidating or induce speaking anxiety. 
              </p>
              <p style={{ color: 'hsl(var(--text-secondary))', fontSize: '0.95rem', lineHeight: 1.6 }}>
                We built **English Coach AI** to give everyone access to a private, highly capable, judgment-free speaking assistant. Our coach provides a safe, encouraging platform for learners to practice, make mistakes, build visual performance stats, and achieve speaking fluency.
              </p>
            </div>
            
            <div className="card" style={{
              padding: '2.25rem',
              border: '1px solid hsla(var(--secondary), 0.2)',
              background: 'linear-gradient(135deg, hsla(var(--secondary), 0.12) 0%, hsla(var(--primary), 0.05) 50%, hsla(var(--bg-card), 0.6) 100%)',
              boxShadow: '0 16px 40px -10px hsla(var(--secondary), 0.1), var(--shadow-lg)'
            }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', items: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'hsl(var(--secondary))' }} />
                Why practice with us?
              </h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem', listStyle: 'none', padding: 0 }}>
                {[
                  { bold: "Judgment-Free Zone:", normal: "Practice speaking and make mistakes comfortably without fear of judgment." },
                  { bold: "Active 24/7 Tutors:", normal: "Access your English coach whenever inspiration strikes, anywhere." },
                  { bold: "Analytics Dashboard:", normal: "Visually track your streak achievements and weekly accuracy trends." }
                ].map((item, idx) => (
                  <li key={idx} style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>
                    <strong style={{ color: 'hsl(var(--text-primary))' }}>{item.bold} </strong>
                    <span style={{ color: 'hsl(var(--text-secondary))' }}>{item.normal}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer style={{
        background: 'hsl(var(--bg-card))',
        borderTop: '1px solid hsl(var(--border-color))',
        padding: '2rem 1rem',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'hsl(var(--text-muted))'
      }}>
        <p style={{ marginBottom: '0.5rem' }}>© {new Date().getFullYear()} English Coach AI. All rights reserved.</p>
        <p style={{ fontSize: '0.75rem' }}>Build fluency, speak confidently, and prepare for interviews securely.</p>
      </footer>

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(5, 5, 8, 0.85)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }} onClick={() => setShowAuthModal(false)}>
          <div className="card animate-slide-in" style={{
            width: '100%',
            maxWidth: isLogin ? '420px' : '560px',
            padding: '2.5rem',
            border: '1px solid hsla(var(--primary), 0.25)',
            boxShadow: '0 20px 50px -15px hsla(var(--primary), 0.35), var(--shadow-lg)',
            transition: 'max-width var(--transition-smooth)',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Close button */}
            <button 
              onClick={() => setShowAuthModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'hsl(var(--text-muted))',
                fontSize: '1.25rem',
                cursor: 'pointer',
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.25rem'
              }}
              onMouseEnter={(e) => e.target.style.color = 'hsl(var(--text-primary))'}
              onMouseLeave={(e) => e.target.style.color = 'hsl(var(--text-muted))'}
            >
              ✕
            </button>

            <div className="flex flex-col mb-6" style={{ alignSelf: 'flex-start', width: '100%' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.25rem'
              }}>
                <div style={{
                  width: '6px',
                  height: '20px',
                  background: 'linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
                  borderRadius: '3px'
                }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
                  {isLogin ? 'Sign In' : 'Create Account'}
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginTop: '0.25rem' }}>
                {isLogin ? 'Access your coaching dashboard & speaking analytics.' : 'Begin your journey with your personal AI speaking coach.'}
              </p>
            </div>

            {registered ? (
              <div className="flex flex-col items-center justify-center py-6 gap-3" style={{ textAlign: 'center' }}>
                <CheckCircle2 size={48} color="hsl(var(--accent-green))" />
                <h3 style={{ color: 'hsl(var(--accent-green))', fontFamily: 'var(--font-display)' }}>Registration Complete!</h3>
                <p style={{ fontSize: '0.9rem' }}>Directing you to sign in with your email...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div style={{
                    background: 'hsla(var(--accent-red), 0.15)',
                    border: '1px solid hsla(var(--accent-red), 0.3)',
                    color: 'hsl(var(--accent-red))',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    marginBottom: '1.25rem'
                  }}>
                    {error}
                  </div>
                )}

                {isLogin ? (
                  <div className="flex flex-col gap-4">
                    <div className="form-group">
                      <label className="form-label">Email Address (Mail ID)</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                          <Mail size={18} />
                        </span>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="name@example.com"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          style={{ paddingLeft: '2.75rem' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Password</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                          <Lock size={18} />
                        </span>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{ paddingLeft: '2.75rem' }}
                          required
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    
                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                      <label className="form-label">First Name</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                          <User size={16} />
                        </span>
                        <input
                          ref={firstNameRef}
                          type="text"
                          className="form-input"
                          placeholder="John"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          style={{ paddingLeft: '2.5rem' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                      <label className="form-label">Last Name</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                          <User size={16} />
                        </span>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Doe"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          style={{ paddingLeft: '2.5rem' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Mail ID (Email)</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                          <Mail size={16} />
                        </span>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="john.doe@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          style={{ paddingLeft: '2.5rem' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                      <label className="form-label">Password</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                          <Lock size={16} />
                        </span>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          style={{ paddingLeft: '2.5rem' }}
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                      <label className="form-label">Confirm Password</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--text-muted))' }}>
                          <ShieldCheck size={16} />
                        </span>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          style={{ paddingLeft: '2.5rem' }}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={loading}
                  style={{ padding: '0.85rem', marginTop: '0.5rem' }}
                >
                  {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Coach Account'}
                </button>

                <div style={{
                  textAlign: 'center',
                  marginTop: '1.5rem',
                  fontSize: '0.875rem',
                  color: 'hsl(var(--text-secondary))'
                }}>
                  {isLogin ? "New user? " : "Existing member? "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'hsl(var(--primary))',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
