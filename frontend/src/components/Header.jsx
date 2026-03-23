import { useCountdown } from '../hooks/useCountdown';
import OllamaStatus from './OllamaStatus';

export default function Header({ connected, status, progress, onScan, onOpenSettings, onOpenStats }) {
  const countdown = useCountdown(status.nextScanAt);

  const uptime = () => {
    const s = Math.floor(status.uptime);
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="logo">
          TECH<span className="logo-accent">SCAN</span>
          <span className="logo-sub">AGENT</span>
        </div>
        <div className="header-meta">
          <span>UPTIME {uptime()}</span>
          <span className="sep">|</span>
          <span>{status.scanCount} DIGESTS</span>
          {status.model && <><span className="sep">|</span><span>{status.model}</span></>}
        </div>
      </div>

      <div className="header-center">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%`, transition: progress === 0 ? 'none' : 'width 0.4s ease' }}
          />
        </div>
      </div>

      <div className="header-right">
        <OllamaStatus />
        <div className={`conn-pill ${connected ? 'connected' : 'disconnected'}`}>
          <span className="conn-dot" />
          {connected ? 'BACKEND LIVE' : 'RECONNECTING'}
        </div>
        <div className="status-pill">
          <span className={`status-dot ${status.isScanning ? 'scanning' : 'idle'}`} />
          {status.isScanning ? 'SCANNING' : `NEXT: ${countdown}`}
        </div>
        <button className="icon-btn" onClick={onOpenStats} title="Statistics">▦</button>
        <button className="icon-btn" onClick={onOpenSettings} title="Settings">⚙</button>
        <button className="scan-btn" onClick={onScan} disabled={status.isScanning || !connected}>
          ⟳ SCAN NOW
        </button>
      </div>
    </header>
  );
}
