import { useEffect, useState } from 'react';

export default function TitleBar({ connected, agentCount, taskRunning }) {
  const [time,       setTime]      = useState(new Date());
  const [isPortable, setPortable]  = useState(false);
  const [isDesktop,  setIsDesktop] = useState(false);

  useEffect(() => {
    if (window.swikElectron) {
      window.swikElectron.isPortable().then(setPortable).catch(() => {});
      window.swikElectron.isDesktop().then(setIsDesktop).catch(() => {});
    }
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="titlebar">
      <div className="tb-left">
        <div className="tb-logo">
          <span className="tb-logo-icon">⬡</span>
          <span className="tb-logo-text">SWIK<span className="tb-logo-sub"> HQ</span></span>
        </div>
        <div className="tb-pills">
          <span className={`tb-pill ${connected ? 'live' : 'dead'}`}>
            <span className="tb-dot"/>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          <span className="tb-pill neutral">{agentCount} AGENTS</span>
          {taskRunning > 0 && <span className="tb-pill running">{taskRunning} RUNNING</span>}
          {isPortable  && <span className="tb-pill usb">💾 USB</span>}
        </div>
      </div>

      <div className="tb-clock">
        {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>

      {isDesktop && (
        <div className="tb-controls">
          <button className="wc-btn" onClick={() => window.swikElectron?.minimize()} title="Minimize">─</button>
          <button className="wc-btn" onClick={() => window.swikElectron?.maximize()} title="Maximize">□</button>
          <button className="wc-btn close" onClick={() => window.swikElectron?.close()} title="Close">✕</button>
        </div>
      )}
    </div>
  );
}
