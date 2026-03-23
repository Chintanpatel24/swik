// tools/webSearch.js — Free DuckDuckGo search, no API key needed
async function webSearch(query, maxResults = 5) {
  try {
    // DuckDuckGo Instant Answer API
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
    const res  = await fetch(url);
    const data = await res.json();

    const results = [];

    // Abstract (main answer)
    if (data.Abstract) {
      results.push({
        title:   data.Heading || query,
        snippet: data.Abstract,
        url:     data.AbstractURL || '',
        source:  data.AbstractSource || 'DuckDuckGo'
      });
    }

    // Related topics
    for (const topic of (data.RelatedTopics || []).slice(0, maxResults - 1)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title:   topic.Text.split(' - ')[0] || topic.Text.slice(0, 60),
          snippet: topic.Text,
          url:     topic.FirstURL,
          source:  'DuckDuckGo'
        });
      }
    }

    // If DDG returned nothing useful, fall back to HTML scrape of results
    if (results.length === 0) {
      const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const htmlRes = await fetch(htmlUrl, { headers: { 'User-Agent': 'AgentOffice/1.0' } });
      const html    = await htmlRes.text();

      // Parse result snippets from the HTML
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
          url:     titles[i]?.url || '',
          source:  'DuckDuckGo'
        });
        i++;
      }
    }

    return {
      ok:      true,
      query,
      results: results.slice(0, maxResults)
    };
  } catch (e) {
    return { ok: false, query, error: e.message, results: [] };
  }
}

module.exports = { webSearch };
