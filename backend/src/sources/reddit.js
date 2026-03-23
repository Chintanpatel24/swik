const SUBREDDITS = ['programming', 'opensource', 'MachineLearning', 'webdev'];

export async function fetchReddit() {
  const results = await Promise.allSettled(
    SUBREDDITS.map(sub =>
      fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=5`, {
        headers: { 'User-Agent': 'TechScan-Agent/1.0' }
      }).then(r => r.json())
    )
  );

  const allPosts = [];
  const seen = new Set();

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status !== 'fulfilled') continue;
    const posts = result.value?.data?.children || [];
    for (const { data: p } of posts) {
      if (!seen.has(p.id) && !p.stickied) {
        seen.add(p.id);
        allPosts.push({
          source: `Reddit/r/${SUBREDDITS[i]}`,
          title: p.title,
          url: `https://reddit.com${p.permalink}`,
          score: p.score || 0,
          comments: p.num_comments || 0,
          subreddit: SUBREDDITS[i],
          flair: p.link_flair_text || null
        });
      }
    }
  }

  return allPosts.sort((a, b) => b.score - a.score).slice(0, 12);
}
