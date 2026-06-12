import React, { useEffect, useRef } from 'react';

export default function VoiceVisualizer({ state }) {
  // states: 'idle' | 'listening' | 'speaking'
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let phase = 0;
    
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      
      ctx.clearRect(0, 0, width, height);

      // Select colors and wave parameters based on state
      let color1, color2, amplitude, frequency;
      
      if (state === 'listening') {
        color1 = 'hsla(350, 80%, 55%, 0.8)';
        color2 = 'hsla(350, 80%, 45%, 0.2)';
        amplitude = 25;
        frequency = 0.08;
      } else if (state === 'speaking') {
        color1 = 'hsla(180, 85%, 45%, 0.8)';
        color2 = 'hsla(262, 80%, 55%, 0.2)';
        amplitude = 20;
        frequency = 0.05;
      } else {
        // Idle
        color1 = 'hsla(262, 80%, 55%, 0.3)';
        color2 = 'hsla(220, 15%, 18%, 0.1)';
        amplitude = 8;
        frequency = 0.02;
      }

      phase += 0.05;

      // Draw multi-layered waves for organic/glassy visual effect
      const drawWave = (offsetPhase, scaleAmp, opacityScale, color) => {
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = color;
        
        ctx.shadowBlur = state !== 'idle' ? 12 : 2;
        ctx.shadowColor = color1;

        for (let x = 0; x < width; x++) {
          const y = height / 2 + Math.sin(x * frequency + phase + offsetPhase) * amplitude * scaleAmp;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      };

      // Background gradient wave
      ctx.globalCompositeOperation = 'screen';
      drawWave(0, 1.0, 1.0, color1);
      drawWave(Math.PI / 3, 0.6, 0.5, color2);
      drawWave(Math.PI / 1.5, 0.35, 0.3, color1);
      
      ctx.shadowBlur = 0; // reset shadow
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [state]);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100px',
      background: 'rgba(0,0,0,0.15)',
      borderRadius: '1rem',
      border: '1px solid hsl(var(--border-color))',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{
        position: 'absolute',
        bottom: '0.5rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: state === 'listening' ? 'hsl(var(--accent-red))' : state === 'speaking' ? 'hsl(var(--secondary))' : 'hsl(var(--text-muted))'
      }}>
        {state === 'listening' ? 'Listening to speech...' : state === 'speaking' ? 'Speaking...' : 'Coach is ready'}
      </div>
    </div>
  );
}
