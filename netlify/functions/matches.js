exports.handler = async function () {
  let html;
  try {
    const res = await fetch('https://ntvs.cx/matches/kobra', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message, matches: [] })
    };
  }

  // Debug metrics
  const hasMatchCard = html.includes('match-card');
  const hasFootball  = html.includes('data-category="football"');
  const htmlSnippet  = html.substring(0, 500);
  const matchCardIdx = html.indexOf('match-card');
  const snippet2     = matchCardIdx > -1 ? html.substring(matchCardIdx, matchCardIdx + 300) : 'NOT FOUND';

  const matches = [];

  // Global regex pattern to extract each match card container independently from the raw HTML text
  const cardRegex = /<div\s+[^>]*class="[^"]*match-card[^"]*"[^>]*data-category="football"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;

  let matchBlock;
  while ((matchBlock = cardRegex.exec(html)) !== null) {
    const cardHtml = matchBlock[0];

    // Skip placeholder skeleton blocks
    if (cardHtml.includes('skeleton-card')) continue;

    // Extract navigation URL and slug
    const urlMatch = /onclick="location\.href='([^']+)'"/.exec(cardHtml);
    if (!urlMatch) continue;
    
    const url = urlMatch[1];
    const slug = url.replace('/watch/kobra/', '');
    const category = "football";

    // Extract Title
    let title = '';
    const titleMatch = /<h3[^>]*>([^<]+)<\/h3>/.exec(cardHtml);
    if (titleMatch) title = titleMatch[1].trim();

    // Check Live Status
    const isLive = cardHtml.includes('live-badge');

    // Extract Count of Stream Sources Available
    let sources = 1;
    const srcMatch = /(\d+)\s+sources/.exec(cardHtml);
    if (srcMatch) sources = parseInt(srcMatch[1], 10);

    if (title) {
      matches.push({ category, slug, url, title, live: isLive, sources });
    }
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      matches,
      debug: {
        htmlLength: html.length,
        hasMatchCard,
        hasFootball,
        htmlSnippet,
        firstMatchCardSnippet: snippet2,
        totalExtracted: matches.length
      }
    }),
  };
};
