import { useState } from 'react';

const PROVIDERS = [
  { id: 'groq',       name: 'Groq',       note: 'Fastest free API',         free: true,  url: 'https://api.groq.com/openai',  model: 'llama-3.3-70b-versatile',             keyUrl: 'https://console.groq.com' },
  { id: 'openrouter', name: 'OpenRouter', note: 'Many free models',         free: true,  url: 'https://openrouter.ai/api/v1', model: 'meta-llama/llama-3-8b-instruct:free', keyUrl: 'https://openrouter.ai/keys' },
  { id: 'ollama',     name: 'Ollama',     note: 'Local — fully offline',    free: true,  url: 'http://localhost:11434',        model: 'llama3.2',                             keyUrl: 'https://ollama.ai' },
  { id: 'lmstudio',   name: 'LM Studio',  note: 'Local GUI',                free: true,  url: 'http://localhost:1234',         model: 'local-model',                          keyUrl: 'https://lmstudio.ai' },
  { id: 'openai',     name: 'OpenAI',     note: 'Paid — best quality',      free: false, url: 'https://api.openai.com',        model: 'gpt-4o-mini',                          keyUrl: 'https://platform.openai.com/api-keys' },
  { id: 'custom',     name: 'Custom',     note: 'Any OpenAI-compatible API', free: true,  url: '',                             model: '',                                     keyUrl: '' },
];

const ROLES = ['boss','developer','designer','researcher','writer','analyst','devops','qa','custom'];
const COLORS = ['#00ff88','#00e5ff','#ff00cc','#ffe600','#9d4edd','#ff6b00','#ff4466','#00d4ff','#7fff00','#ff9900'];
const AVATARS = ['🤖','👑','💻','🔍','✍️','📊','⚙️','🧪','🎨','🧠','🦾','🔮','⚡','🎯','🛡️','🌐'];

function parseSkills(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

const PRESETS = {
  boss:       (name) => `You are ${name}, the orchestrator. Plan tasks, delegate to specialists, and synthesise results. Be decisive and strategic.`,
  developer:  (name) => `You are ${name}, a software developer. Write clean, documented, production-quality code. Think before coding.`,
  designer:   (name) => `You are ${name}, a UI/UX designer. Create beautiful, accessible interfaces. Produce detailed specs and rationale.`,
  researcher: (name) => `You are ${name}, a research analyst. Find information, verify facts, and summarise findings with clear reasoning.`,
  writer:     (name) => `You are ${name}, a professional writer. Produce compelling, clear, well-structured content.`,
  analyst:    (name) => `You are ${name}, a data analyst. Analyse information, identify patterns, and provide actionable insights.`,
};

export default function AgentModal({ agent, onSave, onClose }) {
  const isNew = !agent;
  const [tab, setTab] = useState('identity');
  const [form, setForm] = useState({
    name:          agent?.name          || '',
    role:          agent?.role          || 'developer',
    color:         agent?.color         || '#00ff88',
    avatar:        agent?.avatar        || '🤖',
    provider:      agent?.provider      || 'groq',
    api_url:       agent?.api_url       || 'https://api.groq.com/openai',
    api_key:       agent?.api_key       || '',
    model:         agent?.model         || 'llama-3.3-70b-versatile',
    system_prompt: agent?.system_prompt || '',
    skills:        parseSkills(agent?.skills),
    strength:      agent?.strength      || 1,
  });
  const [skillInput, setSkillInput] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [testing,    setTesting]    = useState(false);
  const [testResult, setTestResult] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleProvider = (id) => {
    const p = PROVIDERS.find(x => x.id === id);
    set('provider', id);
    if (p.url) set('api_url', p.url);
    if (p.model) set('model', p.model);
    setTestResult(null);
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) { set('skills', [...form.skills, s]); setSkillInput(''); }
  };
  const removeSkill = (s) => set('skills', form.skills.filter(x => x !== s));

  const applyPreset = () => {
    const preset = PRESETS[form.role];
    if (preset && form.name) set('system_prompt', preset(form.name));
    else if (preset) set('system_prompt', preset('the agent'));
  };

  const testConn = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(`/api/ai/check?provider=${form.provider}&url=${encodeURIComponent(form.api_url)}&key=${encodeURIComponent(form.api_key)}&model=${encodeURIComponent(form.model)}`);
      const d = await r.json();
      setTestResult(d);
    } catch (e) {
      setTestResult({ ok: false, error: e.message });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({ ...form, skills: JSON.stringify(form.skills) });
    setSaving(false);
  };

  const providerInfo = PROVIDERS.find(p => p.id === form.provider);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span style={{ fontSize: 22 }}>{form.avatar}</span>
            {isNew ? 'New Agent' : `Edit — ${agent.name}`}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          {[['identity','👤 Identity'],['ai','⚙️ AI Model'],['behavior','📝 Behavior']].map(([id,label]) => (
            <button key={id} className={`modal-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>

        <div className="modal-body">
          {tab === 'identity' && (
            <div>
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Agent name (e.g. CIPHER)" autoFocus />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Avatar</label>
                <div className="avatar-grid">
                  {AVATARS.map(a => (
                    <div key={a} className={`avatar-opt ${form.avatar === a ? 'active' : ''}`} onClick={() => set('avatar', a)}>{a}</div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-row">
                  {COLORS.map(c => (
                    <div key={c} className={`color-dot ${form.color === c ? 'active' : ''}`} style={{ background: c, boxShadow: form.color===c ? `0 0 10px ${c}` : 'none' }} onClick={() => set('color', c)} />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Strength (MiroFish model — multiplied in network)</label>
                <div className="strength-slider-row">
                  <input type="range" min="1" max="5" value={form.strength} onChange={e => set('strength', parseInt(e.target.value))} />
                  <div className="strength-value">{'⚡'.repeat(form.strength)}</div>
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                  Strength {form.strength}x — multiplied with other agents' strength for network power
                </div>
              </div>

              <div className="form-group">
                <label>Skills (press Enter or + to add)</label>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <input value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSkill()} placeholder="Add a skill…" />
                  <button className="btn btn-ghost btn-sm" onClick={addSkill}>+</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {form.skills.map(s => (
                    <span key={s} className="skill-chip" style={{ cursor: 'pointer' }} onClick={() => removeSkill(s)}>
                      {s} ✕
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'ai' && (
            <div>
              <div className="form-group">
                <label>Provider</label>
                <div className="provider-grid">
                  {PROVIDERS.map(p => (
                    <div key={p.id} className={`provider-btn ${form.provider === p.id ? 'active' : ''}`} onClick={() => handleProvider(p.id)}>
                      <div className="provider-btn-name">{p.name}</div>
                      <div className="provider-btn-note">{p.note}</div>
                      {p.free && <div className="provider-btn-free">FREE</div>}
                    </div>
                  ))}
                </div>
              </div>

              {providerInfo?.keyUrl && form.provider !== 'ollama' && form.provider !== 'lmstudio' && (
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 12, padding: '6px 10px', background: 'rgba(0,229,255,0.05)', borderRadius: 4, border: '1px solid rgba(0,229,255,0.1)' }}>
                  Get a free API key at: <a href={providerInfo.keyUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--neon-cyan)' }}>{providerInfo.keyUrl}</a>
                </div>
              )}

              <div className="form-group">
                <label>API URL</label>
                <input value={form.api_url} onChange={e => set('api_url', e.target.value)} placeholder="https://api.example.com/openai" />
              </div>

              <div className="form-group">
                <label>API Key {(form.provider === 'ollama' || form.provider === 'lmstudio') ? '(not needed for local)' : '(required)'}</label>
                <input value={form.api_key} onChange={e => set('api_key', e.target.value)} placeholder={form.provider === 'ollama' ? 'Not needed' : 'sk-...'} type="password" />
              </div>

              <div className="form-group">
                <label>Model</label>
                <input value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. llama-3.3-70b-versatile" />
                {form.provider === 'groq' && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {['llama-3.3-70b-versatile','llama-3.1-8b-instant','mixtral-8x7b-32768','gemma2-9b-it'].map(m => (
                      <span key={m} className="skill-chip" style={{ cursor: 'pointer', fontSize: 10 }} onClick={() => set('model', m)}>{m}</span>
                    ))}
                  </div>
                )}
                {form.provider === 'openrouter' && (
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {['meta-llama/llama-3-8b-instruct:free','mistralai/mistral-7b-instruct:free','google/gemma-2-9b-it:free'].map(m => (
                      <span key={m} className="skill-chip" style={{ cursor: 'pointer', fontSize: 10 }} onClick={() => set('model', m)}>{m.split('/')[1]}</span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <button className="btn btn-ghost btn-sm" onClick={testConn} disabled={testing}>
                  {testing ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Testing…</> : '⬡ Test Connection'}
                </button>
                {testResult && (
                  <div className={`test-result ${testResult.ok ? 'ok' : 'error'}`}>
                    {testResult.ok ? '✓ Connected' : `✕ ${testResult.error}`}
                    {testResult.models?.length > 0 && <span style={{ marginLeft: 6, color: 'var(--text-secondary)' }}>{testResult.models.length} models available</span>}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'behavior' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {Object.keys(PRESETS).map(r => (
                  <button key={r} className="btn btn-ghost btn-sm" onClick={() => { set('role', r); setTimeout(applyPreset, 0); }}>{r}</button>
                ))}
              </div>

              <div className="form-group">
                <label>System Prompt</label>
                <textarea
                  value={form.system_prompt}
                  onChange={e => set('system_prompt', e.target.value)}
                  placeholder="Describe how this agent should behave, its personality, expertise, and approach…"
                  rows={10}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
                />
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                  {form.system_prompt.length} chars · Click a role preset above to auto-fill
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name.trim()}>
            {saving ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Saving…</> : isNew ? '+ Create Agent' : '✓ Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
