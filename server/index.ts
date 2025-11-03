import { config } from 'dotenv';

config({ override: true });
import express from 'express';

const app = express();
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL_NAME = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview';

if (!OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY is not defined. /realtime-key will return 500 errors.');
}

app.post('/realtime-key', async (_req, res) => {
  if (!OPENAI_API_KEY) {
    res.status(500).json({ error: 'Server misconfiguration: missing OPENAI_API_KEY.' });
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: MODEL_NAME,
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      res.status(response.status).json({ error: 'Failed to create realtime client secret.', detail });
      return;
    }

    const data = await response.json();
    res.json({ key: data.value });
  } catch (error) {
    console.error('Failed to create realtime client secret:', error);
    res.status(500).json({ error: 'Unexpected error requesting realtime client secret.' });
  }
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Realtime demo server listening on http://localhost:${port}`);
});
