import { useState } from 'react';

function parseMarkdown(text) {
  return text
    .replace(/### (.+)/g,    '<h3>$1</h3>')
    .replace(/## (.+)/g,     '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,   '<em>$1</em>')
    .replace(/`(.+?)`/g,     '<code>$1</code>')
    .replace(/^- (.+)$/gm,   '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>(\n|$))+/g, m => `<ul>${m}</ul>`)
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1 ↗</a>')
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1 ↗</a>');
}

export default function SummaryCard({ summary, onDelete }) {
  const [expanded, setExpanded] = useState(true);
  const [deleting, setDeleting] = useState(false);

  let sources = [];
  try { sources = JSON.parse(summary.sources); } catch {}

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirm(`Delete digest #${summary.scan_number}?`)) return;
    setDeleting(true);
    await onDelete(summary.id);
  };

  return (
    <div className={`summary-card ${expanded ? 'expanded' : 'collapsed'} ${deleting ? 'deleting' : ''}`}>
      <div className="summary-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="summary-meta">
          <span className="scan-badge">SCAN #{summary.scan_number}</span>
          <span className="summary-ts">{summary.timestamp}</span>
          <span className="item-count">{summary.item_count} items</span>
        </div>
        <div className="card-actions">
          <button className="card-action-btn delete-btn" onClick={handleDelete} title="Delete digest">✕</button>
          <button className="expand-btn">{expanded ? '▲' : '▼'}</button>
        </div>
      </div>

      {expanded && (
        <>
          <div
            className="summary-body"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(summary.raw_text) }}
          />
          <div className="summary-sources">
            {sources.map(s => <span key={s} className="source-chip">{s}</span>)}
          </div>
        </>
      )}
    </div>
  );
}
