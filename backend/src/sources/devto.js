const TAGS = ['opensource', 'programming', 'webdev', 'ai', 'devops'];

export async function fetchDevTo() {
  const results = await Promise.allSettled(
    TAGS.map(tag =>
      fetch(`https://dev.to/api/articles?tag=${tag}&top=3&per_page=3`)
        .then(r => r.json())
    )
  );

  const allArticles = [];
  const seen = new Set();

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const article of result.value) {
      if (!seen.has(article.id)) {
        seen.add(article.id);
        allArticles.push({
          source: 'Dev.to',
          title: article.title,
          url: article.url,
          author: article.user?.name || 'unknown',
          tags: article.tag_list || [],
          reactions: article.positive_reactions_count || 0,
          readingTime: article.reading_time_minutes || 0,
          publishedAt: article.published_at
        });
      }
    }
  }

  return allArticles.sort((a, b) => b.reactions - a.reactions).slice(0, 12);
}
