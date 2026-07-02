exports.handler = async function () {
  let html;
  try {
    const res = await fetch('https://ntvs.cx/matches/kobra', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        Accept: 'text/html',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }

  const matches = [];

  // Split into lines and scan sequentially — much more reliable than block regex
  const lines = html.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Look for the match-card div (skip skeleton-card)
    if (line.includes('class="match-card"') && !line.includes('skeleton-card') && line.includes('data-category="football"')) {
      const catMatch   = /data-category="([^"]+)"/.exec(line);
      const urlMatch   = /onclick="location\.href='([^']+)'"/.exec(line);

      if (catMatch && urlMatch) {
        const category = catMatch[1];
        const url      = urlMatch[1];
        const slug     = url.replace('/watch/kobra/', '');

        // Scan next ~15 lines for title, live badge, sources
        let title = '';
        let isLive = false;
        let sources = 1;

        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          const l = lines[j];
          if (l.includes('match-title')) {
            const t = /<h3[^>]*>([^<]+)<\/h3>/.exec(l);
            if (t) title = t[1].trim();
          }
          if (l.includes('live-badge')) isLive = true;
          const src = /(\d+) sources/.exec(l);
          if (src) sources = parseInt(src[1]);
          // Stop when we hit the closing tag of the card
          if (l.includes('</div>') && j > i + 3) break;
        }

        if (title) {
          matches.push({ category, slug, url, title, live: isLive, sources });
        }
      }
    }
    i++;
  }

  // Sort: live first, then by category
  matches.sort((a, b) => {
    if (a.live && !b.live) return -1;
    if (!a.live && b.live) return 1;
    return a.category.localeCompare(b.category);
  });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60',
    },
    body: JSON.stringify({ matches }),
  };
};
