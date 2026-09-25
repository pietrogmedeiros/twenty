import { isNonEmptyString } from '@sniptt/guards';

type ChatwootWebhookPayload = {
  event?: string;
  message_type?: string | number;
  sender?: { phone_number?: string | null } | null;
  conversation?: {
    meta?: { sender?: { phone_number?: string | null } | null } | null;
  } | null;
};

// Telefone do cliente numa mensagem recebida (webhook message_created do
// Chatwoot). Mensagens enviadas pela equipe ou por nós retornam null.
export const getChatwootIncomingMessagePhone = (
  payload: ChatwootWebhookPayload | null | undefined,
): string | null => {
  if (payload?.event !== 'message_created') {
    return null;
  }

  const isIncoming =
    payload.message_type === 'incoming' || payload.message_type === 0;

  if (!isIncoming) {
    return null;
  }

  const phone =
    payload.sender?.phone_number ??
    payload.conversation?.meta?.sender?.phone_number;

  return isNonEmptyString(phone) ? phone : null;
};
