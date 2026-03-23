const HN_BASE = 'https://hacker-news.firebaseio.com/v0';

export async function fetchHackerNews() {
  const res = await fetch(`${HN_BASE}/topstories.json`);
  if (!res.ok) throw new Error(`HN API returned ${res.status}`);

  const ids = await res.json();
  const top15 = ids.slice(0, 15);

  const stories = await Promise.allSettled(
    top15.map(id =>
      fetch(`${HN_BASE}/item/${id}.json`).then(r => r.json())
    )
  );

  return stories
    .filter(s => s.status === 'fulfilled' && s.value?.title)
    .map(s => s.value)
    .map(s => ({
      source: 'HackerNews',
      title: s.title,
      url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
      score: s.score || 0,
      comments: s.descendants || 0,
      by: s.by || 'unknown',
      type: s.type || 'story'
    }));
}
