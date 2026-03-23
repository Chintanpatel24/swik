// agents/aiRunner.js — Supports Ollama + any OpenAI-compatible API
async function callAI(agent, messages, onToken = null) {
  const { api_type, api_url, api_key, model } = agent;

  if (api_type === 'ollama') {
    return callOllama(api_url, model, messages, onToken);
  }
  // openai-compatible covers: OpenAI, LM Studio, llama.cpp server, Groq, Together, etc.
  return callOpenAICompat(api_url, api_key, model, messages, onToken);
}

// ── OLLAMA ─────────────────────────────────────────────────────────────────
async function callOllama(baseUrl, model, messages, onToken) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: !!onToken,
      options: { temperature: 0.6, num_predict: 2000 }
    })
  });

  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);

  if (onToken) {
    // Stream tokens
    let full = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const token = json.message?.content || '';
          if (token) { full += token; onToken(token); }
        } catch {}
      }
    }
    return full;
  }

  const data = await res.json();
  return data.message?.content || data.response || '';
}

// ── OPENAI-COMPATIBLE (LM Studio, llama.cpp, Groq, Together, OpenAI) ──────
async function callOpenAICompat(baseUrl, apiKey, model, messages, onToken) {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: !!onToken,
      max_tokens: 2000,
      temperature: 0.6
    })
  });

  if (!res.ok) throw new Error(`AI API ${res.status}: ${await res.text()}`);

  if (onToken) {
    let full = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const token = json.choices?.[0]?.delta?.content || '';
          if (token) { full += token; onToken(token); }
        } catch {}
      }
    }
    return full;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = { callAI };
