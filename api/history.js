import { createClient } from 'redis';

const HISTORY_KEY = 'linkedin_converter_history';
const MAX_ENTRIES = 100;

let _client = null;
async function getClient() {
  if (!_client) {
    _client = createClient({ url: process.env.REDIS_URL });
    _client.on('error', (err) => console.error('Redis error:', err));
    await _client.connect();
  }
  return _client;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const redis = await getClient();

    if (req.method === 'GET') {
      const raw = await redis.get(HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];
      return res.status(200).json({ history });
    }

    if (req.method === 'POST') {
      const { preview, tone, post } = req.body;
      if (!preview || !tone || !post) return res.status(400).json({ error: 'Missing required fields.' });

      const raw = await redis.get(HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];
      const newEntry = {
        id: Date.now(),
        preview,
        tone,
        post,
        date: new Date().toLocaleDateString('en-US', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }),
      };

      const updated = [newEntry, ...history].slice(0, MAX_ENTRIES);
      await redis.set(HISTORY_KEY, JSON.stringify(updated));
      return res.status(200).json({ entry: newEntry });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing id.' });

      const raw = await redis.get(HISTORY_KEY);
      const history = raw ? JSON.parse(raw) : [];
      const updated = history.filter(e => e.id !== id);
      await redis.set(HISTORY_KEY, JSON.stringify(updated));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed.' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error: ' + err.message });
  }
}
