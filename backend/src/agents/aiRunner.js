// backend/src/agents/aiRunner.js
// Supports: Ollama · Groq · OpenAI · Any OpenAI-compatible API
// Inspired by MiroFish LLMClient (MIT) — https://github.com/666ghj/MiroFish

async function callAI(agent, messages, onToken = null) {
  const provider = (agent.provider || 'ollama').toLowerCase();

  if (provider === 'ollama') {
    return callOllama(agent.api_url || 'http://localhost:11434', agent.model, messages, onToken);
  }

  // OpenAI-compatible: openai, groq, together, lmstudio, custom
  return callOpenAICompat(agent.api_url, agent.api_key, agent.model, messages, onToken);
}

// ── Ollama ────────────────────────────────────────────────────
async function callOllama(baseUrl, model, messages, onToken) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: !!onToken,
      options: { temperature: 0.6, num_predict: 2048 },
    }),
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);

  if (onToken) {
    let full = '';
    const reader = res.body.getReader();
    const dec    = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split('\n')) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          const t = j.message?.content || '';
          if (t) { full += t; onToken(t); }
        } catch {}
      }
    }
    return full;
  }
  const data = await res.json();
  return data.message?.content || data.response || '';
}

// ── OpenAI-compatible ─────────────────────────────────────────
async function callOpenAICompat(baseUrl, apiKey, model, messages, onToken) {
  const url = `${(baseUrl || 'https://api.openai.com').replace(/\/$/, '')}/v1/chat/completions`;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream:      !!onToken,
      max_tokens:  2048,
      temperature: 0.6,
    }),
  });

  if (!res.ok) throw new Error(`AI API ${res.status}: ${await res.text()}`);

  if (onToken) {
    let full = '';
    const reader = res.body.getReader();
    const dec    = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of dec.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const t = JSON.parse(data).choices?.[0]?.delta?.content || '';
          if (t) { full += t; onToken(t); }
        } catch {}
      }
    }
    return full;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Check any provider is reachable ──────────────────────────
async function checkProvider(provider, url, apiKey, model) {
  try {
    if (provider === 'ollama') {
      const res  = await fetch(`${url}/api/tags`);
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      const models = (data.models || []).map(m => m.name);
      return { ok: true, models };
    }
    // For cloud providers, do a minimal chat test
    const res = await fetch(
      `${url.replace(/\/$/, '')}/v1/models`,
      { headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {} }
    );
    return { ok: res.ok, error: res.ok ? null : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

module.exports = { callAI, checkProvider };
