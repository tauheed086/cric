import { useEffect, useRef, useState } from 'react';
import { getActiveRequestCount, subscribeActiveRequests } from '../api/client';

export function IntroLoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [statusText, setStatusText] = useState('Loading Live Turf...');
  const dismissedRef = useRef(false);

  useEffect(() => {
    let unmounted = false;
    let minTimePassed = false;
    let dataReady = false;

    function dismiss() {
      if (dismissedRef.current || unmounted) return;
      dismissedRef.current = true;
      setIsExiting(true);
      setTimeout(() => {
        if (!unmounted) {
          setIsVisible(false);
        }
      }, 450);
    }

    function checkReady() {
      if (minTimePassed && dataReady) {
        dismiss();
      }
    }

    // Allow a smooth 450ms presentation so it doesn't flicker on ultra-fast responses
    const minTimer = setTimeout(() => {
      minTimePassed = true;
      checkReady();
    }, 450);

    // Progressive status hints for real slow queries
    const t1 = setTimeout(() => {
      if (!unmounted && !dismissedRef.current) {
        setStatusText('Synchronizing Tournament Data...');
      }
    }, 700);

    // Hard safety timeout: loader will NEVER stay visible longer than 2.5 seconds under any circumstance
    const maxTimer = setTimeout(() => {
      dismiss();
    }, 2500);

    // Monitor real API network activity
    let seenRequests = getActiveRequestCount() > 0;
    let settlePassed = false;

    const unsubscribe = subscribeActiveRequests((count) => {
      if (count > 0) {
        seenRequests = true;
        dataReady = false;
      } else {
        // Requests completed or settle window passed
        if (seenRequests || settlePassed) {
          dataReady = true;
          checkReady();
        }
      }
    });

    // If after 300ms no requests were initiated (e.g. cached or static view), mark data ready
    const initialCheckTimer = setTimeout(() => {
      settlePassed = true;
      if (getActiveRequestCount() === 0) {
        dataReady = true;
        checkReady();
      }
    }, 300);

    return () => {
      unmounted = true;
      clearTimeout(minTimer);
      clearTimeout(t1);
      clearTimeout(maxTimer);
      clearTimeout(initialCheckTimer);
      unsubscribe();
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`intro-overlay ${isExiting ? 'is-exiting' : ''}`.trim()}
      onClick={() => {
        setIsExiting(true);
        setTimeout(() => setIsVisible(false), 350);
      }}
      role="status"
      aria-label="Loading TurfHero..."
      title="Click to skip"
    >
      <div className="intro-content">
        {/* 3D Spatial Stage */}
        <div className="intro-3d-stage">
          {/* Floating & Levitation Wrapper */}
          <div className="intro-float-wrap">
            {/* 3D Rotating Logo Container */}
            <div className="intro-logo-container">
              <img
                src="/logo.png"
                alt="TurfHero 3D Logo"
                className="intro-logo-image"
              />
              {/* Specular Light Reflection Sweep */}
              <div className="intro-specular" aria-hidden="true" />
            </div>
          </div>

          {/* Dynamic Ground Shadow Breathing Beneath Logo */}
          <div className="intro-ground-shadow" aria-hidden="true" />
        </div>

        {/* Branding & Status */}
        <div className="intro-brand">
          <h1 className="intro-title">TurfHero</h1>
          <p className="intro-tagline">Every Ball. Every Tournament. Live.</p>
        </div>

        {/* Laser Progress Beam */}
        <div className="intro-progress-bar" aria-hidden="true">
          <div className="intro-progress-laser" />
        </div>

        {/* Loading Hint */}
        <div className="intro-status-text">{statusText}</div>
      </div>
    </div>
  );
}
