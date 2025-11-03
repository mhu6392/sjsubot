import { config } from 'dotenv';

config({ override: true });

/**
 * Quick check that your OPENAI_API_KEY can mint a realtime client secret.
 */
async function main() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY in environment.');
  }

  const model =
    process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview';

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const projectId = process.env.OPENAI_PROJECT;
  if (projectId) {
    headers['OpenAI-Project'] = projectId;
  }

  const response = await fetch(
    'https://api.openai.com/v1/realtime/client_secrets',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model,
        },
      }),
    },
  );

  const body = await response.text();

  console.log('HTTP status:', response.status, response.statusText);
  console.log('Response body:', body);

  if (!response.ok) {
    throw new Error(
      'Realtime client secret request failed. See response body above.',
    );
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
