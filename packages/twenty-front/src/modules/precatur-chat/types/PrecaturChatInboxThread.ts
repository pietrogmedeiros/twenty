import { type PrecaturChatMessage } from '@/precatur-chat/types/PrecaturChatMessage';
import { type PrecaturChatTarget } from '@/precatur-chat/types/PrecaturChatTarget';

export type PrecaturChatInboxThread = PrecaturChatTarget & {
  key: string;
  targetRecordLabel: string;
  lastMessage: PrecaturChatMessage;
  unreadCount: number;
  // Participa: já abriu, escreveu ou foi mencionado (igual "membro do chat" no Bitrix)
  isParticipant: boolean;
};
