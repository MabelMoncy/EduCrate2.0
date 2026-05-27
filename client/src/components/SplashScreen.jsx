import React, { useEffect, useRef, useState } from 'react';

/**
 * SplashScreen — plays the animated logo webm on first visit.
 * Calls onFinish() when the video ends or when the user skips.
 * Audio is muted. The splash is skipped after the video duration
 * and shows a skip button after 1 s so power users can bypass it.
 */
export default function SplashScreen({ onFinish }) {
  const videoRef = useRef(null);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  // Show skip button after 1 second
  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 1000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    if (fading) return;
    setFading(true);
    // Wait for fade-out transition, then call parent
    setTimeout(() => {
      setVisible(false);
      onFinish();
    }, 600);
  };

  const handleVideoEnd = () => dismiss();

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 40%, #0d1526 0%, #070d1a 60%, #000 100%)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.6s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* Subtle animated grid overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />

      {/* Glow blob behind video */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* Video container */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
        }}
      >
        <div
          style={{
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 0 80px rgba(99,102,241,0.2), 0 0 0 1px rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            maxWidth: '380px',
            width: '90vw',
          }}
        >
          <video
            ref={videoRef}
            src="/animatedLogo.webm"
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnd}
            style={{
              width: '100%',
              display: 'block',
              borderRadius: '24px',
            }}
          />
        </div>

        {/* App name beneath video */}
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              fontSize: '13px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
            }}
          >
            Digital Repository
          </p>
        </div>

        {/* Loading dots */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: 'rgba(99,102,241,0.7)',
                animation: `splashDot 1.2s ${i * 0.2}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Skip button */}
      {showSkip && (
        <button
          onClick={dismiss}
          style={{
            position: 'absolute',
            bottom: '36px',
            right: '36px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 18px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            transition: 'color 0.2s, background 0.2s, border-color 0.2s',
            zIndex: 2,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
          }}
        >
          Skip
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes splashDot {
          0%, 100% { opacity: 0.25; transform: translateY(0); }
          50%       { opacity: 1;    transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
