import { useState, useEffect } from 'react';

export default function TitleBar({ connected, agentCount }) {
  const [isPortable, setIsPortable] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.isPortable().then(setIsPortable).catch(() => {});
    }
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const minimize = () => window.electronAPI?.minimize();
  const maximize = () => window.electronAPI?.maximize();
  const close    = () => window.electronAPI?.close();

  return (
    <div className="titlebar" style={{ WebkitAppRegion: 'drag' }}>
      <div className="titlebar-left">
        <div className="app-logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">AGENT<span className="logo-accent">OFFICE</span></span>
        </div>
        <div className="titlebar-meta">
          <span className={`ws-dot ${connected ? 'live' : 'dead'}`}/>
          <span>{connected ? 'LIVE' : 'OFFLINE'}</span>
          <span className="tb-sep">|</span>
          <span>{agentCount} AGENTS</span>
          {isPortable && <><span className="tb-sep">|</span><span className="portable-badge">💾 USB MODE</span></>}
        </div>
      </div>

      <div className="titlebar-clock">{time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>

      <div className="titlebar-controls" style={{ WebkitAppRegion: 'no-drag' }}>
        <button className="wc-btn minimize" onClick={minimize}>─</button>
        <button className="wc-btn maximize" onClick={maximize}>□</button>
        <button className="wc-btn close"    onClick={close}>✕</button>
      </div>
    </div>
  );
}
