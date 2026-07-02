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

  // Extract all match cards
  const cardRe = /<div class="match-card"[^>]*data-category="([^"]+)"[^>]*onclick="location\.href='([^']+)'"[\s\S]*?<h3 class="match-title">([\s\S]*?)<\/h3>[\s\S]*?(<span class="live-badge">[\s\S]*?)?<\/div>\s*<\/div>/g;

  // Simpler approach: extract onclick URLs + titles + categories line by line
  const matches = [];
  const onclickRe = /data-category="([^"]+)"[^>]*onclick="location\.href='([^']+)'"/g;
  const titleRe = /<h3 class="match-title">([\s\S]*?)<\/h3>/g;
  const liveRe = /live-badge/g;

  // Pull all cards as blocks first
  const blockRe = /<div class="match-card"([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;
  let block;
  while ((block = blockRe.exec(html)) !== null) {
    const inner = block[0];

    const catMatch = /data-category="([^"]+)"/.exec(inner);
    const urlMatch = /onclick="location\.href='([^']+)'"/.exec(inner);
    const titleMatch = /<h3 class="match-title">([\s\S]*?)<\/h3>/.exec(inner);
    const isLive = /live-badge/.test(inner);
    const sourcesMatch = /([\d]+) sources/.exec(inner);

    if (!urlMatch || !titleMatch) continue;

    matches.push({
      category: catMatch ? catMatch[1] : 'other',
      slug: urlMatch[1].replace('/watch/kobra/', ''),
      url: urlMatch[1],
      title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
      live: isLive,
      sources: sourcesMatch ? parseInt(sourcesMatch[1]) : 1,
    });
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
      'Cache-Control': 'public, max-age=60', // cache 1 min
    },
    body: JSON.stringify({ matches }),
  };
};
