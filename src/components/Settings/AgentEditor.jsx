import { useState } from 'react';

const ROLES = ['boss','developer','designer','researcher','writer','analyst','devops','qa','custom'];
const COLORS = ['#4f8ef7','#f7c94f','#f74faa','#4ff7c4','#c44ff7','#f74f4f','#4ff7a4','#f7944f','#a4f74f','#4fc4f7'];
const API_TYPES = [
  { value: 'ollama',   label: 'Ollama (local · free)',      url: 'http://localhost:11434' },
  { value: 'lmstudio', label: 'LM Studio (local · free)',   url: 'http://localhost:1234'  },
  { value: 'groq',     label: 'Groq (cloud · free tier)',   url: 'https://api.groq.com/openai' },
  { value: 'openai',   label: 'OpenAI (cloud · paid)',      url: 'https://api.openai.com' },
  { value: 'together', label: 'Together AI (cloud)',        url: 'https://api.together.xyz' },
  { value: 'custom',   label: 'Custom OpenAI-compatible',   url: 'http://localhost:8080' },
];
const SUGGESTED_MODELS = {
  ollama:   ['llama3.2', 'llama3.1', 'mistral', 'phi3', 'gemma2', 'qwen2.5'],
  lmstudio: ['local-model'],
  groq:     ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  openai:   ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  together: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'],
  custom:   [],
};

function parseSkills(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

export default function AgentEditor({ agent, onSave, onDelete, onClose }) {
  const isNew = !agent?.id;

  const [form, setForm] = useState({
    name:          agent?.name          || '',
    role:          agent?.role          || 'developer',
    color:         agent?.color         || '#4f8ef7',
    model:         agent?.model         || 'llama3.2',
    api_type:      agent?.api_type      || 'ollama',
    api_url:       agent?.api_url       || 'http://localhost:11434',
    api_key:       agent?.api_key       || '',
    system_prompt: agent?.system_prompt || '',
    skills:        parseSkills(agent?.skills),
    enabled:       agent?.enabled ?? 1,
  });

  const [skillInput, setSkillInput] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [tab,        setTab]        = useState('identity'); // identity | ai | prompt

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleApiType = (type) => {
    const found = API_TYPES.find(t => t.value === type);
    set('api_type', type);
    set('api_url', found?.url || '');
    // Suggest first model for this provider
    const models = SUGGESTED_MODELS[type] || [];
    if (models.length) set('model', models[0]);
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || form.skills.includes(s)) return;
    set('skills', [...form.skills, s]);
    setSkillInput('');
  };

  const removeSkill = (s) => set('skills', form.skills.filter(x => x !== s));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({ ...form });
    setSaving(false);
    onClose();
  };

  const suggestedModels = SUGGESTED_MODELS[form.api_type] || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel agent-editor" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div className="editor-header-left">
            <div className="editor-color-preview" style={{ background: form.color }}/>
            <span>{isNew ? '+ NEW AGENT' : `EDIT: ${agent.name.toUpperCase()}`}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="editor-tabs">
          {['identity','ai','prompt'].map(t => (
            <button
              key={t}
              className={`editor-tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'identity' && '👤 IDENTITY'}
              {t === 'ai'       && '⬡ AI MODEL'}
              {t === 'prompt'   && '📝 BEHAVIOUR'}
            </button>
          ))}
        </div>

        {/* ── IDENTITY TAB ── */}
        {tab === 'identity' && (
          <div className="editor-tab-body">
            <div className="editor-two-col">
              <div className="editor-col">
                <label className="field-label">AGENT NAME</label>
                <input
                  className="field-input"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Rex, Nova, Pixel…"
                  maxLength={30}
                  autoFocus
                />

                <label className="field-label">ROLE</label>
                <select className="field-input" value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>

                <label className="field-label">ACCENT COLOUR</label>
                <div className="color-picker">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      className={`color-swatch ${form.color === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => set('color', c)}
                    />
                  ))}
                  <label className="color-custom-wrap" title="Pick custom colour">
                    <input type="color" value={form.color} onChange={e => set('color', e.target.value)} />
                    <span className="color-custom-label">⊕</span>
                  </label>
                </div>
              </div>

              <div className="editor-col">
                <label className="field-label">SKILLS</label>
                <div className="skills-list">
                  {form.skills.map(s => (
                    <span key={s} className="skill-chip">
                      {s}
                      <button className="skill-remove" onClick={() => removeSkill(s)}>×</button>
                    </span>
                  ))}
                </div>
                <div className="skill-add-row">
                  <input
                    className="field-input"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSkill()}
                    placeholder="Python, React, debugging…"
                    maxLength={40}
                  />
                  <button className="btn btn-ghost" onClick={addSkill}>ADD</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── AI MODEL TAB ── */}
        {tab === 'ai' && (
          <div className="editor-tab-body">
            <div className="editor-two-col">
              <div className="editor-col">
                <label className="field-label">AI PROVIDER</label>
                <select className="field-input" value={form.api_type} onChange={e => handleApiType(e.target.value)}>
                  {API_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>

                <label className="field-label">API URL</label>
                <input
                  className="field-input"
                  value={form.api_url}
                  onChange={e => set('api_url', e.target.value)}
                  placeholder="http://localhost:11434"
                />

                <label className="field-label">API KEY <span className="field-optional">(leave blank for Ollama/LM Studio)</span></label>
                <input
                  className="field-input"
                  type="password"
                  value={form.api_key}
                  onChange={e => set('api_key', e.target.value)}
                  placeholder="sk-…"
                />
              </div>

              <div className="editor-col">
                <label className="field-label">MODEL</label>
                <input
                  className="field-input"
                  value={form.model}
                  onChange={e => set('model', e.target.value)}
                  placeholder="llama3.2"
                />
                {suggestedModels.length > 0 && (
                  <div className="model-suggestions">
                    <span className="field-label" style={{ marginBottom: 4 }}>QUICK PICK</span>
                    <div className="model-chips">
                      {suggestedModels.map(m => (
                        <button
                          key={m}
                          className={`model-chip ${form.model === m ? 'selected' : ''}`}
                          onClick={() => set('model', m)}
                        >{m}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="ai-info-box">
                  {form.api_type === 'ollama' && (
                    <p>Runs locally on your machine. Free. Install at <b>ollama.com</b> then run <code>ollama pull {form.model}</code>.</p>
                  )}
                  {form.api_type === 'lmstudio' && (
                    <p>Runs locally via LM Studio. Free. Open LM Studio, load a model, and enable the local server.</p>
                  )}
                  {form.api_type === 'groq' && (
                    <p>Cloud API with a free tier. Get your key at <b>console.groq.com</b>. Very fast inference.</p>
                  )}
                  {form.api_type === 'openai' && (
                    <p>OpenAI cloud API. Requires payment. Get your key at <b>platform.openai.com</b>.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PROMPT / BEHAVIOUR TAB ── */}
        {tab === 'prompt' && (
          <div className="editor-tab-body">
            <label className="field-label">SYSTEM PROMPT</label>
            <p className="field-hint">Define the agent's personality, expertise, and working style. Be specific — this is what makes each agent unique.</p>
            <textarea
              className="field-input field-textarea tall"
              value={form.system_prompt}
              onChange={e => set('system_prompt', e.target.value)}
              placeholder={`You are ${form.name || 'an AI agent'}. Your role is ${form.role}.\n\nYour expertise includes: ${form.skills.slice(0,3).join(', ') || '...'}.\n\nYour working style: [describe how this agent approaches problems]`}
            />
            <div className="prompt-presets">
              <span className="field-label">QUICK PRESETS</span>
              <div className="preset-chips">
                {[
                  ['Developer',  `You are ${form.name || 'a developer'}, a senior software engineer. You write clean, working code with clear comments. You prefer simple solutions over complex ones. You always test your logic before submitting.`],
                  ['Designer',   `You are ${form.name || 'a designer'}, a creative UI/UX designer. You think deeply about user experience and visual hierarchy. You produce detailed design specs and CSS.`],
                  ['Researcher', `You are ${form.name || 'a researcher'}, an expert researcher. You search for accurate information, cross-reference sources, and summarise findings clearly and concisely.`],
                  ['Boss',       `You are ${form.name || 'the boss'}, the team orchestrator. You break down tasks into clear subtasks, assign each to the right team member based on their skills, and synthesise final results.`],
                ].map(([label, text]) => (
                  <button key={label} className="preset-chip" onClick={() => set('system_prompt', text)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          {!isNew && (
            <button className="btn btn-danger" onClick={() => { if(confirm(`Delete ${agent.name}?`)) { onDelete(agent.id); onClose(); } }}>
              DELETE
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? 'SAVING…' : isNew ? '+ CREATE AGENT' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  );
}
