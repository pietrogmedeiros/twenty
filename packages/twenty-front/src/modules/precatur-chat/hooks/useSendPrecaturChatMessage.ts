import { useCreateOneRecord } from '@/object-record/hooks/useCreateOneRecord';
import { PRECATUR_CHAT_MESSAGE_OBJECT_NAME } from '@/precatur-chat/constants/PrecaturChatMessageObjectName';
import { PRECATUR_CHAT_MESSAGE_RECORD_GQL_FIELDS } from '@/precatur-chat/constants/PrecaturChatMessageRecordGqlFields';
import { type PrecaturChatMessage } from '@/precatur-chat/types/PrecaturChatMessage';
import { type PrecaturChatTarget } from '@/precatur-chat/types/PrecaturChatTarget';

const MESSAGE_NAME_MAX_LENGTH = 80;

export type SendPrecaturChatMessageInput = {
  body: string;
  mentionedWorkspaceMemberIds: string[];
  attachmentIds: string[];
};

export const useSendPrecaturChatMessage = ({
  targetObjectNameSingular,
  targetRecordId,
  targetRecordLabel,
}: PrecaturChatTarget & { targetRecordLabel: string }) => {
  const { createOneRecord, loading } = useCreateOneRecord<PrecaturChatMessage>({
    objectNameSingular: PRECATUR_CHAT_MESSAGE_OBJECT_NAME,
    recordGqlFields: PRECATUR_CHAT_MESSAGE_RECORD_GQL_FIELDS,
  });

  const sendPrecaturChatMessage = async ({
    body,
    mentionedWorkspaceMemberIds,
    attachmentIds,
  }: SendPrecaturChatMessageInput) => {
    // `name` é o identificador do registro: vira a prévia em buscas e listas
    const preview = body.trim() || 'Anexo';

    return createOneRecord({
      name: preview.slice(0, MESSAGE_NAME_MAX_LENGTH),
      body,
      targetObjectNameSingular,
      targetRecordId,
      targetRecordLabel,
      mentionedWorkspaceMemberIds,
      attachmentIds,
    });
  };

  return { sendPrecaturChatMessage, isSending: loading };
};
