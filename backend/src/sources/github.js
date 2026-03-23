export async function fetchGitHub() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const res = await fetch(
    `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=10`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'TechScan-Agent/1.0'
      }
    }
  );

  if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);

  const data = await res.json();
  const repos = (data.items || []).slice(0, 10);

  return repos.map(r => ({
    source: 'GitHub',
    title: r.full_name,
    url: r.html_url,
    description: r.description || '',
    stars: r.stargazers_count,
    forks: r.forks_count,
    language: r.language || 'Unknown',
    topics: (r.topics || []).slice(0, 5),
    owner: r.owner?.login || '',
    openIssues: r.open_issues_count || 0
  }));
}
