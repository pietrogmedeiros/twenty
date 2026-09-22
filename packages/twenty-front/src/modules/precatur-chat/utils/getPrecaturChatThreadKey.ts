import { type PrecaturChatTarget } from '@/precatur-chat/types/PrecaturChatTarget';

export const getPrecaturChatThreadKey = ({
  targetObjectNameSingular,
  targetRecordId,
}: PrecaturChatTarget) => `${targetObjectNameSingular}:${targetRecordId}`;
