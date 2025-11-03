# SJSU NLP Course Realtime Assistant Demo

This project shows how to set up a browser voice client using `@openai/agents/realtime`. The browser requests a short-lived realtime key from a lightweight Express server. Once connected, holding the push-to-talk button streams your microphone to the realtime model and plays back its audio response. The CMPE297 syllabus information is included as prompt. Tools could be leveraged further. 

## Prerequisites

- Node.js 18+
- An OpenAI API key with access to realtime models. The API key could be stored in the .env file under the root directory as we did in the course.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the project root containing your standard OpenAI API key:
   ```bash
   OPENAI_API_KEY=sk-...
   # Override the realtime model
   # OPENAI_REALTIME_MODEL=gpt-realtime
   ```
3. Start the server that mints ephemeral realtime keys:
   ```bash
   npm run server
   ```
4. In a separate terminal, start the Vite dev server:
   ```bash
   npm run dev
   ```
5. Visit `http://localhost:5173`, allow microphone access, and hold the **Hold to Talk** button to speak.

## Key Files

- `src/counter.ts` – client-side realtime session wiring.
- `src/main.ts` – boots the client code on page load.
- `server/index.ts` – Express route that requests an ephemeral realtime key using your long-lived API key.

## Notes

- Never expose your real `OPENAI_API_KEY` to the browser; always request an ephemeral key from your server.
- The client uses push-to-talk, but you can enable continuous voice activity detection by swapping the call to `session.conversation.start`.

