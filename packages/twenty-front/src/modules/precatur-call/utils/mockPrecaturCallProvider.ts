import { type PrecaturCallProvider } from '@/precatur-call/types/PrecaturCallProvider';

const DIALING_DURATION_IN_MS = 1500;
const RINGING_DURATION_IN_MS = 3500;

// Simula a sequência de uma chamada real (discando → chamando → atendida)
// para a equipe testar o fluxo antes de existir integração de telefonia.
export const MOCK_PRECATUR_CALL_PROVIDER: PrecaturCallProvider = {
  startCall: ({ onStatusChange }) => {
    let hasEnded = false;

    onStatusChange('DIALING');

    const ringingTimeout = setTimeout(() => {
      onStatusChange('RINGING');
    }, DIALING_DURATION_IN_MS);

    const answeredTimeout = setTimeout(() => {
      onStatusChange('IN_CALL');
    }, DIALING_DURATION_IN_MS + RINGING_DURATION_IN_MS);

    return {
      hangUp: () => {
        if (hasEnded) {
          return;
        }
        hasEnded = true;
        clearTimeout(ringingTimeout);
        clearTimeout(answeredTimeout);
        onStatusChange('ENDED');
      },
      setMuted: () => {},
      sendDigit: () => {},
    };
  },
};
