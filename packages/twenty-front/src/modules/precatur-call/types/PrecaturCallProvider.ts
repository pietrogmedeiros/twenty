import { type PrecaturCallStatus } from '@/precatur-call/types/PrecaturCallStatus';

export type PrecaturCallSession = {
  hangUp: () => void;
  setMuted: (muted: boolean) => void;
  sendDigit: (digit: string) => void;
};

export type PrecaturCallProvider = {
  startCall: (params: {
    phoneNumber: string;
    onStatusChange: (status: PrecaturCallStatus) => void;
  }) => PrecaturCallSession;
};
