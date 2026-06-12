import React from 'react';

export default function Logo({ size = 20, showText = false, textStyle = {}, alignment = 'center' }) {
  return (
    <div style={{ display: 'flex', alignItems: alignment, gap: '0.75rem' }}>
      <div style={{
        position: 'relative',
        width: `${size * 1.7}px`,
        height: `${size * 1.7}px`,
        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--secondary)) 100%)',
        borderRadius: '0.65rem', // Squircle look
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 15px hsla(var(--primary), 0.35)',
        transition: 'all 0.3s ease',
        flexShrink: 0
      }}
      className="logo-icon-container"
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0a0a0c"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Chat bubble with speech soundwaves */}
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          <line x1="12" y1="9" x2="12" y2="15" strokeWidth="2.7" />
          <line x1="9" y1="11" x2="9" y2="13" strokeWidth="2.7" />
          <line x1="15" y1="11" x2="15" y2="13" strokeWidth="2.7" />
        </svg>
        {/* Glowing micro-dot */}
        <span style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          width: '5px',
          height: '5px',
          background: '#ffffff',
          borderRadius: '50%',
          boxShadow: '0 0 6px #ffffff'
        }} />
      </div>
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', ...textStyle }}>
          <span style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '1.2rem', 
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ffffff 0%, hsl(var(--text-secondary)) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            lineHeight: 1.2
          }}>
            English Coach AI
          </span>
          <span style={{ 
            fontSize: '0.65rem', 
            color: 'hsl(var(--text-muted))', 
            fontWeight: 700, 
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: '1px'
          }}>
            Gemini Assistant
          </span>
        </div>
      )}
    </div>
  );
}
