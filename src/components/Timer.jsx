import React, { useEffect, useState, useRef } from "react";
import { PlayIcon, PauseIcon, SkipIcon, ClockIcon } from "./Icons";

// Icons locais para minimizar/maximizar
const MinimizeIcon = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="10" y1="14" x2="3" y2="21" />
  </svg>
);

const MaximizeIcon = ({ size = 20, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 3h6v6" />
    <path d="M9 21H3v-6" />
    <path d="M21 3l-7 7" />
    <path d="M3 21l7-7" />
  </svg>
);

export default function Timer({ duration, onFinish, onCancel }) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(true);
  const [isMinimized, setIsMinimized] = useState(true);
  const timerRef = useRef(null);

  // Play a soft beep sound using Web Audio API (no external file needed!)
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Beep 1
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.3);

      // Beep 2 (delayed)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 note
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.4);
      }, 300);

      // Vibrate device if supported
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.log("Audio contexts not supported/allowed yet by browser policy:", e);
    }
  };

  useEffect(() => {
    setTimeLeft(duration);
    setIsActive(true);
  }, [duration]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(timerRef.current);
      playBeep();
      onFinish();
    }

    return () => clearInterval(timerRef.current);
  }, [isActive, timeLeft, onFinish]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const add30Seconds = () => {
    setTimeLeft((prev) => prev + 30);
  };

  const skipTimer = () => {
    clearInterval(timerRef.current);
    onFinish();
  };

  // Circular progress calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = duration > 0 ? (duration - timeLeft) / duration : 0;
  const strokeDashoffset = circumference - progress * circumference;

  // Minimized pill border progress calculations (Perimeter of 320x54 capsule)
  const borderCircumference = 699;
  const borderStrokeDashoffset = borderCircumference - (timeLeft / duration) * borderCircumference;

  // Format time (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`timer-overlay-wrapper ${isMinimized ? "is-minimized" : "is-maximized"} animate-fade-in`}>
      {!isMinimized ? (
        <div className="timer-modal glass animate-slide-up">
          <div className="timer-header">
            <div className="timer-header-title">
              <ClockIcon size={20} className="timer-header-icon" />
              <span>Timer de Descanso</span>
            </div>
            <button className="btn-minimize" onClick={() => setIsMinimized(true)} title="Minimizar">
              <MinimizeIcon size={18} />
            </button>
          </div>

          {/* Circular Countdown */}
          <div className="timer-circle-container">
            <svg className="timer-svg" width="140" height="140">
              <circle
                className="timer-circle-bg"
                cx="70"
                cy="70"
                r={radius}
                strokeWidth="6"
              />
              <circle
                className="timer-circle-progress"
                cx="70"
                cy="70"
                r={radius}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="timer-digits">{formatTime(timeLeft)}</div>
          </div>

          <div className="timer-controls">
            <button className="btn btn-secondary btn-circle" onClick={toggleTimer}>
              {isActive ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
            </button>
            
            <button className="btn btn-primary btn-pill" onClick={add30Seconds}>
              +30s
            </button>

            <button className="btn btn-secondary btn-circle" onClick={skipTimer}>
              <SkipIcon size={20} />
            </button>
          </div>

          <button className="btn-cancel-timer" onClick={onCancel}>
            Pular Descanso
          </button>
        </div>
      ) : (
        <div 
          className="timer-dynamic-island glass-dark animate-island-pop"
          onClick={() => setIsMinimized(false)}
          title="Maximizar"
        >
          <div className="island-content">
            <div className="island-info">
              <ClockIcon size={18} className="island-clock-icon animate-pulse" />
              <span className="island-digits">{formatTime(timeLeft)}</span>
            </div>

            <div className="island-controls" onClick={(e) => e.stopPropagation()}>
              <button className="btn-island-control" onClick={toggleTimer} title={isActive ? "Pausar" : "Iniciar"}>
                {isActive ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
              </button>
              <button className="btn-island-control btn-island-pill" onClick={add30Seconds}>
                +30s
              </button>
              <button className="btn-island-control" onClick={skipTimer} title="Pular descanso">
                <SkipIcon size={14} />
              </button>
            </div>

            <div className="island-actions">
              <button 
                className="btn-island-action" 
                onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} 
                title="Maximizar"
              >
                <MaximizeIcon size={18} />
              </button>
            </div>
          </div>

          {/* Border progress outline */}
          <svg className="island-border-progress-svg" width="320" height="54">
            <rect
              className="island-border-progress-track"
              x="0.5"
              y="0.5"
              width="319"
              height="53"
              rx="26.5"
              fill="none"
            />
            <rect
              className="island-border-progress-rect"
              x="0.5"
              y="0.5"
              width="319"
              height="53"
              rx="26.5"
              fill="none"
              strokeDasharray="699"
              strokeDashoffset={borderStrokeDashoffset}
            />
          </svg>
        </div>
      )}

      <style>{`
        .timer-overlay-wrapper.is-maximized {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(31, 31, 31, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .timer-overlay-wrapper.is-minimized {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          pointer-events: none;
        }

        .timer-modal {
          width: 100%;
          max-width: 320px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          border: 1px solid var(--glass-border);
          border-radius: 28px;
          box-shadow: 0 8px 32px var(--glass-shadow);
        }

        .timer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          color: var(--color-text-secondary);
          font-family: var(--font-title);
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 20px;
        }

        .timer-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-minimize {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }

        .btn-minimize:hover {
          background: var(--border-color);
          color: var(--color-text-primary);
        }

        .timer-header-icon {
          color: var(--accent-purple);
        }

        .timer-circle-container {
          position: relative;
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .timer-svg {
          transform: rotate(-90deg);
        }

        .timer-circle-bg {
          fill: none;
          stroke: var(--border-color);
          opacity: 0.25;
        }

        .timer-circle-progress {
          fill: none;
          stroke: var(--accent-purple);
          transition: stroke-dashoffset 1s linear;
        }

        .timer-digits {
          position: absolute;
          font-size: 2.2rem;
          font-weight: 700;
          color: var(--color-text-primary);
          font-family: var(--font-title);
          letter-spacing: -0.02em;
        }

        .timer-controls {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
          width: 100%;
          justify-content: center;
        }

        .btn-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          padding: 0;
        }

        .btn-pill {
          padding: 10px 20px;
          font-size: 0.95rem;
          border-radius: 99px;
        }

        .btn-cancel-timer {
          background: none;
          border: none;
          color: var(--color-text-muted);
          font-size: 0.85rem;
          cursor: pointer;
          font-weight: 500;
          transition: color 0.2s;
        }

        .btn-cancel-timer:hover {
          color: var(--status-error);
        }

        /* Ilha Dinâmica (Dynamic Island) no Topo-Centro */
        .timer-dynamic-island {
          pointer-events: auto;
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 320px;
          height: 54px;
          background: rgba(18, 18, 20, 0.8);
          border-radius: 27px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          overflow: hidden;
          z-index: 1001;
          display: flex;
          flex-direction: column;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .timer-dynamic-island:hover {
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5);
          transform: translateX(-50%) scale(1.02);
        }

        .island-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 18px;
          height: 100%;
          width: 100%;
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .island-info {
          display: flex;
          align-items: center;
          gap: 8px;
          user-select: none;
        }

        .island-clock-icon {
          color: var(--accent-purple);
        }

        .island-digits {
          font-size: 1.15rem;
          font-weight: 700;
          color: #ffffff;
          font-family: var(--font-title);
          letter-spacing: -0.01em;
        }

        .island-controls {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .btn-island-control {
          background: rgba(255, 255, 255, 0.12);
          border: none;
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          transition: all 0.2s ease;
        }

        .btn-island-control:hover {
          background: rgba(255, 255, 255, 0.24);
          transform: scale(1.08);
        }

        .btn-island-control:active {
          transform: scale(0.95);
        }

        .btn-island-pill {
          width: auto;
          height: 34px;
          padding: 0 12px;
          border-radius: 17px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .island-actions {
          display: flex;
          align-items: center;
        }

        .btn-island-action {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-island-action:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .island-border-progress-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        .island-border-progress-track {
          stroke: rgba(255, 255, 255, 0.08);
          stroke-width: 1.5px;
        }

        .island-border-progress-rect {
          stroke: var(--accent-purple);
          stroke-width: 1.5px;
          stroke-linecap: round;
          transition: stroke-dashoffset 1s linear;
        }

        .animate-island-pop {
          animation: islandPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes islandPop {
          from {
            transform: translateX(-50%) scale(0.85);
            opacity: 0;
          }
          to {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
      `}</style>
    </div>
  );
}
