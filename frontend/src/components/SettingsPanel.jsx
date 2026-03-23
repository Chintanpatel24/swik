import { useState } from 'react';

export default function SettingsPanel({ interests, settings, onAdd, onToggle, onRemove, onSaveSetting, onClose }) {
  const [newTopic, setNewTopic]   = useState('');
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState('');
  const [interval, setIntervalVal] = useState(settings.scanInterval || 30);

  const handleAdd = async () => {
    if (!newTopic.trim()) return;
    setAdding(true); setError('');
    try {
      await onAdd(newTopic.trim());
      setNewTopic('');
    } catch (e) {
      setError(e.message);
    }
    setAdding(false);
  };

  const handleIntervalSave = () => {
    const v = parseInt(interval, 10);
    if (isNaN(v) || v < 5) { setError('Minimum interval is 5 minutes'); return; }
    onSaveSetting('scanInterval', v);
    setError('');
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">⚙ AGENT SETTINGS</span>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        {/* ── INTERESTS ── */}
        <section className="settings-section">
          <h3 className="settings-section-title">◈ YOUR INTERESTS</h3>
          <p className="settings-section-desc">
            The AI personalises every digest around these topics. Enabled topics are highlighted and prioritised.
          </p>

          <div className="interests-list">
            {interests.map(interest => (
              <div key={interest.id} className={`interest-row ${interest.enabled ? 'enabled' : 'disabled'}`}>
                <button
                  className={`interest-toggle ${interest.enabled ? 'on' : 'off'}`}
                  onClick={() => onToggle(interest.id, !interest.enabled)}
                  title={interest.enabled ? 'Disable' : 'Enable'}
                >
                  {interest.enabled ? '●' : '○'}
                </button>
                <span className="interest-topic">{interest.topic}</span>
                <button className="interest-delete" onClick={() => onRemove(interest.id)} title="Remove">✕</button>
              </div>
            ))}
            {interests.length === 0 && (
              <p className="empty-interests">No interests set — agent will cover all topics equally.</p>
            )}
          </div>

          <div className="interest-add">
            <input
              className="settings-input"
              value={newTopic}
              onChange={e => setNewTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Add topic (e.g. Rust, Kubernetes, LLMs...)"
              maxLength={60}
            />
            <button className="settings-btn" onClick={handleAdd} disabled={adding || !newTopic.trim()}>
              {adding ? '...' : '+ ADD'}
            </button>
          </div>
        </section>

        {/* ── SCAN INTERVAL ── */}
        <section className="settings-section">
          <h3 className="settings-section-title">⏱ SCAN INTERVAL</h3>
          <p className="settings-section-desc">How often the agent fetches and summarises new content.</p>
          <div className="interval-row">
            <input
              type="number"
              className="settings-input interval-input"
              value={interval}
              min={5}
              max={1440}
              onChange={e => setIntervalVal(e.target.value)}
            />
            <span className="interval-label">minutes</span>
            <button className="settings-btn" onClick={handleIntervalSave}>SAVE</button>
          </div>
          <p className="settings-section-desc" style={{ marginTop: 6 }}>
            Minimum: 5 min &nbsp;·&nbsp; Recommended: 30 min
          </p>
        </section>

        {error && <div className="settings-error">{error}</div>}

        <div className="settings-footer">
          Changes apply immediately — no restart needed.
        </div>
      </div>
    </div>
  );
}
