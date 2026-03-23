import { useState } from 'react';

const ROLES    = ['boss','developer','designer','researcher','writer','analyst','devops','custom'];
const AVATARS  = ['boss','dev','designer','researcher','writer','default'];
const COLORS   = ['#4f8ef7','#f7c94f','#f74faa','#4ff7c4','#c44ff7','#f74f4f','#4ff74f','#f7944f'];
const API_TYPES = [
  { value: 'ollama',  label: 'Ollama (local, free)' },
  { value: 'openai',  label: 'OpenAI / Compatible API' },
  { value: 'lmstudio',label: 'LM Studio (local)' },
  { value: 'groq',    label: 'Groq (free tier)' },
  { value: 'together',label: 'Together AI' }
];
const API_URLS = {
  ollama:   'http://localhost:11434',
  openai:   'https://api.openai.com',
  lmstudio: 'http://localhost:1234',
  groq:     'https://api.groq.com/openai',
  together: 'https://api.together.xyz'
};

export default function AgentEditor({ agent, onSave, onDelete, onClose }) {
  const isNew = !agent?.id;

  const [form, setForm] = useState({
    name:          agent?.name          || '',
    role:          agent?.role          || 'developer',
    avatar:        agent?.avatar        || 'dev',
    color:         agent?.color         || '#4f8ef7',
    model:         agent?.model         || 'llama3.2',
    api_type:      agent?.api_type      || 'ollama',
    api_url:       agent?.api_url       || 'http://localhost:11434',
    api_key:       agent?.api_key       || '',
    system_prompt: agent?.system_prompt || '',
    skills:        (agent?.skills ? JSON.parse(agent.skills) : []).join(', '),
    desk_x:        agent?.desk_x        || 300,
    desk_y:        agent?.desk_y        || 300,
    enabled:       agent?.enabled ?? 1
  });

  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleApiTypeChange = (type) => {
    set('api_type', type);
    set('api_url', API_URLS[type] || '');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      skills: form.skills.split(',').map(s => s.trim()).filter(Boolean)
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel agent-editor" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{isNew ? '+ NEW AGENT' : `EDIT: ${agent.name}`}</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="editor-body">
          {/* Left column */}
          <div className="editor-col">
            <label className="field-label">NAME</label>
            <input className="field-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Agent name..." maxLength={30}/>

            <label className="field-label">ROLE</label>
            <select className="field-input" value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <label className="field-label">AVATAR STYLE</label>
            <div className="avatar-picker">
              {AVATARS.map(a => (
                <button key={a} className={`avatar-opt ${form.avatar === a ? 'selected' : ''}`} onClick={() => set('avatar', a)}>{a}</button>
              ))}
            </div>

            <label className="field-label">COLOR</label>
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                  style={{ background: c }} onClick={() => set('color', c)}/>
              ))}
              <input type="color" value={form.color} onChange={e => set('color', e.target.value)} title="Custom color"/>
            </div>

            <label className="field-label">SKILLS (comma-separated)</label>
            <input className="field-input" value={form.skills}
              onChange={e => set('skills', e.target.value)}
              placeholder="Python, React, debugging..."/>
          </div>

          {/* Right column */}
          <div className="editor-col">
            <label className="field-label">AI PROVIDER</label>
            <select className="field-input" value={form.api_type} onChange={e => handleApiTypeChange(e.target.value)}>
              {API_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            <label className="field-label">API URL</label>
            <input className="field-input" value={form.api_url} onChange={e => set('api_url', e.target.value)} placeholder="http://localhost:11434"/>

            <label className="field-label">API KEY (optional)</label>
            <input className="field-input" type="password" value={form.api_key} onChange={e => set('api_key', e.target.value)} placeholder="sk-... or leave blank for Ollama"/>

            <label className="field-label">MODEL</label>
            <input className="field-input" value={form.model} onChange={e => set('model', e.target.value)} placeholder="llama3.2, gpt-4o, mixtral..."/>

            <label className="field-label">SYSTEM PROMPT</label>
            <textarea className="field-input field-textarea" value={form.system_prompt}
              onChange={e => set('system_prompt', e.target.value)}
              placeholder="You are an expert in... Your role is to..."/>
          </div>
        </div>

        <div className="modal-footer">
          {!isNew && (
            <button className="btn btn-danger" onClick={() => { onDelete(agent.id); onClose(); }}>
              DELETE AGENT
            </button>
          )}
          <div style={{ flex: 1 }}/>
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'SAVING...' : isNew ? 'CREATE AGENT' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  );
}
