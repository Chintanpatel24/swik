// tools/webSearch.js — Free web search, no API key required
// Uses DuckDuckGo Instant Answer API by default

async function webSearch(query, maxResults = 5) {
  // Try SerpAPI if configured (richer results)
  if (process.env.SERPAPI_KEY) {
    return serpApiSearch(query, maxResults);
  }
  return duckDuckGoSearch(query, maxResults);
}

async function duckDuckGoSearch(query, maxResults) {
  try {
    const url  = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const res  = await fetch(url);
    const data = await res.json();

    const results = [];

    if (data.Abstract) {
      results.push({
        title:   data.Heading || query,
        snippet: data.Abstract,
        url:     data.AbstractURL || '',
        source:  data.AbstractSource || 'DuckDuckGo',
      });
    }

    for (const t of (data.RelatedTopics || []).slice(0, maxResults)) {
      if (t.Text && t.FirstURL) {
        results.push({
          title:   t.Text.split(' - ')[0].slice(0, 80),
          snippet: t.Text,
          url:     t.FirstURL,
          source:  'DuckDuckGo',
        });
      }
    }

    // Fallback: scrape HTML results
    if (results.length === 0) {
      const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const htmlRes = await fetch(htmlUrl, { headers: { 'User-Agent': 'SWIK-Agent/1.0' } });
      const html    = await htmlRes.text();

      const snippetRe = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
      const titleRe   = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;

      const titles = []; let tm;
      while ((tm = titleRe.exec(html)) !== null && titles.length < maxResults) {
        titles.push({ url: tm[1], title: tm[2].replace(/<[^>]+>/g, '').trim() });
      }
      let sm; let i = 0;
      while ((sm = snippetRe.exec(html)) !== null && i < titles.length) {
        results.push({
          title:   titles[i]?.title || query,
          snippet: sm[1].replace(/<[^>]+>/g, '').trim(),
          url:     titles[i]?.url  || '',
          source:  'DuckDuckGo',
        });
        i++;
      }
    }

    return { ok: true, query, results: results.slice(0, maxResults) };
  } catch (e) {
    return { ok: false, query, error: e.message, results: [] };
  }
}

async function serpApiSearch(query, maxResults) {
  try {
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}&num=${maxResults}`;
    const res  = await fetch(url);
    const data = await res.json();
    const results = (data.organic_results || []).slice(0, maxResults).map(r => ({
      title:   r.title,
      snippet: r.snippet || '',
      url:     r.link,
      source:  'SerpAPI',
    }));
    return { ok: true, query, results };
  } catch (e) {
    return duckDuckGoSearch(query, maxResults); // Fallback
  }
}

module.exports = { webSearch };
