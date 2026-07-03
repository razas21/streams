exports.handler = async function () {
  try {
    const res = await fetch('http://ntvs.cx/api/get-matches?server=kobra&type=both', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0',
        'Accept': '*/*',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Referer': 'http://ntvs.cx/matches/kobra',
        'Cookie': 'user_timezone=America/Toronto; _ga_984LDVDKB3=GS2.1.s1783116375$o4$g1$t1783116668$j60$l0$h0; _ga=GA1.1.442695646.1782955241; _ga_V6VPSNZ6WJ=GS2.1.s1783116375$o4$g1$t1783116668$j60$l0$h0; _ga_96QWJVWK1E=GS2.1.s1783116375$o4$g1$t1783116668$j60$l0$h0; PHPSESSID=8veuikt5n0safnj6qqe3ctvks4'
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();
    
    // Filter for football category, then format the API response[cite: 1, 2]
    const matches = (data.all || [])
      .filter(m => m.category === 'football')
      .map(m => ({
        slug: m.id,
        title: m.title,
        category: m.category,
        live: m.live,
        sources: m.sources ? m.sources.length : 0 
      }));

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      },
      body: JSON.stringify({ matches })
    };
  } catch (e) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: e.message, matches: [] })
    };
  }
};