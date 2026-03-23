import SummaryCard from './SummaryCard';

export default function SummaryPanel({ summaries, interests, onDelete }) {
  const enabledInterests = interests.filter(i => i.enabled).map(i => i.topic);

  return (
    <div className="panel summary-panel">
      <div className="panel-header">
        <span className="panel-title">◈ PRIVATE SUMMARY WINDOW</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {enabledInterests.length > 0 && (
            <span className="panel-badge interests-badge" title={enabledInterests.join(', ')}>
              {enabledInterests.length} INTERESTS
            </span>
          )}
          <span className="panel-badge">{summaries.length} DIGESTS</span>
        </div>
      </div>

      {enabledInterests.length > 0 && (
        <div className="interests-bar">
          {enabledInterests.slice(0, 6).map(t => (
            <span key={t} className="interest-tag">{t}</span>
          ))}
          {enabledInterests.length > 6 && (
            <span className="interest-tag-more">+{enabledInterests.length - 6} more</span>
          )}
        </div>
      )}

      <div className="summary-scroll">
        {summaries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⬡</div>
            <p className="empty-title">AWAITING FIRST SCAN</p>
            <p className="empty-sub">Agent is initialising...</p>
          </div>
        ) : (
          summaries.map(s => (
            <SummaryCard key={s.id} summary={s} onDelete={onDelete} />
          ))
        )}
      </div>
    </div>
  );
}
