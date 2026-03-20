const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, system } = req.body;
  if (!messages || !system) {
    return res.status(400).json({ error: 'Missing messages or system prompt' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await sleep(attempt * 2000);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 400,
          system: system,
          messages: messages
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 529 || response.status === 503 || response.status === 500) {
          continue;
        }
        return res.status(response.status).json({ error: JSON.stringify(data) });
      }

      const text = (data.content || []).map(b => b.text || '').join('');
      return res.status(200).json({ text });

    } catch (err) {
      if (attempt < 2) continue;
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(503).json({ error: 'Service temporarily busy. Please try again in a moment.' });
};
