import { type PrecaturCallResult } from '@/precatur-call/types/PrecaturCallResult';

export const PRECATUR_CALL_RESULTS: {
  value: PrecaturCallResult;
  label: string;
}[] = [
  { value: 'ANSWERED', label: 'Atendeu' },
  { value: 'NO_ANSWER', label: 'Não atendeu' },
  { value: 'VOICEMAIL', label: 'Caixa postal' },
  { value: 'WRONG_NUMBER', label: 'Número errado' },
];
