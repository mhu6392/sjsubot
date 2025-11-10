import {
  RealtimeAgent,
  RealtimeSession,
  OpenAIRealtimeWebRTC,
} from '@openai/agents/realtime';

type FetchKey = () => Promise<string>;

export interface SetupCounterOptions {
  transcriptContainer?: HTMLElement;
  fetchKey?: FetchKey;
  interruptButton?: HTMLButtonElement | null;
}

const defaultFetchKey: FetchKey = async () => {
  const response = await fetch('/realtime-key', { method: 'POST' });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Failed to fetch realtime key: ${response.status} ${detail}`);
  }

  const data: { key?: string } = await response.json();

  if (!data.key) {
    throw new Error('Realtime key payload missing `key` property.');
  }

  return data.key;
};

export async function setupCounter(
  button: HTMLButtonElement,
  options: SetupCounterOptions = {},
) {
  const fetchKey = options.fetchKey ?? defaultFetchKey;
  const transcriptContainer = options.transcriptContainer ?? null;
  const interruptButton = options.interruptButton ?? null;

  const agent = new RealtimeAgent({
    name: 'SJSU BOT',
    instructions: `You are SJSU's CMPE297 Natural Language Processing course assistant for Fall 2025.
Focus on questions about course registration, logistics, prerequisites, grading, schedule, technology requirements, or project expectations.
Key facts:
- Instructor: Michael Hu. Online via Zoom, Thursdays 5:30–9:30 p.m., Sept 18 – Dec 4 (no class Nov 27).
- Office hour normally on Tuesday 7:00PM-8:00PM. If this tims is not good, please ask for a suitable time for you by email.
- Prereqs: Python (or C/C++/Java/JS), probability, linear algebra, basic neural networks.
- Grading: Homework 45%, Project Milestone Review 30%. Final project 25%; no exams.
- Weekly topics progress from NLP basics, embeddings, language models, translation/attention, transformers, LLM techniques, RAG, parsing, fine-tuning, multimodality, ending with final presentations.
If a student wants to register, confirm eligibility, simulate registration with the provided dummy registration function, then call the dummy confirmation email function and tell the student it was sent.
Never invent real registrations or send actual emails; clearly state when actions are simulated.`,
    modalities: ['audio', 'text'],
    voice: 'alloy',
  });

  const assistantAudio = document.createElement('audio');
  assistantAudio.autoplay = true;
  assistantAudio.hidden = true;
  document.body.appendChild(assistantAudio);

  const transport = new OpenAIRealtimeWebRTC({ audioElement: assistantAudio });
  const session = new RealtimeSession(agent, { transport });

  const labelEl = button.querySelector<HTMLElement>('.button-label');
  const idleLabel =
    labelEl?.dataset.idle ?? button.textContent?.trim() ?? 'Hold to Talk';
  const activeLabel = labelEl?.dataset.active ?? 'Listening...';

  const interruptLabel =
    interruptButton?.querySelector<HTMLElement>('.interrupt-label') ?? null;
  const interruptLogo =
    interruptButton?.querySelector<HTMLImageElement>('.interrupt-logo') ?? null;
  const interruptReady =
    interruptLabel?.dataset.ready ?? interruptButton?.textContent?.trim() ?? 'Interrupt';
  const interruptWaiting =
    interruptLabel?.dataset.disabled ?? 'Waiting';

  function setButtonState(isActive: boolean) {
    if (isActive) {
      button.classList.add('is-active');
      button.dataset.state = 'active';
      if (labelEl) {
        labelEl.textContent = activeLabel;
      } else {
        button.textContent = activeLabel;
      }
    } else {
      button.classList.remove('is-active');
      button.dataset.state = 'idle';
      if (labelEl) {
        labelEl.textContent = idleLabel;
      } else {
        button.textContent = idleLabel;
      }
    }
  }

  setButtonState(false);
  setInterruptReady(false);

  if (interruptLogo) {
    interruptLogo.addEventListener('error', () => {
      interruptLogo.style.display = 'none';
      interruptLogo.setAttribute('aria-hidden', 'true');
      if (interruptLabel) {
        interruptLabel.style.display = '';
        interruptLabel.setAttribute('aria-hidden', 'false');
      }
    });
  }

  function setInterruptReady(isReady: boolean) {
    if (!interruptButton) {
      return;
    }
    interruptButton.disabled = !isReady;
    interruptButton.classList.toggle('is-ready', isReady);
    if (interruptLabel) {
      interruptLabel.textContent = isReady ? interruptReady : interruptWaiting;
      interruptLabel.setAttribute('aria-hidden', (!isReady).toString());
      if (!isReady && interruptLogo && interruptLogo.style.display !== 'none') {
        interruptLabel.style.display = 'none';
      } else {
        interruptLabel.style.display = '';
      }
    } else {
      interruptButton.textContent = isReady ? interruptReady : interruptWaiting;
    }
    if (interruptLogo) {
      interruptLogo.style.display = isReady ? 'none' : '';
      interruptLogo.setAttribute('aria-hidden', isReady ? 'true' : 'false');
    }
  }

  session.on('history_added', item => {
    if (!transcriptContainer) {
      return;
    }
    if (
      item.type !== 'message' ||
      item.role !== 'assistant' ||
      item.status !== 'completed'
    ) {
      return;
    }

    const textSegments: string[] = [];
    item.content.forEach(content => {
      if (content.type === 'output_text') {
        textSegments.push(content.text);
      } else if (content.type === 'output_audio' && content.transcript) {
        textSegments.push(content.transcript);
      }
    });

    if (textSegments.length === 0) {
      return;
    }

    const paragraph = document.createElement('p');
    paragraph.textContent = textSegments.join('\n');
    transcriptContainer.append(paragraph);
  });

  session.on('audio_start', () => {
    setInterruptReady(true);
  });

  session.on('audio_stopped', () => {
    setInterruptReady(false);
  });

  session.on('audio_interrupted', () => {
    setInterruptReady(false);
  });

  async function connect() {
    button.disabled = true;
    try {
      const apiKey = await fetchKey();
      await session.connect({ apiKey });
      session.mute(true); // start muted until the user holds the button
      button.disabled = false;
      setButtonState(false);
      setInterruptReady(false);
      console.info('Realtime session connected.');
    } catch (error) {
      console.error('Failed to connect realtime session.', error);
      button.disabled = false;
      setButtonState(false);
    }
  }

  function stopStreaming() {
    try {
      session.mute(true);
    } catch (error) {
      console.error('Unable to mute realtime session.', error);
    }
    setButtonState(false);
  }

  function startStreaming() {
    setButtonState(true);
    try {
      session.mute(false);
    } catch (error) {
      console.error('Unable to unmute realtime session.', error);
      setButtonState(false);
    }
  }

  const pressEvents = ['mousedown', 'touchstart'];
  const releaseEvents = ['mouseup', 'mouseleave', 'touchend', 'touchcancel'];

  pressEvents.forEach(eventName => {
    button.addEventListener(eventName, event => {
      event.preventDefault();
      startStreaming();
    });
  });

  releaseEvents.forEach(eventName => {
    button.addEventListener(eventName, event => {
      event.preventDefault();
      stopStreaming();
    });
  });

  if (interruptButton) {
    interruptButton.addEventListener('click', event => {
      event.preventDefault();
      try {
        session.interrupt();
      } catch (error) {
        console.error('Unable to interrupt assistant audio.', error);
      } finally {
        setInterruptReady(false);
      }
    });
  }

  await connect();
}
