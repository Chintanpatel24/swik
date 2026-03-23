import { useState } from 'react';

const ROLES    = ['boss','developer','designer','researcher','writer','analyst','devops','qa','custom'];
const FLOORS   = [{ value: 1, label: 'Floor 1 — Ground (Dev / Research)' },
                  { value: 2, label: 'Floor 2 — Mid (Design / Strategy)' },
                  { value: 3, label: 'Floor 3 — Penthouse (Leadership)' }];
const COLORS   = ['#4f8ef7','#f7c94f','#f74faa','#4ff7c4','#c44ff7','#f74f4f','#4ff7a4','#f7944f'];
const PROVIDERS= [
  { value: 'ollama',  label: 'Ollama — Local · Free',        url: 'http://localhost:11434', model: 'llama3.2' },
  { value: 'groq',    label: 'Groq — Cloud · Free Tier',     url: 'https://api.groq.com/openai', model: 'llama-3.3-70b-versatile' },
  { value: 'openai',  label: 'OpenAI — Cloud · Paid',        url: 'https://api.openai.com', model: 'gpt-4o-mini' },
  { value: 'lmstudio',label: 'LM Studio — Local · Free',     url: 'http://localhost:1234',  model: 'local-model' },
  { value: 'custom',  label: 'Custom OpenAI-Compatible',      url: '',                       model: '' },
];

function parseSkills(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

export default function AgentEditor({ agent, onSave, onDelete, onClose }) {
  const isNew = !agent?.id;
  const [tab, setTab] = useState('identity');
  const [form, setForm] = useState({
    name:          agent?.name          || '',
    role:          agent?.role          || 'developer',
    color:         agent?.color         || '#4f8ef7',
    floor:         agent?.floor         || 1,
    desk_index:    agent?.desk_index    || 0,
    provider:      agent?.provider      || 'ollama',
    api_url:       agent?.api_url       || 'http://localhost:11434',
    api_key:       agent?.api_key       || '',
    model:         agent?.model         || 'llama3.2',
    system_prompt: agent?.system_prompt || '',
    skills:        parseSkills(agent?.skills),
  });
  const [skillInput, setSkillInput] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) { set('skills', [...form.skills, s]); setSkillInput(''); }
  };

  const handleProvider = (val) => {
    const p = PROVIDERS.find(x => x.value === val);
    set('provider', val);
    set('api_url', p?.url || '');
    set('model', p?.model || '');
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await onSave({ ...form });
    setSaving(false);
    onClose();
  };

  const PRESETS = [
    ['Boss',       `You are ${form.name||'the Boss'} on Floor 3 (Penthouse). You lead the HQ, break down tasks, delegate to the right agents, and synthesise final results. Be decisive.`],
    ['Developer',  `You are ${form.name||'a developer'} on Floor 1. You write clean, working code. You document everything and think before you code.`],
    ['Designer',   `You are ${form.name||'a designer'} on Floor 2. You create beautiful, accessible UIs. You produce detailed specs, CSS, and design rationale.`],
    ['Researcher', `You are ${form.name||'a researcher'} on Floor 2. You search for information, verify facts, and summarise findings clearly with sources.`],
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-color-dot" style={{ background: form.color }}/>
            <span>{isNew ? '+ NEW AGENT' : `EDIT — ${agent.name}`}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          {['identity','ai','prompt'].map(t => (
            <button key={t} className={`modal-tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
              {t==='identity'?'👤 IDENTITY':t==='ai'?'⬡ AI MODEL':'📝 BEHAVIOUR'}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {/* ── IDENTITY ── */}
          {tab === 'identity' && (
            <div className="modal-two-col">
              <div className="modal-col">
                <label className="f-label">NAME</label>
                <input className="f-input" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Rex, Nova, Pixel…" autoFocus maxLength={30}/>

                <label className="f-label">ROLE</label>
                <select className="f-input" value={form.role} onChange={e=>set('role',e.target.value)}>
                  {ROLES.map(r=><option key={r}>{r}</option>)}
                </select>

                <label className="f-label">FLOOR</label>
                <select className="f-input" value={form.floor} onChange={e=>set('floor',parseInt(e.target.value))}>
                  {FLOORS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                </select>

                <label className="f-label">DESK POSITION <span className="f-sub">(0–3)</span></label>
                <input className="f-input" type="number" min={0} max={3} value={form.desk_index} onChange={e=>set('desk_index',parseInt(e.target.value)||0)}/>

                <label className="f-label">COLOUR</label>
                <div className="color-row">
                  {COLORS.map(c=>(
                    <button key={c} className={`color-sw ${form.color===c?'active':''}`} style={{background:c}} onClick={()=>set('color',c)}/>
                  ))}
                  <label className="color-custom">
                    <input type="color" value={form.color} onChange={e=>set('color',e.target.value)}/>
                    <span>⊕</span>
                  </label>
                </div>
              </div>

              <div className="modal-col">
                <label className="f-label">SKILLS</label>
                <div className="skills-chips">
                  {form.skills.map(s=>(
                    <span key={s} className="skill-chip">
                      {s}
                      <button onClick={()=>set('skills',form.skills.filter(x=>x!==s))}>×</button>
                    </span>
                  ))}
                </div>
                <div className="skill-add">
                  <input className="f-input" value={skillInput} onChange={e=>setSkillInput(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&addSkill()} placeholder="Python, React, DevOps…" maxLength={40}/>
                  <button className="btn-ghost" onClick={addSkill}>ADD</button>
                </div>
              </div>
            </div>
          )}

          {/* ── AI MODEL ── */}
          {tab === 'ai' && (
            <div className="modal-two-col">
              <div className="modal-col">
                <label className="f-label">AI PROVIDER</label>
                <select className="f-input" value={form.provider} onChange={e=>handleProvider(e.target.value)}>
                  {PROVIDERS.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
                </select>

                <label className="f-label">API URL</label>
                <input className="f-input" value={form.api_url} onChange={e=>set('api_url',e.target.value)} placeholder="http://localhost:11434"/>

                <label className="f-label">API KEY <span className="f-sub">(blank for Ollama/LM Studio)</span></label>
                <input className="f-input" type="password" value={form.api_key} onChange={e=>set('api_key',e.target.value)} placeholder="sk-…"/>
              </div>

              <div className="modal-col">
                <label className="f-label">MODEL NAME</label>
                <input className="f-input" value={form.model} onChange={e=>set('model',e.target.value)} placeholder="llama3.2"/>

                <div className="ai-info-box">
                  {form.provider==='ollama'   && <p>Free & local. Install at <b>ollama.com</b> then: <code>ollama pull {form.model||'llama3.2'}</code></p>}
                  {form.provider==='groq'     && <p>Free tier available. Get your key at <b>console.groq.com</b>. Extremely fast inference.</p>}
                  {form.provider==='openai'   && <p>Paid API. Get your key at <b>platform.openai.com</b>.</p>}
                  {form.provider==='lmstudio' && <p>Free & local. Open LM Studio, load a model, and enable the local server on port 1234.</p>}
                  {form.provider==='custom'   && <p>Any OpenAI-compatible API. Enter the base URL and key above.</p>}
                </div>
              </div>
            </div>
          )}

          {/* ── PROMPT ── */}
          {tab === 'prompt' && (
            <div className="modal-single-col">
              <label className="f-label">SYSTEM PROMPT</label>
              <textarea className="f-input f-textarea" value={form.system_prompt}
                onChange={e=>set('system_prompt',e.target.value)}
                placeholder={`You are ${form.name||'an agent'}. Your role is ${form.role}…`}/>
              <div className="presets-row">
                <span className="f-label">QUICK PRESETS</span>
                <div className="preset-chips">
                  {PRESETS.map(([label, text])=>(
                    <button key={label} className="preset-chip" onClick={()=>set('system_prompt',text)}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {!isNew && (
            <button className="btn-danger" onClick={()=>{ if(confirm(`Delete ${agent.name}?`)){onDelete(agent.id);onClose();} }}>
              DELETE
            </button>
          )}
          <div style={{flex:1}}/>
          <button className="btn-ghost" onClick={onClose}>CANCEL</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving||!form.name.trim()}>
            {saving ? 'SAVING…' : isNew ? '+ CREATE' : 'SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}
