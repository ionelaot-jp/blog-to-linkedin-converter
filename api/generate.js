export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, tone } = req.body;
  if (!text || !tone) return res.status(400).json({ error: 'Missing required params: text and tone.' });
  if (text.length > 50000) return res.status(400).json({ error: 'Article text is too long (max 50,000 characters).' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on the server.' });

  const prompt = `You are a LinkedIn content expert.
Your task is to write a LinkedIn article post based on the blog article text provided below.

TONE: ${tone}

MANDATORY STRUCTURE:
- Strong opening hook (first line that grabs attention: a question, surprising statement, or compelling fact)
- Body with short paragraphs in LinkedIn style (max 2-3 lines per paragraph, blank lines between paragraphs)
- CTA at the end (clear call to action: ask for opinions, invite to discuss, pose a question)

RULES:
- Maximum 1300 characters total
- No hashtags
- No excessive emojis (maximum 2-3 if they fit naturally)
- Write ONLY the post text, no titles or explanations before or after
- The result must be ready to copy and paste directly into LinkedIn

BLOG ARTICLE TEXT:
---
${text}
---`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json();
      return res.status(anthropicRes.status).json({ error: err.error?.message || 'Anthropic API error.' });
    }

    // Stream SSE back to the client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
