import { useState, useEffect } from 'react';

const TEMPLATE = `"""
NEXUS Python Agent — Custom
Edit this template to create your own agent.
"""

AGENT_META = {
    "name":        "My Agent",
    "role":        "custom",
    "description": "What this agent does.",
    "skills":      ["skill1", "skill2"],
}

# The LLM client is available from the core package
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.llm_client import LLMClient


def run(message: str, agent: dict, history: list = None) -> str:
    """
    Main entry point called by NEXUS.
    
    Args:
        message: The input message / task
        agent:   Agent config (api_key, model, provider, etc.)
        history: Previous messages list
    
    Returns:
        Your agent's response as a string
    """
    client = LLMClient.from_agent(agent)
    
    response = client.chat([
        {"role": "system", "content": agent.get("system_prompt", "You are a helpful assistant.")},
        {"role": "user",   "content": message},
    ])
    
    return response
`;

export default function PythonView({ pythonStatus, agents }) {
  const [pyAgents,  setPyAgents]  = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [code,      setCode]      = useState(TEMPLATE);
  const [filename,  setFilename]  = useState('my_agent.py');
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState('');
  const [testMsg,   setTestMsg]   = useState('');
  const [testOut,   setTestOut]   = useState('');
  const [testing,   setTesting]   = useState(false);

  useEffect(() => {
    if (pythonStatus?.ok) loadPyAgents();
  }, [pythonStatus]);

  const loadPyAgents = () =>
    fetch('/api/python/agents').then(r => r.json()).then(d => setPyAgents(d.agents || [])).catch(() => {});

  const saveAgent = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const r = await fetch('/api/python/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ filename, code }),
      });
      const d = await r.json();
      setSaveMsg(d.ok ? '✓ Saved' : `Error: ${d.error}`);
      if (d.ok) loadPyAgents();
    } catch (e) {
      setSaveMsg(`Error: ${e.message}`);
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const testAgent = async () => {
    if (!selected || !testMsg.trim()) return;
    setTesting(true); setTestOut('');
    try {
      const agent = agents[0] || { id: 'test', name: 'test', provider: 'groq', api_url: 'https://api.groq.com/openai', api_key: '', model: 'llama-3.3-70b-versatile', system_prompt: '' };
      const r = await fetch(`/api/python/run_custom/${selected.file}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agent, message: testMsg, history: [] }),
      });
      const d = await r.json();
      setTestOut(d.ok ? d.response : `Error: ${d.error}\n${d.trace || ''}`);
    } catch (e) {
      setTestOut(`Error: ${e.message}`);
    }
    setTesting(false);
  };

  return (
    <div className="python-view">
      {/* Left panel */}
      <div className="python-left">
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
          Python Agent Status
        </div>

        <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span className={`status-dot ${pythonStatus?.ok ? 'online' : 'offline'}`} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {pythonStatus?.ok ? 'Python Server Running' : 'Python Server Offline'}
            </span>
          </div>
          {pythonStatus?.ok ? (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Python {pythonStatus.python?.split(' ')[0]}<br />
              {pythonStatus.user_agents || 0} user agents loaded
            </div>
          ) : (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              Start with:<br />
              <code style={{ color: 'var(--neon-green)', fontSize: 11 }}>python agents/runner.py</code><br />
              or use <code style={{ color: 'var(--neon-green)', fontSize: 11 }}>npm start</code>
            </div>
          )}
        </div>

        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
          User Agents ({pyAgents.length})
        </div>

        <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginBottom: 8 }} onClick={() => { setSelected(null); setCode(TEMPLATE); setFilename('my_agent.py'); }}>
          + New Agent Script
        </button>

        {pyAgents.map(a => (
          <div
            key={a.file}
            className={`python-agent-item ${selected?.file === a.file ? 'active' : ''}`}
            onClick={() => setSelected(a)}
          >
            <div className="python-agent-name" style={{ color: 'var(--neon-magenta)' }}>
              {a.name || a.file}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 4 }}>{a.file}</div>
            {a.description && <div className="python-agent-desc">{a.description}</div>}
            {a.error && <div style={{ fontSize: 10, color: '#ff4466', marginTop: 4 }}>⚠ {a.error}</div>}
          </div>
        ))}

        {/* Templates */}
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-dim)', marginTop: 12, marginBottom: 8 }}>
          Templates
        </div>
        {[
          { name: 'Researcher', file: 'researcher_agent.py' },
          { name: 'Coder', file: 'coder_agent.py' },
          { name: 'Analyst', file: 'analyst_agent.py' },
        ].map(t => (
          <div key={t.file} className="python-agent-item" onClick={() => loadTemplate(t.file, setCode, setFilename)} style={{ opacity: 0.7 }}>
            <div className="python-agent-name">📄 {t.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Template · {t.file}</div>
          </div>
        ))}
      </div>

      {/* Right: editor + test */}
      <div className="python-right">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input value={filename} onChange={e => setFilename(e.target.value)} style={{ width: 220 }} placeholder="filename.py" />
          <button className="btn btn-primary" onClick={saveAgent} disabled={saving || !pythonStatus?.ok}>
            {saving ? '…' : '💾 Save Agent'}
          </button>
          {saveMsg && <span style={{ fontSize: 11, color: saveMsg.startsWith('✓') ? 'var(--neon-green)' : '#ff4466' }}>{saveMsg}</span>}
          {!pythonStatus?.ok && <span style={{ fontSize: 10, color: '#ff4466' }}>Python server offline</span>}
        </div>

        <div className="python-editor" style={{ flex: 1 }}>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Write your Python agent code here…"
            spellCheck={false}
          />
          <div className="python-editor-toolbar">
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>🐍 Python · {code.split('\n').length} lines</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-dim)' }}>
              Agents auto-reload on save
            </span>
          </div>
        </div>

        {/* Test panel */}
        {selected && (
          <div className="panel" style={{ padding: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
              Test: {selected.name}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={testMsg} onChange={e => setTestMsg(e.target.value)} placeholder="Test message…" onKeyDown={e => e.key === 'Enter' && testAgent()} />
              <button className="btn btn-primary btn-sm" onClick={testAgent} disabled={testing || !pythonStatus?.ok}>
                {testing ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '▶ Test'}
              </button>
            </div>
            {testOut && (
              <pre style={{ fontSize: 11, maxHeight: 150, color: 'var(--neon-green)' }}>{testOut}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function loadTemplate(file, setCode, setFilename) {
  const templates = {
    'coder_agent.py': `"""
NEXUS Python Agent — Coder
Writes and reviews code.
"""

AGENT_META = {
    "name":        "Code Wizard",
    "role":        "developer",
    "description": "Writes clean, documented code in any language.",
    "skills":      ["coding", "debugging", "refactoring", "documentation"],
}

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.llm_client import LLMClient


def run(message: str, agent: dict, history: list = None) -> str:
    client = LLMClient.from_agent(agent)
    
    # First, plan the approach
    plan = client.chat([
        {"role": "system", "content": "You are a senior software engineer. Plan before coding."},
        {"role": "user",   "content": f"Plan (briefly) how to implement: {message}"},
    ])
    
    # Then write the code
    code = client.chat([
        {"role": "system", "content": agent.get("system_prompt", "You write clean, working code with inline comments.")},
        {"role": "user",   "content": f"Task: {message}\\n\\nApproach: {plan}\\n\\nWrite the complete implementation."},
    ])
    
    return code
`,
    'analyst_agent.py': `"""
NEXUS Python Agent — Data Analyst
Analyses data and produces insights.
"""

AGENT_META = {
    "name":        "Data Analyst",
    "role":        "analyst",
    "description": "Analyses data, finds patterns, and provides insights.",
    "skills":      ["analysis", "statistics", "visualisation", "reporting"],
}

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from core.llm_client import LLMClient


def run(message: str, agent: dict, history: list = None) -> str:
    client = LLMClient.from_agent(agent)
    
    response = client.chat([
        {"role": "system", "content": agent.get("system_prompt", "You are a data analyst. Provide structured analysis with clear sections: Summary, Key Findings, Recommendations.")},
        {"role": "user",   "content": message},
    ])
    
    return response
`,
  };
  setCode(templates[file] || '');
  setFilename(file);
}
