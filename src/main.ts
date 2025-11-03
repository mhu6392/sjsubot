import './style.css';
import { setupCounter } from './counter';

const button = document.querySelector<HTMLButtonElement>('#pushToTalk');
const interruptButton = document.querySelector<HTMLButtonElement>('#interruptButton');
const transcriptContainer = document.querySelector<HTMLElement>('#transcript');

if (!button) {
  throw new Error('Push-to-talk button not found in DOM.');
}

setupCounter(button, {
  transcriptContainer,
  interruptButton,
}).catch(error => {
  console.error('Failed to initialise realtime voice client.', error);
});
