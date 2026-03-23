// ai.js — Powered by Ollama (100% free, runs locally)
import { config } from './config.js';

const { url: OLLAMA_URL, model: MODEL } = config.ollama;

export async function checkOllamaReady() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) return { ok: false, error: `Ollama returned ${res.status}` };
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    const hasModel = models.some(m => m.startsWith(MODEL.split(':')[0]));
    if (!hasModel) {
      return {
        ok: false,
        error: `Model "${MODEL}" not found. Run: ollama pull ${MODEL}\nAvailable: ${models.join(', ') || 'none'}`
      };
    }
    return { ok: true, models };
  } catch (e) {
    return { ok: false, error: `Cannot reach Ollama at ${OLLAMA_URL}. Is it running? (ollama serve)` };
  }
}

export async function generateSummary(hn, github, devto, reddit, interests = []) {
  const sections = [];

  if (hn.length)     sections.push(`## HACKER NEWS TOP STORIES\n` + hn.map(s => `- ${s.title} | score:${s.score} comments:${s.comments}`).join('\n'));
  if (github.length) sections.push(`## GITHUB TRENDING REPOS (this week)\n` + github.map(r => `- ${r.title} [${r.language}] ⭐${r.stars} — ${r.description}${r.topics.length ? ` | topics: ${r.topics.join(', ')}` : ''}`).join('\n'));
  if (devto.length)  sections.push(`## DEV.TO ARTICLES\n` + devto.map(a => `- "${a.title}" by ${a.author} (❤️${a.reactions}) — tags: ${a.tags.join(', ')}`).join('\n'));
  if (reddit.length) sections.push(`## REDDIT HOT POSTS\n` + reddit.map(p => `- [r/${p.subreddit}] ${p.title} (⬆️${p.score} 💬${p.comments})`).join('\n'));

  const interestClause = interests.length > 0
    ? `\nThe user is specifically interested in: ${interests.join(', ')}.\nPrioritise and highlight content related to these topics. If a section has nothing relevant to these interests, still include it but be brief.`
    : '';

  const prompt = `You are a senior tech analyst writing a private intelligence digest.${interestClause}
Analyse the following raw tech content and produce a structured summary using EXACTLY these section headers:

### 🚀 OPEN SOURCE RELEASES & PROJECTS
Key new projects, launches, or trending repos. What do they do? Why do they matter?

### 💬 COMMUNITY CONVERSATIONS
What are engineers and creators actively debating or excited about?

### 📈 EMERGING TRENDS THIS CYCLE
3-5 tech trends or patterns emerging right now.

### ⚡ NUMBERS WORTH NOTING
Interesting metrics: star counts, scores, reaction counts.

### 🔗 TOP LINKS TO EXPLORE
The 5 most worthwhile URLs. Format each as: Title → URL

Rules:
- Be specific, mention real project names and real numbers
- Use **bold** for project names, backticks for tech terms, *italics* for emphasis
- No filler, no preamble — start directly with the first section header

--- RAW DATA ---
${sections.join('\n\n')}`;

  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.4, num_predict: 1400, top_p: 0.9 }
    })
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`Ollama: ${data.error}`);
  if (!data.response) throw new Error('Ollama returned empty response');
  return data.response.trim();
}
