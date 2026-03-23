import { useState, useEffect } from 'react';

export default function StatsPanel({ onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const maxCount = stats?.sourceBreakdown?.reduce((m, s) => Math.max(m, s.count), 0) || 1;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel stats-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">▦ AGENT STATISTICS</span>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {loading && <div className="stats-loading">Loading...</div>}

        {stats && (
          <>
            {/* KPI row */}
            <div className="stats-kpi-row">
              <div className="stats-kpi">
                <div className="kpi-value">{stats.totalScans}</div>
                <div className="kpi-label">TOTAL SCANS</div>
              </div>
              <div className="stats-kpi">
                <div className="kpi-value">{stats.totalItems.toLocaleString()}</div>
                <div className="kpi-label">ITEMS ANALYSED</div>
              </div>
              <div className="stats-kpi">
                <div className="kpi-value">
                  {stats.totalScans > 0 ? Math.round(stats.totalItems / stats.totalScans) : 0}
                </div>
                <div className="kpi-label">AVG PER SCAN</div>
              </div>
            </div>

            {/* Source breakdown */}
            <section className="settings-section">
              <h3 className="settings-section-title">◈ ITEMS BY SOURCE</h3>
              <div className="source-bars">
                {stats.sourceBreakdown.map(s => (
                  <div key={s.source} className="source-bar-row">
                    <span className="source-bar-label">{s.source}</span>
                    <div className="source-bar-track">
                      <div
                        className="source-bar-fill"
                        style={{ width: `${(s.count / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="source-bar-count">{s.count}</span>
                  </div>
                ))}
                {stats.sourceBreakdown.length === 0 && (
                  <p className="empty-interests">No data yet — run a scan first.</p>
                )}
              </div>
            </section>

            {/* Scan history */}
            <section className="settings-section">
              <h3 className="settings-section-title">◈ RECENT SCANS</h3>
              <div className="scan-history">
                {stats.scanHistory.map(s => (
                  <div key={s.scan_number} className="scan-history-row">
                    <span className="sh-num">#{s.scan_number}</span>
                    <span className="sh-ts">{s.timestamp}</span>
                    <span className="sh-items">{s.item_count} items</span>
                  </div>
                ))}
                {stats.scanHistory.length === 0 && (
                  <p className="empty-interests">No scans yet.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
