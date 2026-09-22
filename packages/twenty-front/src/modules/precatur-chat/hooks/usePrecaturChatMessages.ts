import { useListenToObjectRecordOperationBrowserEvent } from '@/browser-event/hooks/useListenToObjectRecordOperationBrowserEvent';
import { useObjectMetadataItem } from '@/object-metadata/hooks/useObjectMetadataItem';
import { useFindManyRecords } from '@/object-record/hooks/useFindManyRecords';
import { PRECATUR_CHAT_THREAD_MESSAGE_LIMIT } from '@/precatur-chat/constants/PrecaturChatThreadMessageLimit';
import { PRECATUR_CHAT_MESSAGE_OBJECT_NAME } from '@/precatur-chat/constants/PrecaturChatMessageObjectName';
import { PRECATUR_CHAT_MESSAGE_RECORD_GQL_FIELDS } from '@/precatur-chat/constants/PrecaturChatMessageRecordGqlFields';
import { type PrecaturChatMessage } from '@/precatur-chat/types/PrecaturChatMessage';
import { type PrecaturChatTarget } from '@/precatur-chat/types/PrecaturChatTarget';
import { useListenToEventsForQuery } from '@/sse-db-event/hooks/useListenToEventsForQuery';
import { useMemo } from 'react';

export const usePrecaturChatMessages = ({
  targetObjectNameSingular,
  targetRecordId,
}: PrecaturChatTarget) => {
  const { objectMetadataItem } = useObjectMetadataItem({
    objectNameSingular: PRECATUR_CHAT_MESSAGE_OBJECT_NAME,
  });

  const filter = useMemo(
    () => ({
      targetObjectNameSingular: { eq: targetObjectNameSingular },
      targetRecordId: { eq: targetRecordId },
    }),
    [targetObjectNameSingular, targetRecordId],
  );

  // Busca as mais recentes primeiro para o limite cortar as antigas
  const { records, loading, refetch } = useFindManyRecords<PrecaturChatMessage>(
    {
      objectNameSingular: PRECATUR_CHAT_MESSAGE_OBJECT_NAME,
      filter,
      orderBy: [{ createdAt: 'DescNullsLast' }],
      limit: PRECATUR_CHAT_THREAD_MESSAGE_LIMIT,
      recordGqlFields: PRECATUR_CHAT_MESSAGE_RECORD_GQL_FIELDS,
      fetchPolicy: 'cache-and-network',
    },
  );

  const operationSignature = useMemo(
    () => ({
      objectNameSingular: PRECATUR_CHAT_MESSAGE_OBJECT_NAME,
      variables: { filter },
    }),
    [filter],
  );

  useListenToEventsForQuery({
    queryId: `precatur-chat-thread-${targetObjectNameSingular}-${targetRecordId}`,
    operationSignature,
  });

  // Mensagens de outros usuários chegam por SSE; recarregar mantém a ordem certa
  useListenToObjectRecordOperationBrowserEvent({
    objectMetadataItemId: objectMetadataItem.id,
    onObjectRecordOperationBrowserEvent: () => {
      void refetch();
    },
  });

  const messages = useMemo(
    () =>
      [...records].sort(
        (messageA, messageB) =>
          new Date(messageA.createdAt).getTime() -
          new Date(messageB.createdAt).getTime(),
      ),
    [records],
  );

  return { messages, loading };
};
