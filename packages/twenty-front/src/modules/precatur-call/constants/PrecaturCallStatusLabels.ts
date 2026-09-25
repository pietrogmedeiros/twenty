import { type PrecaturCallStatus } from '@/precatur-call/types/PrecaturCallStatus';

export const PRECATUR_CALL_STATUS_LABELS: Record<PrecaturCallStatus, string> = {
  IDLE: 'Pronto para ligar',
  DIALING: 'Discando…',
  RINGING: 'Chamando…',
  IN_CALL: 'Em chamada',
  ENDED: 'Chamada encerrada',
};
