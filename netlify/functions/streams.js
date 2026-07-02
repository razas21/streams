exports.handler = async function (event) {
  const slug = event.queryStringParameters?.slug;
  if (!slug) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing slug" }) };
  }

  const url = `https://ntvs.cx/watch/kobra/${slug}`;

  let html;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }

  // Extract options from #sourceSelect
  const selectMatch = html.match(
    /id="sourceSelect"[^>]*>([\s\S]*?)<\/select>/i
  );
  if (!selectMatch) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: "No stream select found on page" }),
    };
  }

  const optionRe = /<option\s+value="([^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/option>/gi;
  const streams = [];
  let m;
  while ((m = optionRe.exec(selectMatch[1])) !== null) {
    const value = m[1].trim();
    const label = m[2].replace(/\s+/g, " ").trim();
    // Build full embed URL
    const src = value.startsWith("http")
      ? value
      : `https://ntvs.cx${value}`;
    streams.push({ label, src });
  }

  // Extract match title from <h1 class="watch-title">
  const titleMatch = html.match(/class="watch-title"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
    : slug;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ title, streams }),
  };
};
